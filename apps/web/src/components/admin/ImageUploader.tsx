'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import type { ProductImage } from '@rgi/types';
import { t } from '@/locales/fr';

interface Props {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  /** Alt text to apply to newly uploaded files — the product name. */
  defaultAlt?: string;
}

interface Signature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  uploadUrl: string;
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Cloudinary upload widget (ADMIN_DASHBOARD.md §2.5): multiple files, reorder, set
 * primary, alt text.
 *
 * Files go **straight from the browser to Cloudinary** using a short-lived signature the
 * API mints — the bytes never pass through our server, and the Cloudinary secret never
 * reaches the browser (API_SPEC.md §Media).
 *
 * Uploads are recorded in form state only; nothing is written to the product until the
 * form is saved. Deleting an image, by contrast, destroys the Cloudinary asset
 * immediately, which is why it asks first.
 */
export function ImageUploader({ images, onChange, defaultAlt }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function uploadOne(file: File): Promise<ProductImage | null> {
    if (!ACCEPTED.includes(file.type)) {
      setError(`${file.name} : ${t.admin.imageBadType}`);
      return null;
    }
    if (file.size > MAX_BYTES) {
      setError(`${file.name} : ${t.admin.imageTooBig}`);
      return null;
    }

    // One signature per file: each carries its own timestamp, and Cloudinary rejects a
    // signature reused after its window closes.
    const signRes = await fetch('/api/admin/media/sign', { method: 'POST' });
    if (!signRes.ok) {
      const body = (await signRes.json().catch(() => ({}))) as { message?: string };
      setError(body.message ?? t.admin.imageUploadFailed);
      return null;
    }
    const sig = (await signRes.json()) as Signature;

    // These fields must match exactly what the API signed, or Cloudinary returns 401.
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);

    const res = await fetch(sig.uploadUrl, { method: 'POST', body: form });
    if (!res.ok) {
      setError(`${file.name} : ${t.admin.imageUploadFailed}`);
      return null;
    }
    const asset = (await res.json()) as { secure_url: string; public_id: string };

    return {
      url: asset.secure_url,
      publicId: asset.public_id,
      alt: defaultAlt?.trim() || undefined,
      isPrimary: false,
      order: 0,
    };
  }

  async function addFiles(files: FileList | File[]) {
    setError(null);
    const list = Array.from(files);
    setBusy((n) => n + list.length);

    const uploaded: ProductImage[] = [];
    for (const file of list) {
      try {
        const image = await uploadOne(file);
        if (image) uploaded.push(image);
      } catch {
        setError(t.admin.imageUploadFailed);
      } finally {
        setBusy((n) => n - 1);
      }
    }

    if (uploaded.length) onChange(renumber([...images, ...uploaded]));
  }

  async function remove(index: number) {
    const image = images[index];
    if (!image) return;
    if (!window.confirm(t.admin.imageDeleteConfirm)) return;

    setError(null);
    // Only Cloudinary-hosted assets are ours to destroy. The seeded press shots are local
    // files under /public and have no Cloudinary asset behind them.
    if (image.publicId && !image.publicId.startsWith('local/')) {
      const res = await fetch('/api/admin/media/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: image.publicId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? t.admin.imageDeleteFailed);
        return;
      }
    }
    onChange(renumber(images.filter((_, i) => i !== index)));
  }

  function move(index: number, delta: number) {
    const next = [...images];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(renumber(next));
  }

  function setPrimary(index: number) {
    onChange(renumber(images.map((img, i) => ({ ...img, isPrimary: i === index }))));
  }

  function setAlt(index: number, alt: string) {
    onChange(images.map((img, i) => (i === index ? { ...img, alt } : img)));
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
        }}
        className={`rounded-card border border-dashed p-4 text-center transition sm:p-6 ${
          dragOver ? 'border-accent bg-accent/[.06]' : 'border-line2'
        }`}
      >
        {/* Dragging a file does not exist on touch, so the phone is shown the button on
            its own — the hint would be an instruction the device cannot follow. */}
        <p className="hidden text-[13.5px] text-muted sm:block">{t.admin.imageDropHint}</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn btn-ghost w-full sm:mt-3 sm:w-auto"
          disabled={busy > 0}
        >
          {busy > 0 ? `${t.admin.imageUploading} (${busy})` : t.admin.imageChoose}
        </button>
        <p className="mt-2 text-[11.5px] text-faint">{t.admin.imageFormats}</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[12.5px] text-accent3">
          {error}
        </p>
      ) : null}

      {images.length ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {images.map((image, index) => (
            <li
              key={image.publicId || image.url}
              className="flex gap-3 rounded-card border border-line2 bg-bg2 p-3"
            >
              <div className="photo-tile relative h-[64px] w-[64px] shrink-0 overflow-hidden rounded-sm2 xs:h-[76px] xs:w-[76px]">
                <Image
                  src={image.url}
                  alt={image.alt ?? ''}
                  fill
                  sizes="76px"
                  className="object-contain"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {image.isPrimary ? (
                    <span className="chip bg-accent/15 text-accent">{t.admin.imagePrimary}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPrimary(index)}
                      className="inline-flex min-h-[44px] items-center text-[13px] text-faint underline-offset-2 transition hover:text-accent hover:underline sm:min-h-0 sm:text-[12px]"
                    >
                      {t.admin.imageSetPrimary}
                    </button>
                  )}
                </div>

                <input
                  value={image.alt ?? ''}
                  onChange={(e) => setAlt(index, e.target.value)}
                  placeholder={t.admin.imageAlt}
                  aria-label={`${t.admin.imageAlt} ${index + 1}`}
                  className="field mt-2 sm:h-8 sm:text-[12.5px]"
                />

                {/* Reordering and deleting are the two things done by thumb on a phone,
                    so they keep the full touch target and only shrink for a mouse. */}
                <div className="mt-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={t.admin.imageMoveUp}
                    className="icobtn h-11 w-11 disabled:opacity-35 sm:h-7 sm:w-7"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === images.length - 1}
                    aria-label={t.admin.imageMoveDown}
                    className="icobtn h-11 w-11 disabled:opacity-35 sm:h-7 sm:w-7"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(index)}
                    className="ml-auto inline-flex min-h-[44px] items-center px-1 text-[13px] text-faint transition hover:text-accent3 sm:min-h-0 sm:px-0 sm:text-[12px]"
                  >
                    {t.admin.imageRemove}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Order follows position in the list, and exactly one image is primary. */
function renumber(list: ProductImage[]): ProductImage[] {
  const next = list.map((img, index) => ({ ...img, order: index }));
  if (next.length && !next.some((img) => img.isPrimary)) next[0]!.isPrimary = true;
  return next;
}

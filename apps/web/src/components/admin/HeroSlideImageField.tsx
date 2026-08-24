'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import type { HeroSlideId } from '@rgi/types';
import { t } from '@/locales/fr';
import { resetHeroImage, setHeroImage } from '@/app/admin/(shell)/carrousel/actions';
import { AdminApiError } from '@/lib/admin/session';
import { signUpload, type UploadSignature } from '@/lib/admin/media';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * The photo on one carousel slide.
 *
 * The file goes straight from the browser to Cloudinary with a signature the API mints —
 * the same path the product uploader takes, so there is one upload flow to trust and the
 * Cloudinary secret stays on the server.
 *
 * Unlike the product form, a slide has nothing else to save alongside it, so the upload
 * writes through immediately. Alt text is the exception: it is typed, so it saves on its
 * own button once it differs, the same "dirty then confirm" shape as the stock cell.
 */
export function HeroSlideImageField({
  slideId,
  label,
  url,
  alt,
  custom,
  defaultUrl,
}: {
  slideId: HeroSlideId;
  label: string;
  url: string;
  alt: string;
  /** False when the slide still shows the photo that ships in the code. */
  custom: boolean;
  defaultUrl: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [altValue, setAltValue] = useState(alt);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const busy = uploading || pending;
  const altDirty = custom && altValue.trim() !== alt.trim() && altValue.trim().length >= 3;

  function announce(result: { ok: boolean; message?: string }, success: string) {
    if (result.ok) {
      setDone(success);
      setError(null);
    } else {
      setError(result.message ?? t.common.error);
      setDone(null);
    }
  }

  async function upload(file: File) {
    setError(null);
    setDone(null);

    if (!ACCEPTED.includes(file.type)) {
      setError(`${file.name} : ${t.admin.imageBadType}`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`${file.name} : ${t.admin.imageTooBig}`);
      return;
    }

    setUploading(true);
    try {
      let sig: UploadSignature;
      try {
        sig = await signUpload();
      } catch (cause) {
        setError(cause instanceof AdminApiError ? cause.message : t.admin.imageUploadFailed);
        return;
      }

      // These fields must match exactly what the API signed, or Cloudinary returns 401.
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', sig.apiKey);
      form.append('timestamp', String(sig.timestamp));
      form.append('signature', sig.signature);
      form.append('folder', sig.folder);

      const res = await fetch(sig.uploadUrl, { method: 'POST', body: form });
      if (!res.ok) {
        setError(t.admin.imageUploadFailed);
        return;
      }
      const asset = (await res.json()) as { secure_url: string; public_id: string };

      startTransition(async () => {
        announce(
          await setHeroImage(slideId, {
            url: asset.secure_url,
            publicId: asset.public_id,
            alt: altValue.trim() || alt,
          }),
          t.admin.heroSaved,
        );
      });
    } catch {
      setError(t.admin.imageUploadFailed);
    } finally {
      setUploading(false);
      // Let the same file be chosen again after a failure.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="surface-card flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
      {/* The preview spans the card on a phone — a 160 px thumbnail beside the fields
          would leave neither of them readable at 320 px. */}
      <div
        className="photo-tile relative h-[140px] w-full shrink-0 sm:h-[120px] sm:w-[160px]"
        aria-label={`${t.admin.heroPreviewAria} : ${label}`}
      >
        <Image src={url} alt="" fill sizes="(max-width: 640px) 100vw, 160px" className="object-contain p-2" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{label}</span>
          <span className={`chip ${custom ? 'bg-accent2/15 text-accent2' : 'bg-text/[.07] text-faint'}`}>
            {custom ? t.admin.heroCustom : t.admin.heroDefault}
          </span>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] text-muted">{t.admin.heroAltLabel}</span>
          <input
            value={altValue}
            onChange={(event) => setAltValue(event.target.value)}
            maxLength={180}
            className="field"
          />
          <span className="text-[11.5px] text-faint">{t.admin.heroAltHint}</span>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md bg-grad px-3.5 text-[13px] font-semibold text-bg disabled:opacity-50 xs:flex-none sm:min-h-0 sm:px-3 sm:py-2 sm:text-[12.5px]"
          >
            {uploading ? t.admin.imageUploading : t.admin.heroChange}
          </button>

          {altDirty ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                startTransition(async () => {
                  announce(
                    await setHeroImage(slideId, { url, alt: altValue.trim() }),
                    t.admin.heroSaved,
                  );
                })
              }
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md border border-accent2 px-3.5 text-[13px] font-semibold text-accent2 disabled:opacity-50 xs:flex-none sm:min-h-0 sm:px-3 sm:py-2 sm:text-[12.5px]"
            >
              {t.admin.save}
            </button>
          ) : null}

          {custom ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                startTransition(async () => {
                  const result = await resetHeroImage(slideId);
                  announce(result, t.admin.heroResetDone);
                  if (result.ok) setAltValue('');
                })
              }
              className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-line px-3.5 text-[13px] font-semibold text-muted transition hover:border-accent3 hover:text-accent3 disabled:opacity-50 sm:min-h-0 sm:px-3 sm:py-2 sm:text-[12.5px]"
            >
              {pending ? t.admin.heroResetting : t.admin.heroReset}
            </button>
          ) : null}
        </div>

        <p className="text-[11.5px] text-faint">{t.admin.imageFormats}</p>

        {/* One live region for both outcomes, so a screen reader hears the result of a
            save without the focus moving anywhere. */}
        <p aria-live="polite" className="min-h-[16px] text-[12px]">
          {error ? <span className="text-accent3">{error}</span> : null}
          {done ? <span className="text-success">{done}</span> : null}
        </p>

        {custom ? (
          <p className="truncate text-[11px] text-faint">
            {t.admin.heroDefault} : <span className="font-mono">{defaultUrl}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

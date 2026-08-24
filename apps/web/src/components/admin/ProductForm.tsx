'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AttributeDefinition, Category, Product, ProductImage } from '@rgi/types';
import { toCentimes, toMad } from '@rgi/types';
import { t } from '@/locales/fr';
import { saveProduct, type ProductPayload } from '@/app/admin/(shell)/produits/actions';
import { AttributeField } from './AttributeField';
import { ImageUploader } from './ImageUploader';

interface Props {
  categories: Category[];
  /** Whether the API has Cloudinary credentials — checked server-side, not guessed. */
  uploadEnabled: boolean;
  /** Every definition, keyed by the categoryType it belongs to. */
  definitions: Record<string, AttributeDefinition[]>;
  product?: Product;
}

const COMPONENT_TYPES = new Set([
  'cpu', 'motherboard', 'ram', 'gpu', 'psu', 'case', 'cooler', 'storage', 'fan',
]);

/** "Carte mère MSI B650" → "carte-mere-msi-b650" */
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The dashboard's core screen (ADMIN_DASHBOARD.md §2): picking a category swaps in that
 * category's own technical fields, loaded from `attributedefinitions`. Those are the very
 * fields the configurator reads, which is why the API validates them again on save.
 */
export function ProductForm({ categories, definitions, product, uploadEnabled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState(product?.category ?? '');
  const [name, setName] = useState(product?.name.fr ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [brand, setBrand] = useState(product?.brand ?? '');
  const [description, setDescription] = useState(product?.description.fr ?? '');
  const [priceMad, setPriceMad] = useState(product ? String(toMad(product.price)) : '');
  const [compareMad, setCompareMad] = useState(
    product?.compareAtPrice ? String(toMad(product.compareAtPrice)) : '',
  );
  const [stock, setStock] = useState(String(product?.stock ?? 0));
  const [threshold, setThreshold] = useState(String(product?.lowStockThreshold ?? 3));
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>(
    product?.status ?? 'draft',
  );
  const [images, setImages] = useState<ProductImage[]>(product?.images ?? []);
  const [metaTitle, setMetaTitle] = useState(product?.metaTitle?.fr ?? '');
  const [metaDescription, setMetaDescription] = useState(product?.metaDescription?.fr ?? '');
  const [attributes, setAttributes] = useState<Record<string, unknown>>(
    product?.attributes ?? {},
  );

  const category = categories.find((item) => item.id === categoryId);
  const categoryType = category?.componentType ?? category?.type;
  const fields = useMemo(
    () => (categoryType ? (definitions[categoryType] ?? []) : []),
    [categoryType, definitions],
  );
  const isPart = categoryType ? COMPONENT_TYPES.has(categoryType) : false;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const payload: ProductPayload = {
      name: { fr: name.trim() },
      slug: (slug.trim() || slugify(name)).toLowerCase(),
      sku: sku.trim(),
      brand: brand.trim(),
      category: categoryId,
      description: { fr: description.trim() },
      price: toCentimes(Number(priceMad || 0)),
      compareAtPrice: compareMad ? toCentimes(Number(compareMad)) : undefined,
      stock: Number(stock || 0),
      lowStockThreshold: Number(threshold || 0),
      isConfiguratorPart: isPart,
      status,
      attributes,
      // Position in the list is the order; the uploader guarantees exactly one primary.
      images: images.map((image, index) => ({
        ...image,
        alt: image.alt?.trim() || name.trim(),
        order: index,
      })),
      metaTitle: metaTitle.trim() ? { fr: metaTitle.trim() } : undefined,
      metaDescription: metaDescription.trim() ? { fr: metaDescription.trim() } : undefined,
    };

    startTransition(async () => {
      const result = await saveProduct(payload, product?.id);
      if (!result.ok) {
        setError(result.message ?? t.common.error);
        return;
      }
      // `router.refresh()` used to re-run the server component behind the list. There is
      // no server component any more, and the list fetches on mount, so the push alone is
      // enough — it remounts `ProductsView`, which re-asks the API.
      router.push('/admin/produits');
    });
  }

  return (
    <form onSubmit={submit} className="flex max-w-[900px] flex-col gap-5">
      <Section title={t.admin.sectionBasics}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Text label={t.admin.fieldName} value={name} onChange={setName} required />
          <Text
            label={t.admin.fieldSlug}
            value={slug}
            onChange={setSlug}
            placeholder={slugify(name)}
          />
          <Text label={t.admin.fieldSku} value={sku} onChange={setSku} required />
          <Text label={t.admin.fieldBrand} value={brand} onChange={setBrand} required />

          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] text-muted">
              {t.admin.fieldCategory} <span className="text-accent3">*</span>
            </span>
            <select
              required
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="field"
            >
              <option value="">—</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name.fr}
                </option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] text-muted">
              {t.admin.fieldDescription}
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="field resize-y"
            />
          </label>
        </div>
      </Section>

      <Section title={t.admin.sectionPricing}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Text label={t.admin.fieldPrice} value={priceMad} onChange={setPriceMad} type="number" required />
          <Text label={t.admin.fieldCompareAt} value={compareMad} onChange={setCompareMad} type="number" />
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] text-muted">{t.admin.status}</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className="field"
            >
              <option value="active">{t.admin.fieldStatusActive}</option>
              <option value="draft">{t.admin.fieldStatusDraft}</option>
              <option value="archived">{t.admin.fieldStatusArchived}</option>
            </select>
          </label>
        </div>
      </Section>

      <Section title={t.admin.sectionAttributes} help={t.admin.attributesHelp}>
        {!categoryType ? (
          <p className="text-[13px] text-faint">{t.admin.chooseCategory}</p>
        ) : fields.length === 0 ? (
          <p className="text-[13px] text-faint">
            Cette catégorie n’a pas encore de caractéristiques définies.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((definition) => (
              <AttributeField
                key={definition.key}
                definition={definition}
                value={attributes[definition.key]}
                onChange={(value) =>
                  setAttributes((current) => {
                    const next = { ...current };
                    if (value === undefined || value === '') delete next[definition.key];
                    else next[definition.key] = value;
                    return next;
                  })
                }
              />
            ))}
          </div>
        )}
        {isPart ? (
          <p className="mt-4 text-[12px] text-accent2">✓ {t.admin.fieldConfigurator}</p>
        ) : null}
      </Section>

      <Section title={t.admin.sectionInventory}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Text label={t.admin.fieldStock} value={stock} onChange={setStock} type="number" />
          <Text label={t.admin.fieldThreshold} value={threshold} onChange={setThreshold} type="number" />
        </div>
      </Section>

      <Section title={t.admin.sectionImages} help={t.admin.imagesHelp}>
        {uploadEnabled ? (
          <ImageUploader images={images} onChange={setImages} defaultAlt={name} />
        ) : (
          <p className="text-[12.5px] text-accent3">{t.admin.imageUploadDisabled}</p>
        )}
      </Section>

      <Section title={t.admin.sectionSeo}>
        <div className="grid gap-4">
          <Text label={t.admin.fieldMetaTitle} value={metaTitle} onChange={setMetaTitle} />
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] text-muted">
              {t.admin.fieldMetaDescription}
            </span>
            <textarea
              value={metaDescription}
              onChange={(event) => setMetaDescription(event.target.value)}
              rows={2}
              className="field resize-y"
            />
          </label>
        </div>
      </Section>

      {error ? (
        <p role="alert" className="surface-card border-accent3 p-4 text-[13px] text-accent3">
          {error}
        </p>
      ) : null}

      {/*
       * The form is long, and on a phone the save button would otherwise sit a full
       * screen below the last field being edited. Below `sm` the action row sticks to
       * the bottom of the viewport; from `sm` up it goes back to being the last row.
       */}
      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex-wrap sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary flex-1 disabled:opacity-50 sm:flex-none"
        >
          {pending ? t.admin.saving : t.admin.save}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/produits')}
          className="btn btn-ghost flex-1 sm:flex-none"
        >
          {t.common.close}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card p-4 sm:p-6">
      <h2 className="t-h4 font-display font-bold">{title}</h2>
      {help ? <p className="mb-4 mt-1 text-[12px] text-faint">{help}</p> : <div className="mb-4" />}
      {children}
    </section>
  );
}

function Text({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] text-muted">
        {label} {required ? <span className="text-accent3">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        step={type === 'number' ? 'any' : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="field"
      />
    </label>
  );
}

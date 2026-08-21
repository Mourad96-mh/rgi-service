/* eslint-disable no-console */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { toCentimes } from '@rgi/types';
import { DEFAULT_RULES } from '@rgi/config-engine';
import { CategorySchema } from '../schemas/category.schema';
import { AttributeDefinitionSchema } from '../schemas/attribute-definition.schema';
import { ProductSchema } from '../schemas/product.schema';
import { CompatibilityRuleSchema } from '../schemas/compatibility-rule.schema';
import { UserSchema } from '../schemas/user.schema';
import { slugify, slugifyPath } from '../common/utils/slug';
import { SEED_CATEGORIES, type SeedCategory } from './seed-categories';
import { SEED_ATTRIBUTES } from './seed-attributes';
import { SEED_PRODUCTS } from './seed-products';
import { imagesForSku } from './seed-images';

loadEnv({ path: '../../.env' });
loadEnv();

/** The nine part types the configurator slots (SLOTS in `@rgi/types`). */
const CONFIGURATOR_COMPONENT_TYPES = [
  'cpu',
  'motherboard',
  'ram',
  'gpu',
  'psu',
  'case',
  'cooler',
  'storage',
  'fan',
];

const MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/rgiservice?replicaSet=rs0';

/**
 * Idempotent seed (FOLDER_STRUCTURE.md): produces a working catalog + rules so the site
 * is demoable immediately, and can be re-run safely — everything upserts on its business
 * key (category slug, attribute key, product SKU, rule id).
 */
async function main(): Promise<void> {
  await mongoose.connect(MONGODB_URI);
  console.log(`→ connecté à ${MONGODB_URI.replace(/\/\/[^@]*@/, '//***@')}`);

  const Category = mongoose.model('Category', CategorySchema);
  const AttributeDefinition = mongoose.model(
    'AttributeDefinition',
    AttributeDefinitionSchema,
  );
  const Product = mongoose.model('Product', ProductSchema);
  const CompatibilityRule = mongoose.model('CompatibilityRule', CompatibilityRuleSchema);
  const User = mongoose.model('User', UserSchema);

  // ── categories ─────────────────────────────────────────────
  const categoryIdBySlug = new Map<string, mongoose.Types.ObjectId>();
  const categoryTypeBySlug = new Map<string, string>();

  const upsertCategory = async (
    node: SeedCategory,
    parent: mongoose.Types.ObjectId | null,
  ): Promise<void> => {
    const slug = slugifyPath(node.slug);
    const doc = await Category.findOneAndUpdate(
      { slug },
      {
        $set: {
          name: { fr: node.nameFr },
          slug,
          parent,
          type: node.type,
          componentType: node.componentType,
          configuratorSlot: node.configuratorSlot,
          order: node.order,
          isActive: true,
        },
      },
      { upsert: true, new: true },
    ).exec();
    categoryIdBySlug.set(slug, doc._id);
    categoryTypeBySlug.set(slug, node.componentType ?? node.type);
    for (const child of node.children ?? []) {
      await upsertCategory(child, doc._id);
    }
  };

  for (const root of SEED_CATEGORIES) await upsertCategory(root, null);
  console.log(`✔ ${categoryIdBySlug.size} catégories`);

  // ── attribute definitions ──────────────────────────────────
  let attributeCount = 0;
  for (const [categoryType, attributes] of Object.entries(SEED_ATTRIBUTES)) {
    for (const [index, attr] of attributes.entries()) {
      await AttributeDefinition.findOneAndUpdate(
        { categoryType, key: attr.key },
        {
          $set: {
            categoryType,
            key: attr.key,
            label: { fr: attr.labelFr },
            dataType: attr.dataType,
            unit: attr.unit,
            enumValues: attr.enumValues,
            multiple: attr.multiple ?? false,
            required: attr.required ?? false,
            filterable: attr.filterable ?? false,
            usedInCompatibility: attr.usedInCompatibility ?? false,
            order: index,
          },
        },
        { upsert: true },
      ).exec();
      attributeCount += 1;
    }
  }
  console.log(`✔ ${attributeCount} définitions d'attributs`);

  // ── compatibility rules ────────────────────────────────────
  for (const rule of DEFAULT_RULES) {
    const { id, ...rest } = rule;
    await CompatibilityRule.findOneAndUpdate(
      { ruleId: id },
      { $set: { ruleId: id, ...rest } },
      { upsert: true },
    ).exec();
  }
  console.log(`✔ ${DEFAULT_RULES.length} règles de compatibilité`);

  // ── products ───────────────────────────────────────────────
  for (const product of SEED_PRODUCTS) {
    const categorySlug = slugifyPath(product.categorySlug);
    const categoryId = categoryIdBySlug.get(categorySlug);
    const categoryType = categoryTypeBySlug.get(categorySlug);
    if (!categoryId || !categoryType) {
      throw new Error(`Catégorie inconnue dans les données de seed : ${categorySlug}`);
    }
    const isPart = CONFIGURATOR_COMPONENT_TYPES.includes(categoryType);

    await Product.findOneAndUpdate(
      { sku: product.sku },
      {
        $set: {
          name: { fr: product.nameFr },
          slug: slugify(product.nameFr),
          sku: product.sku,
          brand: product.brand,
          category: categoryId,
          categoryType,
          description: { fr: product.descriptionFr },
          price: toCentimes(product.priceMad),
          compareAtPrice: product.compareAtMad
            ? toCentimes(product.compareAtMad)
            : undefined,
          images: imagesForSku(product.sku, product.nameFr),
          attributes: product.attributes,
          stock: product.stock,
          lowStockThreshold: 3,
          isConfiguratorPart: isPart,
          status: 'active',
        },
      },
      { upsert: true },
    ).exec();
  }
  console.log(`✔ ${SEED_PRODUCTS.length} produits`);

  // ── admin account ──────────────────────────────────────────
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@rgiservice.ma').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  const existingAdmin = await User.findOne({ email: adminEmail }).exec();
  if (!existingAdmin) {
    await User.create({
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      name: 'Administrateur',
      role: 'admin',
      isActive: true,
    });
    console.log(`✔ compte admin créé : ${adminEmail}`);
    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.log('  ⚠ mot de passe par défaut "Admin123!" — à changer immédiatement.');
    }
  } else {
    console.log(`• compte admin déjà présent : ${adminEmail}`);
  }

  await mongoose.disconnect();
  console.log('→ terminé.');
}

main().catch(async (error) => {
  console.error('Échec du seed :', error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});

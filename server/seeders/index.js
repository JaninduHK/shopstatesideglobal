import { connectDB, disconnectDB } from '../config/db.js';
import { ensureDefaults } from '../services/siteSettings.service.js';
import { User } from '../models/User.js';
import { Brand } from '../models/Brand.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { uniqueSlug, generateSku } from '../utils/slug.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ROLES, BRAND_TIER, PRODUCT_CATEGORY, PRODUCT_CONDITION, ADDON_GATE } from '@ssg/shared/enums';

const BRANDS = [
  { name: 'Hermès', tier: BRAND_TIER.ULTRA_LUXURY },
  { name: 'Chanel', tier: BRAND_TIER.ULTRA_LUXURY },
  { name: 'Louis Vuitton', tier: BRAND_TIER.LUXURY },
  { name: 'Gucci', tier: BRAND_TIER.LUXURY },
  { name: 'Rolex', tier: BRAND_TIER.ULTRA_LUXURY },
  { name: 'Cartier', tier: BRAND_TIER.ULTRA_LUXURY },
  { name: 'Prada', tier: BRAND_TIER.LUXURY },
  { name: 'Bottega Veneta', tier: BRAND_TIER.LUXURY },
  { name: 'Balenciaga', tier: BRAND_TIER.LUXURY },
  { name: 'Burberry', tier: BRAND_TIER.PREMIUM },
];

const CATEGORIES = [
  { name: "Women's", category: 'women', sortOrder: 1 },
  { name: "Men's", category: 'men', sortOrder: 2 },
  { name: 'Handbags', category: 'handbags', sortOrder: 3 },
  { name: 'Jewelry', category: 'jewelry', sortOrder: 4 },
  { name: 'Watches', category: 'watches', sortOrder: 5 },
  { name: 'Shoes', category: 'shoes', sortOrder: 6 },
  { name: 'Home', category: 'home', sortOrder: 7 },
  { name: 'Art', category: 'art', sortOrder: 8 },
  { name: 'Kids', category: 'kids', sortOrder: 9 },
];

const PLACEHOLDER_IMAGES = [
  { url: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg', publicId: 'sample', alt: 'placeholder' },
];

const NGN = (naira) => naira * 100;

const SAMPLE_PRODUCTS = [
  { title: 'Hermès Birkin 30 Togo Etoupe', brand: 'Hermès', category: PRODUCT_CATEGORY.HANDBAGS, price: NGN(35_000_000), retail: NGN(45_000_000), condition: PRODUCT_CONDITION.EXCELLENT, color: 'Etoupe', material: 'Togo Leather', size: '30cm' },
  { title: 'Chanel Classic Flap Medium Black Caviar', brand: 'Chanel', category: PRODUCT_CATEGORY.HANDBAGS, price: NGN(12_500_000), retail: NGN(14_900_000), condition: PRODUCT_CONDITION.VERY_GOOD, color: 'Black', material: 'Caviar Leather' },
  { title: 'Rolex Submariner Date 41mm Steel', brand: 'Rolex', category: PRODUCT_CATEGORY.WATCHES, price: NGN(18_900_000), retail: NGN(15_500_000), condition: PRODUCT_CONDITION.NEW_WITH_TAGS, color: 'Black', material: 'Stainless Steel' },
  { title: 'Cartier Love Bracelet Yellow Gold Size 17', brand: 'Cartier', category: PRODUCT_CATEGORY.JEWELRY, price: NGN(7_200_000), retail: NGN(7_500_000), condition: PRODUCT_CONDITION.EXCELLENT, material: '18k Yellow Gold', size: '17' },
  { title: 'Louis Vuitton Speedy 25 Damier Ebene', brand: 'Louis Vuitton', category: PRODUCT_CATEGORY.HANDBAGS, price: NGN(1_650_000), retail: NGN(1_950_000), condition: PRODUCT_CONDITION.GOOD, color: 'Damier Ebene' },
  { title: 'Gucci Marmont Mini Velvet Crossbody', brand: 'Gucci', category: PRODUCT_CATEGORY.HANDBAGS, price: NGN(1_350_000), condition: PRODUCT_CONDITION.VERY_GOOD, color: 'Burgundy', material: 'Velvet' },
  { title: 'Hermès Kelly 25 Sellier Black Epsom', brand: 'Hermès', category: PRODUCT_CATEGORY.HANDBAGS, price: NGN(42_000_000), retail: NGN(50_000_000), condition: PRODUCT_CONDITION.NEW_WITH_TAGS, color: 'Black', material: 'Epsom', size: '25cm', requiresAddon: ADDON_GATE.ADDON2 },
  { title: 'Rolex Daytona 116500LN White Dial', brand: 'Rolex', category: PRODUCT_CATEGORY.WATCHES, price: NGN(38_500_000), condition: PRODUCT_CONDITION.EXCELLENT, color: 'White', material: 'Stainless Steel', requiresAddon: ADDON_GATE.ADDON2 },
  { title: 'Chanel 19 Large Lambskin Black', brand: 'Chanel', category: PRODUCT_CATEGORY.HANDBAGS, price: NGN(8_900_000), condition: PRODUCT_CONDITION.EXCELLENT, color: 'Black', material: 'Lambskin' },
  { title: 'Bottega Veneta Pouch Black Intrecciato', brand: 'Bottega Veneta', category: PRODUCT_CATEGORY.HANDBAGS, price: NGN(2_800_000), condition: PRODUCT_CONDITION.VERY_GOOD, color: 'Black' },
  { title: 'Cartier Tank Française Steel Medium', brand: 'Cartier', category: PRODUCT_CATEGORY.WATCHES, price: NGN(5_900_000), condition: PRODUCT_CONDITION.VERY_GOOD, color: 'Silver', material: 'Stainless Steel' },
  { title: 'Prada Galleria Saffiano Saffron Medium', brand: 'Prada', category: PRODUCT_CATEGORY.HANDBAGS, price: NGN(2_200_000), condition: PRODUCT_CONDITION.EXCELLENT, color: 'Saffron', material: 'Saffiano Leather' },
  { title: 'Hermès H Belt 32mm Black/Gold', brand: 'Hermès', category: PRODUCT_CATEGORY.WOMEN, price: NGN(1_450_000), condition: PRODUCT_CONDITION.NEW_WITH_TAGS, color: 'Black/Gold', size: '85cm' },
  { title: 'Louis Vuitton Neverfull MM Monogram', brand: 'Louis Vuitton', category: PRODUCT_CATEGORY.HANDBAGS, price: NGN(2_100_000), condition: PRODUCT_CONDITION.GOOD, color: 'Monogram' },
  { title: 'Burberry Trench Coat Heritage Navy Size 38', brand: 'Burberry', category: PRODUCT_CATEGORY.WOMEN, price: NGN(1_850_000), condition: PRODUCT_CONDITION.EXCELLENT, color: 'Navy', size: '38' },
  { title: 'Balenciaga Speed Trainer Black White Size 42', brand: 'Balenciaga', category: PRODUCT_CATEGORY.SHOES, price: NGN(850_000), condition: PRODUCT_CONDITION.VERY_GOOD, color: 'Black/White', size: '42' },
  { title: 'Chanel J12 Black Ceramic 38mm', brand: 'Chanel', category: PRODUCT_CATEGORY.WATCHES, price: NGN(6_800_000), condition: PRODUCT_CONDITION.EXCELLENT, color: 'Black', material: 'Ceramic', requiresAddon: ADDON_GATE.ADDON1 },
  { title: 'Gucci Ace Sneakers Embroidered Bee Size 41', brand: 'Gucci', category: PRODUCT_CATEGORY.SHOES, price: NGN(750_000), condition: PRODUCT_CONDITION.VERY_GOOD, color: 'White', size: '41' },
  { title: 'Cartier Juste un Clou Rose Gold Size 16', brand: 'Cartier', category: PRODUCT_CATEGORY.JEWELRY, price: NGN(6_400_000), condition: PRODUCT_CONDITION.NEW_WITH_TAGS, material: '18k Rose Gold', size: '16' },
  { title: 'Rolex Datejust 36mm Two-Tone Jubilee', brand: 'Rolex', category: PRODUCT_CATEGORY.WATCHES, price: NGN(14_500_000), condition: PRODUCT_CONDITION.EXCELLENT, color: 'Silver', material: 'Two-Tone' },
];

async function seedAdmin() {
  const email = env.admin.email || 'admin@statesideglobal.com';
  const existing = await User.findOne({ email });
  if (existing) {
    logger.info(`Admin already exists: ${email}`);
    return existing;
  }
  const password = 'AdminPass1';
  const user = new User({
    firstName: 'Admin',
    lastName: 'User',
    email,
    password,
    role: ROLES.ADMIN,
    emailVerified: true,
    isActive: true,
  });
  await user.save();
  logger.info(`Created admin: ${email} (password: ${password})`);
  return user;
}

async function seedBrands() {
  const map = {};
  for (const b of BRANDS) {
    let brand = await Brand.findOne({ name: b.name });
    if (!brand) {
      const slug = await uniqueSlug(Brand, b.name);
      brand = await Brand.create({ ...b, slug });
    }
    map[b.name] = brand;
  }
  logger.info(`Seeded ${Object.keys(map).length} brands`);
  return map;
}

async function seedCategories() {
  const map = {};
  for (const c of CATEGORIES) {
    let cat = await Category.findOne({ name: c.name });
    if (!cat) {
      const slug = await uniqueSlug(Category, c.name);
      cat = await Category.create({ name: c.name, slug, sortOrder: c.sortOrder });
    }
    map[c.category] = cat;
  }
  logger.info(`Seeded ${Object.keys(map).length} categories`);
  return map;
}

async function seedProducts(brandsByName) {
  let created = 0;
  for (const p of SAMPLE_PRODUCTS) {
    const brand = brandsByName[p.brand];
    if (!brand) continue;
    const exists = await Product.findOne({ title: p.title });
    if (exists) continue;
    const slug = await uniqueSlug(Product, p.title);
    await Product.create({
      title: p.title,
      slug,
      description: `${p.title} — authenticated by State Side Global experts. Detailed condition report available on request.`,
      shortDescription: p.title,
      category: p.category,
      brand: brand._id,
      price: p.price,
      originalRetailPrice: p.retail,
      sku: generateSku(brand.slug),
      condition: p.condition,
      images: PLACEHOLDER_IMAGES.map((img, i) => ({ ...img, isPrimary: i === 0 })),
      color: p.color,
      material: p.material,
      size: p.size,
      isPublished: true,
      isFeatured: Math.random() < 0.3,
      isNewArrival: true,
      requiresAddon: p.requiresAddon || ADDON_GATE.NONE,
      isAuthenticated: true,
      authenticationDetails: {
        authenticatedBy: 'State Side Global Authentication Team',
        authDate: new Date(),
      },
    });
    created += 1;
  }
  logger.info(`Seeded ${created} new products (skipped existing)`);
}

async function run() {
  try {
    await connectDB();
    await ensureDefaults();
    await seedAdmin();
    const brandMap = await seedBrands();
    await seedCategories();
    await seedProducts(brandMap);
    logger.info('Seed complete');
  } catch (err) {
    logger.error(err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

run();

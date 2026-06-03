import { Counter } from '../models/Counter.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { ORDER_NUMBER_PREFIX } from '@ssg/shared/constants';
import { ADDON_GATE } from '@ssg/shared/enums';
import { getSetting, SETTINGS_KEYS } from './siteSettings.service.js';

export async function nextOrderNumber() {
  const year = new Date().getFullYear();
  const key = `order:${year}`;
  const n = await Counter.next(key);
  return `${ORDER_NUMBER_PREFIX}-${year}-${String(n).padStart(6, '0')}`;
}

/**
 * Validate items against current product state. Returns enriched line items
 * with snapshots (title/price/image) plus the involved Product documents for
 * subsequent stock updates. Throws ApiError on any violation.
 */
export async function validateAndSnapshot(items, user) {
  if (!Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest('Cart is empty');
  }

  const ids = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: ids }, deletedAt: null });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lineItems = [];
  for (const it of items) {
    const product = byId.get(String(it.productId));
    if (!product) throw ApiError.badRequest(`Product not found: ${it.productId}`);
    if (!product.isPublished) throw ApiError.badRequest(`Unavailable: ${product.title}`);
    if (product.sold) throw ApiError.conflict(`Already sold: ${product.title}`);
    if (
      product.requiresAddon !== ADDON_GATE.NONE &&
      !user.hasAddon(product.requiresAddon)
    ) {
      throw ApiError.addonRequired(product.requiresAddon);
    }
    const qty = Math.max(1, Math.min(it.quantity || 1, product.quantity));
    const primary = product.images?.find((i) => i.isPrimary) || product.images?.[0];

    lineItems.push({
      product: product._id,
      title: product.title,
      image: primary?.url || '',
      price: product.discountPrice && (!product.discountEnds || product.discountEnds > new Date())
        ? product.discountPrice
        : product.price,
      quantity: qty,
    });
  }

  return { lineItems, products };
}

/**
 * Computes shipping + tax + total from snapshot items.
 */
export async function computeTotals(lineItems, productsById) {
  const subtotal = lineItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const flat = await getSetting(SETTINGS_KEYS.SHIPPING_FLAT_RATE);
  const byCat = (await getSetting(SETTINGS_KEYS.SHIPPING_BY_CATEGORY)) || {};
  // Use the highest applicable category rate among items; fall back to flat.
  let shippingFee = flat;
  for (const item of lineItems) {
    const product = productsById.get(String(item.product));
    if (product && byCat[product.category]) {
      shippingFee = Math.max(shippingFee, byCat[product.category]);
    }
  }

  const taxBps = (await getSetting(SETTINGS_KEYS.TAX_RATE_BPS)) || 0;
  const tax = Math.round((subtotal * taxBps) / 10_000);

  return { subtotal, shippingFee, tax, total: subtotal + shippingFee + tax };
}

export async function markProductsSold(productIds) {
  if (!productIds.length) return;
  await Product.updateMany(
    { _id: { $in: productIds } },
    { $set: { sold: true, soldAt: new Date() } },
  );
}

export async function unmarkProductsSold(productIds) {
  if (!productIds.length) return;
  await Product.updateMany(
    { _id: { $in: productIds } },
    { $set: { sold: false }, $unset: { soldAt: '' } },
  );
}

export function appendStatusHistory(order, status, { changedBy, note } = {}) {
  order.statusHistory.push({ status, changedAt: new Date(), changedBy, note });
}

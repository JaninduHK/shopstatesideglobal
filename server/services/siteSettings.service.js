import { SiteSettings } from '../models/SiteSettings.js';
import { PRICING_DEFAULTS } from '@ssg/shared/constants';

const CACHE_TTL_MS = 60_000;
const cache = new Map(); // key -> { value, expiresAt }

export const SETTINGS_KEYS = {
  PRICING_BASIC: 'pricing.membership.basic',
  PRICING_ADDON1: 'pricing.membership.addon1',
  PRICING_ADDON2: 'pricing.membership.addon2',
  PRICING_REQUEST_FEE: 'pricing.special_request_fee',
  ADDON1_NAME: 'addons.addon1.name',
  ADDON2_NAME: 'addons.addon2.name',
  ADDON1_BENEFITS: 'addons.addon1.benefits',
  ADDON2_BENEFITS: 'addons.addon2.benefits',
  BASIC_BENEFITS: 'plans.basic.benefits',
  SHIPPING_FLAT_RATE: 'shipping.flat_rate',
  SHIPPING_BY_CATEGORY: 'shipping.by_category',
  TAX_RATE_BPS: 'tax.rate_bps', // basis points (e.g. 750 = 7.5%)
  SITE_NAME: 'site.name',
  SITE_TAGLINE: 'site.tagline',
  SITE_CONTACT_EMAIL: 'site.contact_email',
  SITE_WHATSAPP: 'site.whatsapp',
  SOCIAL_INSTAGRAM: 'social.instagram',
  SOCIAL_TWITTER: 'social.twitter',
  SOCIAL_TIKTOK: 'social.tiktok',
  ANNOUNCEMENT_BAR: 'content.announcement_bar', // { text, link, active }
};

const DEFAULTS = {
  [SETTINGS_KEYS.PRICING_BASIC]: PRICING_DEFAULTS.MEMBERSHIP_BASIC,
  [SETTINGS_KEYS.PRICING_ADDON1]: PRICING_DEFAULTS.ADDON_1,
  [SETTINGS_KEYS.PRICING_ADDON2]: PRICING_DEFAULTS.ADDON_2,
  [SETTINGS_KEYS.PRICING_REQUEST_FEE]: PRICING_DEFAULTS.SPECIAL_REQUEST_FEE,
  [SETTINGS_KEYS.ADDON1_NAME]: 'First Look Access',
  [SETTINGS_KEYS.ADDON2_NAME]: 'The Vault',
  [SETTINGS_KEYS.BASIC_BENEFITS]: [
    'Full access to the curated collection',
    'Member-exclusive pricing',
    'Authenticated luxury, hand-selected',
    'Personal wishlist & order history',
  ],
  [SETTINGS_KEYS.ADDON1_BENEFITS]: [
    '24-hour early access to all new arrivals',
    'Invitation to exclusive flash sales',
    'Curated weekly drops',
  ],
  [SETTINGS_KEYS.ADDON2_BENEFITS]: [
    'Access to the Vault: ultra-rare pieces',
    'Priority on one-of-a-kind acquisitions',
    'Private viewing requests',
  ],
  [SETTINGS_KEYS.SHIPPING_FLAT_RATE]: 500_000, // ₦5,000 default
  [SETTINGS_KEYS.SHIPPING_BY_CATEGORY]: {
    handbags: 800_000,
    art: 1_500_000,
    home: 1_500_000,
    jewelry: 500_000,
    watches: 500_000,
  },
  [SETTINGS_KEYS.TAX_RATE_BPS]: 0, // disabled by default; admin can enable NGN VAT (750 = 7.5%)
  [SETTINGS_KEYS.SITE_NAME]: 'State Side Global',
  [SETTINGS_KEYS.SITE_TAGLINE]: 'Only the Authentic. Only the Exceptional.',
  [SETTINGS_KEYS.SITE_CONTACT_EMAIL]: 'concierge@statesideglobal.com',
  [SETTINGS_KEYS.SITE_WHATSAPP]: '',
  [SETTINGS_KEYS.SOCIAL_INSTAGRAM]: '',
  [SETTINGS_KEYS.SOCIAL_TWITTER]: '',
  [SETTINGS_KEYS.SOCIAL_TIKTOK]: '',
  [SETTINGS_KEYS.ANNOUNCEMENT_BAR]: { text: '', link: '', active: false },
};

export async function getSetting(key) {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const doc = await SiteSettings.findOne({ key });
  const value = doc ? doc.value : DEFAULTS[key];
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export async function setSetting(key, value, updatedBy) {
  await SiteSettings.findOneAndUpdate(
    { key },
    { key, value, updatedBy },
    { upsert: true, new: true },
  );
  cache.delete(key);
}

export async function ensureDefaults() {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    const existing = await SiteSettings.findOne({ key });
    if (!existing) {
      await SiteSettings.create({ key, value });
    }
  }
}

export function clearCache() {
  cache.clear();
}

export async function getPricing() {
  const [basic, addon1, addon2] = await Promise.all([
    getSetting(SETTINGS_KEYS.PRICING_BASIC),
    getSetting(SETTINGS_KEYS.PRICING_ADDON1),
    getSetting(SETTINGS_KEYS.PRICING_ADDON2),
  ]);
  return { basic, addon1, addon2 };
}

export async function getAddonMeta() {
  const [name1, name2, b1, b2] = await Promise.all([
    getSetting(SETTINGS_KEYS.ADDON1_NAME),
    getSetting(SETTINGS_KEYS.ADDON2_NAME),
    getSetting(SETTINGS_KEYS.ADDON1_BENEFITS),
    getSetting(SETTINGS_KEYS.ADDON2_BENEFITS),
  ]);
  return {
    addon1: { name: name1, benefits: b1 },
    addon2: { name: name2, benefits: b2 },
  };
}

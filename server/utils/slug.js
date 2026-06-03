import crypto from 'node:crypto';

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a unique slug for a model by suffixing -<n> when needed.
 */
export async function uniqueSlug(Model, base, { ignoreId } = {}) {
  const slug = slugify(base);
  let candidate = slug;
  let n = 1;
  /* eslint-disable no-await-in-loop */
  while (true) {
    const q = { slug: candidate };
    if (ignoreId) q._id = { $ne: ignoreId };
    const existing = await Model.findOne(q).lean();
    if (!existing) return candidate;
    n += 1;
    candidate = `${slug}-${n}`;
    if (n > 50) return `${slug}-${crypto.randomBytes(3).toString('hex')}`;
  }
}

export function generateSku(brandSlug) {
  const prefix = (brandSlug || 'ssg').slice(0, 4).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${rand}`;
}

import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    throw ApiError.internal('Cloudinary not configured');
  }
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
  configured = true;
}

/**
 * Returns signed-upload params the browser uses to POST directly to Cloudinary.
 * Folder is scoped so admin uploads can't pollute other namespaces.
 */
export function signedUploadParams({ folder = 'products' } = {}) {
  ensureConfigured();
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.cloudinary.apiSecret);
  return {
    cloudName: env.cloudinary.cloudName,
    apiKey: env.cloudinary.apiKey,
    timestamp,
    folder,
    signature,
  };
}

export async function destroyAsset(publicId) {
  if (!publicId) return;
  ensureConfigured();
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // best-effort cleanup
  }
}

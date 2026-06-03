import { useCallback, useState } from 'react';
import { useLazyAdminUploadSignatureQuery } from '../features/admin/adminApi.js';
import { useLazyRequestUploadSignatureQuery } from '../features/requests/requestsApi.js';

/**
 * Direct-to-Cloudinary uploader using a server-signed signature.
 *
 * `which`:
 *  - 'admin'    → fetches /admin/products/upload-signature (admin only, folder=products)
 *  - 'request'  → fetches /special-requests/upload-signature (any member, folder=special-requests)
 */
export function useCloudinaryUpload(which = 'admin') {
  const [fetchAdmin] = useLazyAdminUploadSignatureQuery();
  const [fetchRequest] = useLazyRequestUploadSignatureQuery();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(
    async (file) => {
      setUploading(true);
      setProgress(0);
      try {
        const sigRes =
          which === 'request'
            ? await fetchRequest().unwrap()
            : await fetchAdmin('products').unwrap();
        const { cloudName, apiKey, timestamp, signature, folder: signedFolder } = sigRes;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        formData.append('folder', signedFolder);

        const result = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => {
            try {
              const json = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300) resolve(json);
              else reject(new Error(json.error?.message || 'Upload failed'));
            } catch {
              reject(new Error('Bad response from Cloudinary'));
            }
          };
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.send(formData);
        });

        return { url: result.secure_url, publicId: result.public_id, alt: file.name };
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [fetchAdmin, fetchRequest, which],
  );

  return { upload, uploading, progress };
}

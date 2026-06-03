import { useCallback, useEffect, useState } from 'react';

const SCRIPT_URL = 'https://js.paystack.co/v2/inline.js';
let scriptPromise = null;

function loadPaystack() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.PaystackPop) return Promise.resolve(window.PaystackPop);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.PaystackPop));
      existing.addEventListener('error', () => reject(new Error('Failed to load Paystack')));
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve(window.PaystackPop);
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('Failed to load Paystack'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * usePaystack — opens Paystack inline checkout.
 *
 * pay({ accessCode, onSuccess, onClose })
 *   accessCode is returned by our /subscribe or /add-on endpoint.
 *
 * Falls back to redirect (authorizationUrl) if inline JS fails to load.
 */
export function usePaystack() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadPaystack().then(() => setReady(true)).catch(() => setReady(false));
  }, []);

  const pay = useCallback(({ accessCode, authorizationUrl, onSuccess, onClose }) => {
    if (!window.PaystackPop) {
      if (authorizationUrl) {
        window.location.href = authorizationUrl;
        return;
      }
      throw new Error('Paystack not loaded');
    }
    const popup = new window.PaystackPop();
    popup.resumeTransaction(accessCode, {
      onSuccess: (tx) => onSuccess?.(tx),
      onCancel: () => onClose?.(),
      onError: () => onClose?.(),
    });
  }, []);

  return { pay, ready };
}

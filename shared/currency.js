import { CURRENCY_SYMBOL, KOBO_PER_NAIRA } from './constants.js';

export function koboToNaira(kobo) {
  return Math.round(kobo) / KOBO_PER_NAIRA;
}

export function nairaToKobo(naira) {
  return Math.round(naira * KOBO_PER_NAIRA);
}

export function formatNaira(kobo, { withSymbol = true, decimals = 0 } = {}) {
  const naira = koboToNaira(kobo);
  const formatted = naira.toLocaleString('en-NG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return withSymbol ? `${CURRENCY_SYMBOL}${formatted}` : formatted;
}

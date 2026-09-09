/**
 * A curated set of currencies rather than the full ISO 4217 list (180+ codes,
 * most of which no user of this app will ever need) — enough to cover the
 * common cases (US, India, and the other places people who'd use a personal
 * finance app like this tend to bank) without turning every currency picker
 * into a giant unscannable dropdown.
 */
export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
];

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function currencySymbol(code: string): string {
  return BY_CODE.get(code)?.symbol ?? code;
}

export function currencyName(code: string): string {
  return BY_CODE.get(code)?.name ?? code;
}

/** Region (from a locale tag like "en-IN") -> likely home currency. Deliberately small: just enough to seed a sensible default, never a source of truth. */
const REGION_CURRENCY: Record<string, string> = {
  US: 'USD', IN: 'INR', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD',
  JP: 'JPY', CN: 'CNY', SG: 'SGD', HK: 'HKD', AE: 'AED', CH: 'CHF',
  MX: 'MXN', BR: 'BRL', ZA: 'ZAR', SE: 'SEK', NO: 'NOK', DK: 'DKK',
  PL: 'PLN', TH: 'THB', MY: 'MYR', ID: 'IDR', PH: 'PHP', VN: 'VND',
  KR: 'KRW', PK: 'PKR', BD: 'BDT', LK: 'LKR', NG: 'NGN', EG: 'EGP',
  SA: 'SAR', IL: 'ILS', TR: 'TRY', RU: 'RUB',
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', IE: 'EUR',
  PT: 'EUR', AT: 'EUR', BE: 'EUR', FI: 'EUR', GR: 'EUR',
};

/**
 * A best-guess starting currency for a brand-new install, from the browser's
 * locale region — never applied to an existing user's settings, only used to
 * seed the very first Settings row so someone opening this app from India
 * doesn't have to immediately go change USD to INR before entering a rupee.
 */
export function guessDefaultCurrency(): string {
  try {
    const locale = new Intl.NumberFormat().resolvedOptions().locale;
    const region = new Intl.Locale(locale).maximize().region;
    if (region && REGION_CURRENCY[region]) return REGION_CURRENCY[region];
  } catch {
    // Intl.Locale unsupported or malformed locale — fall through to default.
  }
  return 'USD';
}

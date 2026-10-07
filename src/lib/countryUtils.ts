export interface CountryConfig {
  code: string;
  name: string;
  shortName: string;
  flag: string;
  currency: string;
  currencyCode: string;
}

export const COUNTRIES: CountryConfig[] = [
  { code: 'SA', name: 'المملكة العربية السعودية', shortName: 'السعودية', flag: '🇸🇦', currency: 'ر.س', currencyCode: 'SAR' },
  { code: 'SD', name: 'جمهورية السودان', shortName: 'السودان', flag: '🇸🇩', currency: 'ج.س', currencyCode: 'SDG' },
  { code: 'EG', name: 'جمهورية مصر العربية', shortName: 'مصر', flag: '🇪🇬', currency: 'ج.م', currencyCode: 'EGP' },
  { code: 'AE', name: 'الإمارات العربية المتحدة', shortName: 'الإمارات', flag: '🇦🇪', currency: 'د.إ', currencyCode: 'AED' },
  { code: 'QA', name: 'دولة قطر', shortName: 'قطر', flag: '🇶🇦', currency: 'ر.ق', currencyCode: 'QAR' },
  { code: 'KW', name: 'دولة الكويت', shortName: 'الكويت', flag: '🇰🇼', currency: 'د.ك', currencyCode: 'KWD' },
  { code: 'OM', name: 'سلطنة عمان', shortName: 'عمان', flag: '🇴🇲', currency: 'ر.ع', currencyCode: 'OMR' },
  { code: 'BH', name: 'مملكة البحرين', shortName: 'البحرين', flag: '🇧🇭', currency: 'د.ب', currencyCode: 'BHD' },
  { code: 'JO', name: 'المملكة الأردنية الهاشمية', shortName: 'الأردن', flag: '🇯🇴', currency: 'د.أ', currencyCode: 'JOD' },
  { code: 'US', name: 'الولايات المتحدة (دولي)', shortName: 'دولي (USD)', flag: '🇺🇸', currency: '$', currencyCode: 'USD' },
  { code: 'GB', name: 'المملكة المتحدة', shortName: 'بريطانيا', flag: '🇬🇧', currency: '£', currencyCode: 'GBP' },
  { code: 'EU', name: 'الاتحاد الأوروبي', shortName: 'أوروبا', flag: '🇪🇺', currency: '€', currencyCode: 'EUR' },
];

export const getCountryConfig = (countryNameOrCode?: string): CountryConfig => {
  if (!countryNameOrCode) return COUNTRIES[0];
  const q = countryNameOrCode.trim().toLowerCase();
  const found = COUNTRIES.find(
    (c) =>
      c.code.toLowerCase() === q ||
      c.shortName.toLowerCase() === q ||
      c.name.toLowerCase().includes(q) ||
      q.includes(c.shortName.toLowerCase())
  );
  return found || COUNTRIES[0];
};

export const formatPriceWithCurrency = (price: number, currency: string = 'ر.س'): string => {
  if (price === 0) return 'مجاناً';
  return `${price} ${currency}`;
};

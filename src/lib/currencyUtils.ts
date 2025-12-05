export const getCurrencySymbol = (currencyCode: string): string => {
  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CNY': '¥',
    'INR': '₹',
    'BDT': '৳',
    'PKR': '₨',
    'AUD': 'A$',
    'CAD': 'C$',
    'CHF': 'Fr',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'RUB': '₽',
    'BRL': 'R$',
    'MXN': 'Mex$',
    'ZAR': 'R',
    'SGD': 'S$',
    'HKD': 'HK$',
    'NZD': 'NZ$',
    'KRW': '₩',
    'TRY': '₺',
    'AED': 'د.إ',
    'SAR': '﷼',
    'THB': '฿',
    'MYR': 'RM',
    'IDR': 'Rp',
    'PHP': '₱',
    'VND': '₫',
  };

  return currencySymbols[currencyCode.toUpperCase()] || currencyCode;
};

export const formatPrice = (amount: number, currencyCode: string, showDecimals: boolean = true): string => {
  const symbol = getCurrencySymbol(currencyCode);
  return showDecimals ? `${symbol}${amount.toFixed(2)}` : `${symbol}${Math.round(amount)}`;
};

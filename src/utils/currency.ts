export function formatCurrency(amount: number, currency: string = 'COP'): string {
  const localeMap: { [key: string]: string } = {
    COP: 'es-CO',
    USD: 'en-US',
    EUR: 'es-ES',
    MXN: 'es-MX',
    ARS: 'es-AR',
    PEN: 'es-PE',
    CLP: 'es-CL',
  };

  const locale = localeMap[currency] || 'es-CO';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactCurrency(amount: number, currency: string = 'COP'): string {
  const localeMap: { [key: string]: string } = {
    COP: 'es-CO',
    USD: 'en-US',
    EUR: 'es-ES',
    MXN: 'es-MX',
    ARS: 'es-AR',
    PEN: 'es-PE',
    CLP: 'es-CL',
  };

  const locale = localeMap[currency] || 'es-CO';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

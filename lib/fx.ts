// Convert any amount to a target currency using USD-based rates
// rates = { EUR: 0.92, NGN: 1580, XOF: 600, ... } (all relative to 1 USD)
export function convert(amount: number, fromCurrency: string, toCurrency: string, rates: Record<string, number>): number {
  if (fromCurrency === toCurrency) return amount
  const fromRate = rates[fromCurrency] || 1  // how many fromCurrency per 1 USD
  const toRate   = rates[toCurrency]   || 1  // how many toCurrency per 1 USD
  // Convert: amount -> USD -> target
  const inUSD = amount / fromRate
  return inUSD * toRate
}

// Convert and format in one step
export function convertAndFormat(amount: number, fromCurrency: string, toCurrency: string, rates: Record<string, number>): string {
  const converted = convert(amount, fromCurrency, toCurrency, rates)
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: toCurrency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(converted)
}
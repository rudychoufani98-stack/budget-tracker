// Shared currency conversion used across all tabs.
//
// The app's convention: every contract stores fx_rate_at_signing = NGN per 1 USD
// at the time of signing. Live rates from /api/fx (or exchange_rates table) are
// USD-based: { NGN: 1580, EUR: 0.92, ... } meaning "X units per 1 USD".
//
// convertBySigningRate converts amount from one currency to another, preferring
// the contract's signing rate for NGN<->USD and falling back to live fx rates.
// Returns 0 when no conversion is possible (never Infinity/NaN).
export function convertBySigningRate(
  amount: number,
  fromCcy: string,
  toCcy: string,
  signingRate?: number | null,
  fxRates: Record<string, number> = {},
): number {
  if (!amount) return 0
  if (fromCcy === toCcy) return amount

  // NGN per USD: signing rate first, then live rate
  const ngnPerUsd = (signingRate && signingRate > 0) ? signingRate : (fxRates['NGN'] || 0)

  function perUsd(ccy: string): number {
    if (ccy === 'USD') return 1
    if (ccy === 'NGN') return ngnPerUsd
    return fxRates[ccy] || 1 // EUR/GBP etc: live rate, else assume ~1 USD
  }

  const fromRate = perUsd(fromCcy)
  const toRate   = perUsd(toCcy)
  if (fromRate <= 0 || toRate <= 0) return 0

  return (amount / fromRate) * toRate
}

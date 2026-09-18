export const getCreditValue = (value, { isLoading = false, hasError = false } = {}) => {
  if (isLoading) return 'Loading…'
  if (hasError) return 'Unavailable'
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

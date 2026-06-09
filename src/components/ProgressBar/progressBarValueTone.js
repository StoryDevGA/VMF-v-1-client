function normalizeProgressMax(max) {
  const numericMax = Number(max)
  return Number.isFinite(numericMax) && numericMax > 0 ? numericMax : 100
}

function normalizeProgressValue(value, max) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return 0
  }

  return Math.min(Math.max(numericValue, 0), max)
}

export function getProgressBarValueTint(value = 0, max = 100) {
  const resolvedMax = normalizeProgressMax(max)
  const resolvedValue = normalizeProgressValue(value, resolvedMax)
  return `${Math.round(70 - ((resolvedValue / resolvedMax) * 70))}%`
}

// Mirror the server-owned statistical-publication marker; this grants no access.
export const readIndustryCapture = value => {
  const fields = ['contractVersion', 'reportUrl', 'reportingPeriodQuote', 'reportCaveatQuote']
  if (!value || Array.isArray(value) || Object.keys(value).length !== fields.length
    || !fields.every(key => Object.hasOwn(value, key))
    || value.contractVersion !== 'public-research-industry-capture.v1'
    || typeof value.reportUrl !== 'string' || value.reportUrl.length > 500
    || !['reportingPeriodQuote', 'reportCaveatQuote'].every(key => typeof value[key] === 'string'
      && value[key].trim() === value[key] && value[key].length > 0 && value[key].length <= 300 && !/\p{Cc}/u.test(value[key]))) return null
  try {
    const parsed = new URL(value.reportUrl)
    if (parsed.href !== value.reportUrl || parsed.origin !== 'https://www.gov.uk' || parsed.username || parsed.password || parsed.search || parsed.hash
      || !/^\/government\/statistics\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parsed.pathname)) return null
  } catch { return null }
  return value
}

/**
 * Date/Time formatting helpers.
 *
 * Standard app format:
 * - Date: YYYY-MM-DD
 * - Time: HH:mm
 * - DateTime: YYYY-MM-DD HH:mm
 */

const padTwoDigits = (value) => String(value).padStart(2, '0')

const toValidDate = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const getLocalDayStart = (value) => new Date(
  value.getFullYear(),
  value.getMonth(),
  value.getDate(),
)

const formatCompactDateLabel = (value, reference) => {
  const options = {
    day: 'numeric',
    month: 'short',
  }

  if (value.getFullYear() !== reference.getFullYear()) {
    options.year = 'numeric'
  }

  return new Intl.DateTimeFormat('en-GB', options).format(value)
}

/**
 * @param {string|number|Date|null|undefined} value
 * @returns {{ iso: string, dateLabel: string, timeLabel: string } | null}
 */
export const formatDateTimeParts = (value) => {
  const parsed = toValidDate(value)
  if (!parsed) return null

  const year = parsed.getFullYear()
  const month = padTwoDigits(parsed.getMonth() + 1)
  const day = padTwoDigits(parsed.getDate())
  const hours = padTwoDigits(parsed.getHours())
  const minutes = padTwoDigits(parsed.getMinutes())

  return {
    iso: parsed.toISOString(),
    dateLabel: `${year}-${month}-${day}`,
    timeLabel: `${hours}:${minutes}`,
  }
}

/**
 * Formats a timestamp using the compact relative labels used by customer
 * workspace surfaces.
 *
 * @param {string|number|Date|null|undefined} value
 * @param {string|number|Date} [referenceValue=new Date()]
 * @returns {{ iso: string, dateLabel: string, timeLabel: string } | null}
 */
export const formatRelativeDateTimeParts = (value, referenceValue = new Date()) => {
  const parsed = toValidDate(value)
  const reference = toValidDate(referenceValue)
  if (!parsed || !reference) return null

  const dayDifference = Math.round(
    (getLocalDayStart(reference).getTime() - getLocalDayStart(parsed).getTime())
      / (24 * 60 * 60 * 1000),
  )

  const hours = padTwoDigits(parsed.getHours())
  const minutes = padTwoDigits(parsed.getMinutes())

  return {
    iso: parsed.toISOString(),
    dateLabel: dayDifference === 0
      ? 'Today'
      : dayDifference === 1
        ? 'Yesterday'
        : formatCompactDateLabel(parsed, reference),
    timeLabel: `${hours}:${minutes}`,
  }
}

/**
 * @param {string|number|Date|null|undefined} value
 * @param {string} [fallback='--']
 * @returns {string}
 */
export const formatDateTime = (value, fallback = '--') => {
  const parts = formatDateTimeParts(value)
  if (!parts) return fallback
  return `${parts.dateLabel} ${parts.timeLabel}`
}

/**
 * @param {string|number|Date|null|undefined} value
 * @param {string} [fallback='--']
 * @returns {string}
 */
export const formatDateOnly = (value, fallback = '--') => {
  const parts = formatDateTimeParts(value)
  if (!parts) return fallback
  return parts.dateLabel
}

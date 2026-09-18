import { describe, expect, it } from 'vitest'
import {
  formatDateOnly,
  formatDateTime,
  formatDateTimeParts,
  formatRelativeDateTimeParts,
} from './dateTime.js'

const toExpectedDateTime = (value) => {
  const parsed = new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  const date = `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
  const time = `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
  return { date, time }
}

describe('dateTime utils', () => {
  it('formats valid date/time into fixed labels', () => {
    const iso = '2026-03-05T14:30:00.000Z'
    const expected = toExpectedDateTime(iso)

    const parts = formatDateTimeParts(iso)
    expect(parts).not.toBeNull()
    expect(parts).toMatchObject({
      iso: new Date(iso).toISOString(),
      dateLabel: expected.date,
      timeLabel: expected.time,
    })
  })

  it('returns fallback for invalid values', () => {
    expect(formatDateTime('not-a-date')).toBe('--')
    expect(formatDateTime('', 'Unknown')).toBe('Unknown')
    expect(formatDateOnly('bad', 'N/A')).toBe('N/A')
    expect(formatDateTimeParts('bad')).toBeNull()
  })

  it('supports unix epoch timestamps', () => {
    const parts = formatDateTimeParts(0)
    expect(parts).not.toBeNull()
    expect(parts).toMatchObject({
      iso: new Date(0).toISOString(),
      dateLabel: '1970-01-01',
    })
  })

  it('formats date-only output as YYYY-MM-DD', () => {
    const iso = '2026-11-09T06:07:00.000Z'
    const expected = toExpectedDateTime(iso)
    expect(formatDateOnly(iso)).toBe(expected.date)
  })

  it('formats customer-facing timestamps as Today and Yesterday', () => {
    const reference = new Date(2026, 2, 5, 15, 0)

    expect(formatRelativeDateTimeParts(new Date(2026, 2, 5, 9, 41), reference)).toMatchObject({
      dateLabel: 'Today',
      timeLabel: '09:41',
    })
    expect(formatRelativeDateTimeParts(new Date(2026, 2, 4, 16, 20), reference)).toMatchObject({
      dateLabel: 'Yesterday',
      timeLabel: '16:20',
    })
  })

  it('uses a compact month and day for older timestamps', () => {
    const parts = formatRelativeDateTimeParts(
      new Date(2026, 5, 18, 11, 4),
      new Date(2026, 8, 18, 12, 0),
    )

    expect(parts).toMatchObject({
      dateLabel: '18 Jun',
      timeLabel: '11:04',
    })
  })
})

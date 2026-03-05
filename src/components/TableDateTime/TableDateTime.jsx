import { formatDateTimeParts } from '../../utils/dateTime.js'
import './TableDateTime.css'

export function TableDateTime({
  value,
  fallback = '--',
  className = '',
}) {
  const parts = formatDateTimeParts(value)
  if (!parts) return fallback

  const classes = ['table-date-time', className].filter(Boolean).join(' ')

  return (
    <time className={classes} dateTime={parts.iso}>
      <span className="table-date-time__date">{parts.dateLabel}</span>
      <span className="table-date-time__time">{parts.timeLabel}</span>
    </time>
  )
}

export default TableDateTime


/**
 * DateTime Component
 *
 * Displays the current date and time in real time.
 * - Uses date-fns for formatting
 * - Updates on a configurable interval (default 1s)
 * - Accessible with polite live updates
 *
 * @example
 * <DateTime />
 *
 * @example
 * <DateTime
 *   dateFormat="yyyy-MM-dd"
 *   timeFormat="HH:mm"
 *   updateInterval={1000}
 * />
 */

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import './DateTime.css'

export function DateTime({
  className = '',
  dateFormat = 'yyyy-MM-dd',
  timeFormat = 'HH:mm',
  updateInterval = 1000
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(new Date())
    }, updateInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [updateInterval])

  const formattedDate = format(now, dateFormat)
  const formattedTime = format(now, timeFormat)

  return (
    <div className={`datetime ${className}`.trim()} aria-live="polite">
      <span className="datetime__date">{formattedDate}</span>
      <span className="datetime__separator" aria-hidden="true">
        •
      </span>
      <time className="datetime__time" dateTime={now.toISOString()}>
        {formattedTime}
      </time>
    </div>
  )
}

export default DateTime

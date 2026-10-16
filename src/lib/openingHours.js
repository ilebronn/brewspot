// Evaluate Google's opening periods in the café's time zone, not the user's.
export function openingStatus(hours, utcOffsetMinutes, now = new Date()) {
  if (!hours?.periods || !Number.isFinite(utcOffsetMinutes)) return undefined
  const local = new Date(now.getTime() + utcOffsetMinutes * 60000)
  const minute = local.getUTCDay() * 1440 + local.getUTCHours() * 60 + local.getUTCMinutes()
  const week = 10080
  const point = p => p.day * 1440 + p.hour * 60 + p.minute
  if (!hours.periods.length) return false
  let unknown = false
  for (const period of hours.periods) {
    if (!period.open) { unknown = true; continue }
    // Google's documented representation of a business open 24/7.
    if (!period.close) {
      if (period.open.day === 0 && period.open.hour === 0 && period.open.minute === 0) return true
      unknown = true; continue
    }
    const start = point(period.open)
    let end = point(period.close)
    if (end <= start) end += week
    if ((minute >= start && minute < end) || (minute + week >= start && minute + week < end)) return true
  }
  return unknown ? undefined : false
}

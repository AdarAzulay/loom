/** Calendar dates never pass through a device-local midnight or a UTC ISO conversion. */
export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= (days[month - 1] ?? 0)
}

export function formatDate(value: string, short = false): string {
  if (!isDateOnly(value)) return value
  const [year = 1, month = 1, day = 1] = value.split('-').map(Number)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  return new Intl.DateTimeFormat('en', {
    timeZone: 'UTC', month: 'short', day: 'numeric', ...(short ? {} : { year: 'numeric' }),
  }).format(date)
}

export const dateRange = (start: string, end: string) => `${formatDate(start)} – ${formatDate(end)}`

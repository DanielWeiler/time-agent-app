import { userCurrentDateTime } from '../routes/signin'

export function assertDefined<T>(
  value: T | null | undefined
): asserts value is T {
  if (value == null) {
    throw new Error(`Fatal error: value ${value} must not be null/undefined.`)
  }
}

export function getNextDayOfTheWeek(
  dayName: string,
  excludeToday = false,
  refDate = new Date(userCurrentDateTime)
) {
  const dayOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].indexOf(dayName)
  if (dayOfWeek < 0) return
  refDate.setHours(0, 0, 0, 0)
  refDate.setDate(
    refDate.getDate() +
      +!!excludeToday +
      ((dayOfWeek + 7 - refDate.getDay() - +!!excludeToday) % 7)
  )
  return refDate
}

export function parseTime(time: string) {
  const h = time.split(':')[0]
  const m = time.split(':')[1]

  const hours = Number(h)
  const minutes = Number(m)
  const t = { hours, minutes }

  return t
}
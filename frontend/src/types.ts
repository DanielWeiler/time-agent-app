export interface WeeklyHoursFormValues {
  Monday: TimePeriod,
  Tuesday: TimePeriod,
  Wednesday: TimePeriod,
  Thursday: TimePeriod,
  Friday: TimePeriod,
  Saturday: TimePeriod,
  Sunday: TimePeriod
}

export interface TimePeriod {
  startTime: string,
  endTime: string
}


export interface ReminderFormValues {
  summary: string
  duration: string
  manualDate: string
  manualTime: string
  deadlineDate: string
  deadlineTime: string
}
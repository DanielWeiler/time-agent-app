import { google } from 'googleapis'
import { userCurrentDateTime } from '../services/sign-in.service'
import { EventData, WeeklyHoursData } from '../types'
import oAuth2Client from '../configs/google-client.config'
import {
  addTimeToDate,
  assertDefined,
  getNextDayOfTheWeek,
} from '../utils/helpers'
require('express-async-errors')
const calendar = google.calendar('v3')

async function getUserTimeZone() {
  const cal = await calendar.calendars.get({
    auth: oAuth2Client,
    calendarId: 'primary',
  })

  return cal.data.timeZone
}

async function freeBusy(queryStartTime: string, queryEndTime: string) {
  const availabilityQuery = await calendar.freebusy.query({
    auth: oAuth2Client,
    requestBody: {
      timeMin: queryStartTime,
      timeMax: queryEndTime,
      timeZone: await getUserTimeZone(),
      items: [
        {
          id: 'primary',
        },
      ],
    },
  })

  const unavailableTimes = availabilityQuery.data.calendars?.primary.busy
  assertDefined(unavailableTimes)

  return unavailableTimes
}

function checkTimeDuration(timeSlotStart: Date, timeSlotEnd: Date) {
  assertDefined(timeSlotStart)
  assertDefined(timeSlotEnd)
  const availableTime =
    (timeSlotEnd.getTime() - timeSlotStart.getTime()) /
    60000
  return availableTime
}

// This function finds the next available time slot on the user's calendar for
// an event to be scheduled.
async function findAvailability(
  givenQueryStartTime: Date,
  eventDuration: number
) {
  // Begin loop to iterate over the days from the given start time
  let findingAvailability = true
  let queryDayCount = 0
  while (findingAvailability) {
    const queryStartTimeDate = new Date(givenQueryStartTime)

    // Set <queryStartTime> to current day being queried for availability
    queryStartTimeDate.setDate(queryStartTimeDate.getDate() + queryDayCount)

    // Enables searching from the given time on the given day and from the
    // beginning of the day on following days
    if (queryDayCount > 0) {
      queryStartTimeDate.setHours(0, 0, 0, 0)
    }

    const queryEndTimeDate = new Date(queryStartTimeDate)
    queryEndTimeDate.setHours(24, 0, 0, 0)

    const unavailableTimes = await freeBusy(
      queryStartTimeDate.toISOString(),
      queryEndTimeDate.toISOString()
    )

    // Check if there are any busy times within the queried time slot
    if (unavailableTimes.length === 0) {
      findingAvailability = false
      return queryStartTimeDate
    } else {
      // Begin loop to iterate over the busy times in the <unavailableTimes>
      // array to continue to check for available time within the queried time
      for (let i = 0; i < unavailableTimes.length; i++) {
        const event = unavailableTimes[i]
        assertDefined(event.start)
        assertDefined(event.end)
        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)

        // Check if there is enough time for the event from the start of the
        // queried time slot to the start of the first busy time
        if (i === 0) {
          const availableTime = checkTimeDuration(
            queryStartTimeDate,
            eventStart
          )
          if (availableTime >= eventDuration) {
            findingAvailability = false
            return queryStartTimeDate
          }
        }

        // Check if there is another busy time in the <unavailableTimes> array
        if (unavailableTimes[i + 1]) {
          // If so, check if there is enough time for the event in between
          // these two busy times
          const nextEvent = unavailableTimes[i + 1]
          assertDefined(nextEvent.start)
          const nextEventStart = new Date(nextEvent.start)

          const availableTime = checkTimeDuration(eventEnd, nextEventStart)
          if (availableTime >= eventDuration) {
            findingAvailability = false
            return eventEnd
          } else {
            continue
          }
        } else {
          // If not, check if there is enough time for the event from the end
          // of the last busy time to the end of the queried time slot
          const availableTime = checkTimeDuration(eventEnd, queryEndTimeDate)
          if (availableTime >= eventDuration) {
            findingAvailability = false
            return eventEnd
          }
        }
      }
    }
    if (queryDayCount === 180) {
      console.log(
        'Message for user: "Reminder could not be scheduled. No available \
          time could be found in the next 6 months"'
      )
      break
    }

    queryDayCount += 1
  }
  return
}

function getEndTime(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000)
}

async function scheduleEvent(
  summary: string,
  startDateTime: Date,
  endDateTime: Date
) {
  await calendar.events.insert({
    // Formatted in the same way as Google's example for this method.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    auth: oAuth2Client,
    calendarId: 'primary',
    requestBody: {
      summary: summary,
      colorId: '7',
      start: {
        dateTime: startDateTime,
        timeZone: await getUserTimeZone(),
      },
      end: {
        dateTime: endDateTime,
        timeZone: await getUserTimeZone(),
      },
      // see req.body available properties that could help with timeagent
    },
  })
}

function setWorkingHours(weeklyHours: WeeklyHoursData) {
  Object.entries(weeklyHours.data).map(async (item) => {
    const date = getNextDayOfTheWeek(item[0])
    assertDefined(date)

    // Check if the day has working hours
    if (item[1].startTime || item[1].endTime !== '') {
      const startWorkingHours = addTimeToDate(item[1].startTime, date)
      const endWorkingHours = addTimeToDate(item[1].endTime, date)

      await calendar.events.insert({
        // Formatted in the same way as Google's example for this method.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        auth: oAuth2Client,
        calendarId: 'primary',
        requestBody: {
          summary: 'Working hours',
          colorId: '4',
          start: {
            dateTime: startWorkingHours,
            timeZone: await getUserTimeZone(),
          },
          end: {
            dateTime: endWorkingHours,
            timeZone: await getUserTimeZone(),
          },
          recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${item[0].slice(0, 2)}`],
        },
      })
    }
  })
}

function setUnavailableHours(weeklyHours: WeeklyHoursData) {
  Object.entries(weeklyHours.data).map(async (item) => {
    const date = getNextDayOfTheWeek(item[0])
    assertDefined(date)

    // Check if the day has unavailable hours
    if (item[1].startTime || item[1].endTime !== '') {
      const startAvailableHours = addTimeToDate(item[1].startTime, date)
      const endAvailableHours = addTimeToDate(item[1].endTime, date)

      const startUnavailableHours = date.setHours(0, 0, 0, 0)
      const endUnavailableHours = date.setHours(24, 0, 0, 0)

      await calendar.events.insert({
        // Formatted in the same way as Google's example for this method.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        auth: oAuth2Client,
        calendarId: 'primary',
        requestBody: {
          summary: 'Unavailable hours',
          colorId: '8',
          start: {
            dateTime: new Date(startUnavailableHours),
            timeZone: await getUserTimeZone(),
          },
          end: {
            dateTime: startAvailableHours,
            timeZone: await getUserTimeZone(),
          },
          recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${item[0].slice(0, 2)}`],
        },
      })

      await calendar.events.insert({
        // Formatted in the same way as Google's example for this method.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        auth: oAuth2Client,
        calendarId: 'primary',
        requestBody: {
          summary: 'Unavailable hours',
          colorId: '8',
          start: {
            dateTime: endAvailableHours,
            timeZone: await getUserTimeZone(),
          },
          end: {
            dateTime: new Date(endUnavailableHours),
            timeZone: await getUserTimeZone(),
          },
          recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${item[0].slice(0, 2)}`],
        },
      })
    }
  })
}

async function createEvent(data: EventData) {
  const {
    summary,
    duration,
    manualDate,
    manualTime,
    // deadlineDate,
    // deadlineTime
  } = data
  const durationNumber = parseInt(duration)

  if (manualDate && manualTime) {
    // Schedule event at the given time

    const startDateTime = addTimeToDate(manualTime, manualDate)
    const endDateTime = getEndTime(startDateTime, durationNumber)
    await scheduleEvent(summary, startDateTime, endDateTime)
  } else {
    // Schedule event automatically

    const startDateTime = await findAvailability(
      userCurrentDateTime,
      durationNumber
    )
    assertDefined(startDateTime)
    const endDateTime = getEndTime(startDateTime, durationNumber)
    await scheduleEvent(summary, startDateTime, endDateTime)
  }
}

export default { setWorkingHours, setUnavailableHours, createEvent }

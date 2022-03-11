import express from 'express'
import { google } from 'googleapis'
import { CreateEventRequest, SetWeeklyHoursRequest } from '../types'
import oAuth2Client from '../utils/authorization'
import { assertDefined, getNextDayOfTheWeek, getUserTimeZone, parseTime } from '../utils/helpers'
require('express-async-errors')

const router = express.Router()

const calendar = google.calendar('v3')

router.post('/set-working-hours', (req: SetWeeklyHoursRequest, _res) => {
  void (() => {
    Object.entries(req.body.data).map(async (item) => {
      const dateTime = getNextDayOfTheWeek(item[0])
      assertDefined(dateTime)

      let time = null
      if (item[1].startTime || item[1].endTime !== '') {
        time = parseTime(item[1].startTime)
        dateTime.setHours(time.hours, time.minutes)
        item[1].startTime = dateTime.toISOString()

        time = parseTime(item[1].endTime)
        dateTime.setHours(time.hours, time.minutes)
        item[1].endTime = dateTime.toISOString()

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
              dateTime: new Date(item[1].startTime),
              timeZone: await getUserTimeZone(),
            },
            end: {
              dateTime: new Date(item[1].endTime),
              timeZone: await getUserTimeZone(),
            },
            recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${item[0].slice(0,2)}`],
          },
        })
      }
    })
    console.log('Working hours:', req.body.data)
  })()
})

router.post('/set-unavailable-hours', (req: SetWeeklyHoursRequest, _res) => {
  void (() => {
    Object.entries(req.body.data).map(async (item) => {
      const dateTime = getNextDayOfTheWeek(item[0])
      assertDefined(dateTime)

      let time = null
      if (item[1].startTime || item[1].endTime !== '') {
        time = parseTime(item[1].startTime)
        dateTime.setHours(time.hours, time.minutes)
        item[1].startTime = dateTime.toISOString()

        time = parseTime(item[1].endTime)
        dateTime.setHours(time.hours, time.minutes)
        item[1].endTime = dateTime.toISOString()

        const startUnavailableHours = dateTime.setHours(0,0,0,0)
        const endUnavailableHours = dateTime.setHours(24,0,0,0)

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
              dateTime: new Date(item[1].startTime),
              timeZone: await getUserTimeZone(),
            },
            recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${item[0].slice(0,2)}`],
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
              dateTime: new Date(item[1].endTime),
              timeZone: await getUserTimeZone(),
            },
            end: {
              dateTime: new Date(endUnavailableHours),
              timeZone: await getUserTimeZone(),
            },
            recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${item[0].slice(0,2)}`],
          },
        })
      }
    })
    console.log('Unavailable hours:', req.body.data)
  })()
})

router.post('/create-event', (req: CreateEventRequest, _res) => {
  void (async () => {
    const { data } = req.body
    const { summary, startDateTime, endDateTime } = data

    const reminder = await calendar.events.insert({
      // Formatted in the same way as Google's example for this method.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      auth: oAuth2Client,
      calendarId: 'primary',
      requestBody: {
        summary: summary,
        colorId: '7',
        start: {
          dateTime: new Date(startDateTime),
        },
        end: {
          dateTime: new Date(endDateTime),
        },
        // see req.body available properties that could help with timeagent
      },
    })
    console.log(reminder)
  })()
})

export default router

import FullCalendar, { EventClickArg } from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
import timeGridPlugin from '@fullcalendar/timegrid'
import AddIcon from '@mui/icons-material/Add'
import { AlertColor, Fab } from '@mui/material'
import React, { ChangeEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import eventService from '../services/events'
import { EventData } from '../types'
import { assertDefined, serverErrorMessage } from '../utils/helpers'
import EventOptions from './EventOptions'
import StyleWrapper from './StyleWrapper'

const Calendar = (props: {
  createNotification: (
    body: string,
    heading: string,
    style: AlertColor | undefined
  ) => void
}) => {
  const { createNotification } = props

  const [events, setEvents] = useState([])
  const [eventOpen, setEventOpen] = useState(false)
  const [eventData, setEventData] = useState<EventData>({
    id: '',
    title: '',
    start: null,
    end: null,
    description: '',
    deadline: null,
  })
  const [rescheduleTime, setRescheduleTime] = useState<Date | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // Must wait for authorization to complete after sign in
    setTimeout(() => {
      eventService.getEvents().then((events) => {
        console.log(events)
        setEvents(events)
      })
    }, 1000)
  }, [])

  const handleEventOpen = () => {
    setEventOpen(true)
  }

  const handleEventClose = () => {
    setEventOpen(false)
  }

  const handleEventClick = (arg: EventClickArg) => {
    // Prevent unavailable hours and working hours events from being
    // modified within the calendar view
    if (
      arg.event.title === 'Unavailable hours' ||
      arg.event.title === 'Working hours'
    ) {
      return
    }

    // Get the deadline from the event description
    let deadline = null
    if (
      arg.event.extendedProps.description &&
      arg.event.extendedProps.description.includes('Deadline')
    ) {
      const deadlineInfo: string[] =
        arg.event.extendedProps.description.split('|')
      deadline = new Date(deadlineInfo[0])
    }

    setEventData({
      id: arg.event.id,
      title: arg.event.title,
      start: arg.event.start,
      end: arg.event.end,
      description: arg.event.extendedProps.description,
      deadline: deadline,
    })
    setRescheduleTime(arg.event.start)
    setChecked(false)
    handleEventOpen()
  }

  const handleDeleteEvent = async () => {
    try {
      await eventService.deleteReminder('/delete-event', eventData.id)
      const refreshedEvents = await eventService.getEvents()
      setEvents(refreshedEvents)
    } catch (error) {
      createNotification(serverErrorMessage, '', undefined)
    }
  }

  const handleDateTimePicker = (newTime: Date | null) => {
    setRescheduleTime(newTime)
  }

  const handleCheckbox = (event: ChangeEvent<HTMLInputElement>) => {
    setChecked(event.target.checked)
  }

  const handleRescheduleEvent = async () => {
    assertDefined(eventData.start)
    assertDefined(eventData.end)
    const duration =
      (eventData.end.getTime() - eventData.start.getTime()) / 60000

    const data = {
      flexible: checked,
      eventId: eventData.id,
      rescheduleTime: rescheduleTime,
      summary: eventData.title,
      duration: duration,
      description: eventData.description,
      deadline: eventData.deadline,
    }

    try {
      const reminderMessage: string = await eventService.rescheduleReminder(
        '/reschedule-event',
        data
      )
      const refreshedEvents = await eventService.getEvents()
      setEvents(refreshedEvents)
      createNotification(reminderMessage, 'Reminder scheduled', 'success')
    } catch (error) {
      createNotification(serverErrorMessage, '', undefined)
    }
  }

  return (
    <div>
      <StyleWrapper className="calendar-container">
        <FullCalendar
          height={'100%'}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
          views={{
            timeGrid: {
              titleFormat: { month: 'short', day: 'numeric' },
            },
            listWeek: {
              titleFormat: { month: 'short', day: 'numeric' },
            },
          }}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'title dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            center: '',
            right: 'today prev,next',
          }}
          buttonText={{
            today: '📅',
            month: 'M',
            week: 'W',
            day: 'D',
            list: 'List',
          }}
          dayMaxEvents={true}
          displayEventTime={false}
          events={events}
          eventClick={handleEventClick}
          navLinks={true}
        />
      </StyleWrapper>
      <Link to="/create-event">
        <Fab
          aria-label="add"
          style={{
            background: '#5db9ff',
            color: 'white',
            position: 'absolute',
            right: 25,
            bottom: 25,
          }}
        >
          <AddIcon />
        </Fab>
      </Link>
      <EventOptions
        eventOpen={eventOpen}
        handleEventClose={handleEventClose}
        eventData={eventData}
        rescheduleTime={rescheduleTime}
        handleDateTimePicker={handleDateTimePicker}
        checked={checked}
        handleCheckbox={handleCheckbox}
        handleDeleteEvent={handleDeleteEvent}
        handleRescheduleEvent={handleRescheduleEvent}
      />
    </div>
  )
}

export default Calendar

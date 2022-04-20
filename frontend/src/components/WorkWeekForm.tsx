import React, { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import eventService from '../services/events'
import { TimePeriod, WeeklyHoursFormValues } from '../types'
import { serverErrorMessage } from '../utils/helpers'
import Notification from './Notification'
import WorkDayForm from './WeekDayForm'

const WorkingHoursForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<WeeklyHoursFormValues>({
    defaultValues: {
      Monday: {
        startTime: '08:00:00',
        endTime: '17:00:00',
      },
      Tuesday: {
        startTime: '08:00:00',
        endTime: '17:00:00',
      },
      Wednesday: {
        startTime: '08:00:00',
        endTime: '17:00:00',
      },
      Thursday: {
        startTime: '08:00:00',
        endTime: '17:00:00',
      },
      Friday: {
        startTime: '08:00:00',
        endTime: '17:00:00',
      },
      Saturday: {
        startTime: '',
        endTime: '',
      },
      Sunday: {
        startTime: '',
        endTime: '',
      },
    },
  })

  const [checkedState, setCheckedState] = useState([
    { name: 'Monday', display: '' },
    { name: 'Tuesday', display: '' },
    { name: 'Wednesday', display: '' },
    { name: 'Thursday', display: '' },
    { name: 'Friday', display: '' },
    { name: 'Saturday', display: 'none' },
    { name: 'Sunday', display: 'none' },
  ])

  let newNotification = {
    style: '',
    heading: '',
    body: '',
  }
  const [notification, setNotification] = useState(newNotification)

  const createNotification = (style: string, heading: string, body = '') => {
    newNotification = {
      style: style,
      heading: heading,
      body: body,
    }

    setNotification(newNotification)
  }

  const handleOnChange = (position: number) => {
    const updatedCheckedState = checkedState.map(({ name, display }, index) => {
      if (index === position) {
        return { name, display: display ? '' : 'none' }
      } else {
        return { name, display }
      }
    })

    setCheckedState(updatedCheckedState)
  }

  const onSubmit = async (data: WeeklyHoursFormValues) => {
    checkedState.map(({ name, display }) => {
      if (display === 'none') {
        Object.entries(data).map((day) => {
          if (day[0] === name) {
            day[1].startTime = ''
            day[1].endTime = ''
          }
        })
      }
    })

    let error = false
    Object.keys(data).forEach((day: string) => {
      if (
        !data[day as keyof WeeklyHoursFormValues].startTime !==
        !data[day as keyof WeeklyHoursFormValues].endTime
      ) {
        Object.keys(data[day as keyof WeeklyHoursFormValues]).forEach(
          (time) => {
            !data[day as keyof WeeklyHoursFormValues][
              time as keyof TimePeriod
            ] &&
              setError(
                `${day as keyof WeeklyHoursFormValues}.${
                  time as keyof TimePeriod
                }`,
                {
                  type: 'required',
                  message: `${
                    time === 'startTime' ? 'A start' : 'An end'
                  } time is needed for the given ${
                    time === 'startTime' ? 'end' : 'start'
                  } time`,
                }
              )
            error = true
          }
        )
      } else if (
        data[day as keyof WeeklyHoursFormValues].startTime >
        data[day as keyof WeeklyHoursFormValues].endTime
      ) {
        setError(`${day as keyof WeeklyHoursFormValues}.endTime`, {
          type: 'required',
          message: 'The start time must be before the end time',
        })
        error = true
      }
    })

    if (error) {
      return
    }

    try {
      await eventService.setWorkingHours('/set-working-hours', { data })
      createNotification('success', 'Working hours set')
    } catch (error) {
      createNotification(
        'danger',
        '500 Internal Server Error',
        serverErrorMessage
      )
    }
  }

  return (
    <div>
      <Notification notification={notification} />
      {checkedState.map(({ name, display }, index) => (
        <span key={name} className="weekDays-selector">
          <input
            id={name}
            type="checkbox"
            className="weekday"
            checked={display ? false : true}
            onChange={() => handleOnChange(index)}
          />
          <label htmlFor={name}>{name.slice(0, 1)}</label>
        </span>
      ))}

      <Form onSubmit={handleSubmit(onSubmit)}>
        {checkedState.map(({ name, display }) => (
          <WorkDayForm
            key={name}
            day={name}
            display={display}
            register={register}
            error={errors[name as keyof WeeklyHoursFormValues]}
          />
        ))}

        <Button
          id="save"
          type="submit"
          /* disabled={submitDisabled} */
          /* style={margin} */
        >
          Save
        </Button>
      </Form>
    </div>
  )
}

export default WorkingHoursForm

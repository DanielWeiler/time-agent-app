import { TextField } from '@mui/material'
import React from 'react'

const WeekDayForm = (props: {
  day: string
  display: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any
}) => {
  const { day, display, register, error } = props

  return (
    <div style={{ display: display }}>
      <label id="dayName">{day}</label>
      <TextField id="startTime" type="time" {...register(`${day}.startTime`)} />
      <TextField id="endTime" type="time" {...register(`${day}.endTime`)} />
      <p style={{ color: 'red' }}>
        {error?.startTime?.message || error?.endTime?.message}
      </p>
    </div>
  )
}
export default WeekDayForm

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clockLabel, messageClock, formatSmartTime, formatFullTime } from '../src/client/text.js'

// A time in the machine's own zone, some days back, so the test does not depend on the zone.
const at = (daysAgo, hour, minute, second = 0) => {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo, hour, minute, second).getTime()
}
const clockOf = ms => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

test('a message shows the clock today, and the day it came in before that', () => {
  const today = at(0, 14, 5)
  assert.equal(messageClock(today), clockOf(today))
  const yesterday = at(1, 9, 3)
  assert.equal(messageClock(yesterday), `Yesterday ${clockOf(yesterday)}`)
  const older = at(5, 9, 3)
  const date = new Date(older)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
  assert.equal(messageClock(older), `${day} ${clockOf(older)}`)
  // The hover title always names the day.
  assert.equal(clockLabel(today), `Today ${clockOf(today)}`)
  assert.equal(clockLabel(yesterday), `Yesterday ${clockOf(yesterday)}`)
  assert.equal(clockLabel(older), messageClock(older))
})

test('formatSmartTime formats today as HH:mm and earlier as MM-DD HH:mm', () => {
  const today = at(0, 14, 5)
  assert.equal(formatSmartTime(today), '14:05')
  const yesterday = at(1, 9, 3)
  const d = new Date(yesterday)
  const pad = n => String(n).padStart(2, '0')
  assert.equal(formatSmartTime(yesterday), `${pad(d.getMonth() + 1)}-${pad(d.getDate())} 09:03`)
})

test('formatFullTime formats timestamp as YYYY-MM-DD HH:mm:ss', () => {
  const time = at(0, 14, 5, 27)
  const d = new Date(time)
  const pad = n => String(n).padStart(2, '0')
  const expected = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 14:05:27`
  assert.equal(formatFullTime(time), expected)
  assert.equal(formatFullTime(undefined), undefined)
})

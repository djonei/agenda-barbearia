import { TIMEZONE, MIN_ADVANCE_HOURS } from './constants'
import type { BarberSchedule, Appointment, BlockedSlot, TimeSlot } from './types'

/**
 * Returns current date/time in São Paulo timezone
 */
export function nowInSaoPaulo(): Date {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: TIMEZONE })
  )
}

/**
 * Formats a date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Converts HH:MM time to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Converts minutes since midnight to HH:MM
 */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Checks if two time ranges overlap
 */
function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && endA > startB
}

/**
 * Calculates available time slots for a barber on a specific date.
 *
 * A slot is available if:
 * 1. It falls within working hours (barber_schedules)
 * 2. No active appointment conflicts
 * 3. No blocked slot conflicts
 * 4. The full service duration fits within available time
 * 5. It respects minimum advance time (for client bookings)
 */
export function calculateAvailableSlots(
  date: string,
  schedule: BarberSchedule | null,
  appointments: Appointment[],
  blockedSlots: BlockedSlot[],
  serviceDurationMinutes: number,
  isBarberBooking: boolean = false
): TimeSlot[] {
  if (!schedule || !schedule.active) return []

  const slotDuration = schedule.slot_duration_minutes
  const schedStart = timeToMinutes(schedule.start_time)
  const schedEnd = timeToMinutes(schedule.end_time)

  // Calculate the minimum start time based on current time + advance
  const now = nowInSaoPaulo()
  const today = formatDate(now)
  let minStartMinutes = 0

  if (date === today && !isBarberBooking) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    minStartMinutes = currentMinutes + MIN_ADVANCE_HOURS * 60
  }

  // Active appointments for this date
  const activeAppointments = appointments.filter(
    (a) => a.status === 'active'
  )

  // Generate all possible slot start times
  const slots: TimeSlot[] = []

  for (let startMin = schedStart; startMin + serviceDurationMinutes <= schedEnd; startMin += slotDuration) {
    const endMin = startMin + serviceDurationMinutes
    const time = minutesToTime(startMin)

    // Check if slot is in the past (with advance time)
    if (date < today) {
      slots.push({ time, available: false })
      continue
    }

    if (startMin < minStartMinutes) {
      slots.push({ time, available: false })
      continue
    }

    // Check appointment conflicts
    const hasAppointmentConflict = activeAppointments.some((apt) => {
      const aptStart = timeToMinutes(apt.start_time)
      const aptEnd = timeToMinutes(apt.end_time)
      return rangesOverlap(startMin, endMin, aptStart, aptEnd)
    })

    if (hasAppointmentConflict) {
      slots.push({ time, available: false })
      continue
    }

    // Check blocked slot conflicts
    const hasBlockedConflict = blockedSlots.some((bs) => {
      const bsStart = timeToMinutes(bs.start_time)
      const bsEnd = timeToMinutes(bs.end_time)
      return rangesOverlap(startMin, endMin, bsStart, bsEnd)
    })

    if (hasBlockedConflict) {
      slots.push({ time, available: false })
      continue
    }

    slots.push({ time, available: true })
  }

  return slots
}

/**
 * Returns dates in a month that have any schedule configured (for the calendar)
 */
export function getDaysWithSchedule(
  year: number,
  month: number,
  schedules: BarberSchedule[]
): Set<number> {
  const activeDays = new Set(
    schedules.filter((s) => s.active).map((s) => s.day_of_week)
  )

  const result = new Set<number>()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dow = date.getDay()
    if (activeDays.has(dow)) {
      result.add(day)
    }
  }

  return result
}

/**
 * Formats price in BRL
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price)
}

/**
 * Formats date for display
 */
export function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export interface Barber {
  id: string
  name: string
  slug: string | null
  email: string
  avatar_url: string | null
  created_at: string
}

export interface Service {
  id: string
  barber_id: string
  name: string
  duration_minutes: number
  price: number
  active: boolean
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  avatar_url: string | null
}

export interface BarberSchedule {
  id: string
  barber_id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
  active: boolean
  morning_active: boolean
  morning_start: string
  morning_end: string
  afternoon_active: boolean
  afternoon_start: string
  afternoon_end: string
}

export interface BlockedSlot {
  id: string
  barber_id: string
  date: string
  start_time: string
  end_time: string
  reason: string | null
  all_day: boolean
}

export interface Appointment {
  id: string
  barber_id: string
  client_id: string | null
  client_name: string | null
  client_phone: string | null
  service_id: string
  date: string
  start_time: string
  end_time: string
  status: 'active' | 'cancelled'
  created_by: 'client' | 'barber'
  cancelled_by: 'client' | 'barber' | null
  created_at: string
  // Joined fields
  service?: Service
  barber?: Barber
  client?: Client | null
}

export interface TimeSlot {
  time: string // HH:MM format
  available: boolean
}

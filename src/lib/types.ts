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

export interface BarberSchedule {
  id: string
  barber_id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
  active: boolean
}

export interface BlockedSlot {
  id: string
  barber_id: string
  date: string
  start_time: string
  end_time: string
  reason: string | null
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
  created_at: string
  // Joined fields
  service?: Service
  barber?: Barber
}

export interface TimeSlot {
  time: string // HH:MM format
  available: boolean
}

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Barber, Service, BarberSchedule } from '@/lib/types'
import BookingFlow from './booking-flow'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function AgendarBarberPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: barber } = await supabase
    .from('barbers')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!barber) notFound()

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('barber_id', barber.id)
    .eq('active', true)
    .order('price')

  const { data: schedules } = await supabase
    .from('barber_schedules')
    .select('*')
    .eq('barber_id', barber.id)
    .eq('active', true)

  return (
    <BookingFlow
      barber={barber as Barber}
      services={(services || []) as Service[]}
      schedules={(schedules || []) as BarberSchedule[]}
    />
  )
}

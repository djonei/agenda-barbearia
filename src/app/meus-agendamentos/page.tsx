import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Appointment } from '@/lib/types'
import AppointmentsList from './appointments-list'

export default async function MeusAgendamentosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, service:services(*), barber:barbers(*)')
    .eq('client_id', user.id)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })

  return (
    <AppointmentsList appointments={(appointments || []) as Appointment[]} />
  )
}

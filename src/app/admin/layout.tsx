import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Barber } from '@/lib/types'
import AdminShell from './admin-shell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if user is a barber
  const { data: barber } = await supabase
    .from('barbers')
    .select('*')
    .eq('email', user.email)
    .single()

  if (!barber) {
    // Not a barber — access denied
    redirect('/acesso-negado')
  }

  // Get all barbers for the admin panel
  const { data: allBarbers } = await supabase
    .from('barbers')
    .select('*')
    .not('slug', 'is', null)
    .order('name')

  return (
    <AdminShell
      currentBarber={barber as Barber}
      barbers={(allBarbers || []) as Barber[]}
    >
      {children}
    </AdminShell>
  )
}

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/agendar'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if the authenticated user is a barber
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user?.email) {
        const { data: barber } = await supabase
          .from('barbers')
          .select('id')
          .eq('email', user.email)
          .single()

        if (barber) {
          // Ensure client record doesn't get created for barbers
          return NextResponse.redirect(`${origin}/admin/agenda`)
        }

        // Upsert client record for regular users
        await supabase.from('clients').upsert(
          {
            id: user.id,
            name: user.user_metadata?.full_name || user.email,
            email: user.email,
            avatar_url: user.user_metadata?.avatar_url || null,
          },
          { onConflict: 'id' }
        )
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}

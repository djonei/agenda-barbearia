import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  if (errorParam) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const cookieStore = await cookies()
  const storedState = cookieStore.get('oauth_state')?.value
  const next = cookieStore.get('oauth_next')?.value || '/agendar'

  // Limpa cookies de estado
  cookieStore.delete('oauth_state')
  cookieStore.delete('oauth_next')

  // Proteção CSRF: verifica se o state bate
  if (!state || state !== storedState) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  // Troca o code pelo id_token do Google
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenResponse.ok) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const { id_token } = await tokenResponse.json()

  if (!id_token) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  // Cria sessão Supabase a partir do id_token do Google
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: id_token,
  })

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (user?.email) {
    const { data: barber } = await supabase
      .from('barbers')
      .select('id')
      .eq('email', user.email)
      .single()

    if (barber) {
      return NextResponse.redirect(`${origin}/admin/agenda`)
    }

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

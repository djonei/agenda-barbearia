'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface UserInfo {
  name: string
  email: string
  avatarUrl: string | null
}

interface Props {
  isBarber?: boolean
}

export default function UserMenu({ isBarber = false }: Props) {
  const supabase = createClient()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (u) {
        const meta = (u.user_metadata || {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string }
        setUser({
          name: meta.full_name || meta.name || u.email?.split('@')[0] || 'Cliente',
          email: u.email || '',
          avatarUrl: meta.avatar_url || meta.picture || null,
        })
      }
      setLoading(false)
    })
  }, [supabase.auth])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleLogout() {
    setOpen(false)
    await supabase.auth.signOut()
    window.location.reload()
  }

  if (loading) {
    return <div className="w-20 h-9" />
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-sm font-medium px-4 py-2 rounded-xl"
        style={{ color: 'var(--color-green-light)', border: '1px solid var(--color-border)' }}
      >
        Entrar
      </Link>
    )
  }

  const firstName = user.name.split(' ')[0]
  const initial = user.name.charAt(0).toUpperCase()

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
          style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <div
            className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ border: '1px solid var(--color-green-primary)', backgroundColor: '#1e1e1e', color: 'var(--color-green-light)' }}
          >
            {user.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.name} width={28} height={28} className="rounded-full object-cover w-full h-full" />
            ) : (
              initial
            )}
          </div>
          <span className="text-sm font-medium max-w-[100px] truncate" style={{ color: 'var(--color-white)' }}>
            {firstName}
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--color-gray)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-2 w-60 rounded-xl p-3 shadow-xl z-50"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-3 pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div
                className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ border: '2px solid var(--color-green-primary)', backgroundColor: '#1e1e1e', color: 'var(--color-green-light)' }}
              >
                {user.avatarUrl ? (
                  <Image src={user.avatarUrl} alt={user.name} width={40} height={40} className="rounded-full object-cover w-full h-full" />
                ) : (
                  initial
                )}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-white)' }}>
                  {user.name}
                </p>
                <p className="text-[11px] truncate" style={{ color: 'var(--color-gray)' }}>
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-2 text-left text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-2"
              style={{ color: 'var(--color-error)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sair
            </button>
          </div>
        )}
      </div>

      {/* Secondary link: admin panel for barbers, appointments for clients */}
      {isBarber ? (
        <Link
          href="/admin/agenda"
          className="text-xs font-medium hover:underline"
          style={{ color: 'var(--color-green-light)' }}
        >
          Administrativo
        </Link>
      ) : (
        <Link
          href="/meus-agendamentos"
          className="text-xs font-medium hover:underline"
          style={{ color: 'var(--color-green-light)' }}
        >
          Meus agendamentos
        </Link>
      )}
    </div>
  )
}

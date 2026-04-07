'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Barber } from '@/lib/types'

interface Props {
  currentBarber: Barber
  barbers: Barber[]
  children: React.ReactNode
}

const NAV_ITEMS = [
  { href: '/admin/agenda', label: 'Agenda', icon: CalendarIcon },
  { href: '/admin/servicos', label: 'Serviços', icon: ScissorsIcon },
  { href: '/admin/configuracoes', label: 'Config', icon: SettingsIcon },
]

export default function AdminShell({ currentBarber, children }: Props) {
  const pathname = usePathname()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-dvh flex" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col w-60 fixed top-0 left-0 h-full z-20"
        style={{ backgroundColor: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}
      >
        {/* Logo */}
        <div className="p-5 flex items-center justify-center" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Image
            src="/logo-barbearia.png"
            alt="Barbearia Brusquense"
            width={120}
            height={50}
            className="object-contain"
            onError={undefined}
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isActive ? 'rgba(45,122,58,0.15)' : 'transparent',
                  color: isActive ? 'var(--color-green-light)' : 'var(--color-gray)',
                }}
              >
                <item.icon active={isActive} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Barber info + logout */}
        <div className="p-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden"
              style={{ border: '2px solid var(--color-green-primary)', backgroundColor: '#1e1e1e', color: 'var(--color-green-light)' }}
            >
              {currentBarber.avatar_url ? (
                <Image src={currentBarber.avatar_url} alt={currentBarber.name} width={36} height={36} className="rounded-full object-cover w-full h-full" />
              ) : (
                currentBarber.name.charAt(0)
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--color-white)' }}>
                {currentBarber.name}
              </p>
              <p className="text-[10px] truncate" style={{ color: 'var(--color-gray)' }}>
                {currentBarber.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-xs py-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-gray)', border: '1px solid var(--color-border)' }}
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-60 pb-20 md:pb-0">
        {/* Mobile top bar */}
        <header
          className="md:hidden sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden"
              style={{ border: '2px solid var(--color-green-primary)', backgroundColor: '#1e1e1e', color: 'var(--color-green-light)' }}
            >
              {currentBarber.avatar_url ? (
                <Image src={currentBarber.avatar_url} alt={currentBarber.name} width={32} height={32} className="rounded-full object-cover w-full h-full" />
              ) : (
                currentBarber.name.charAt(0)
              )}
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--color-white)' }}>
              {currentBarber.name}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--color-gray)', border: '1px solid var(--color-border)' }}
          >
            Sair
          </button>
        </header>

        {children}
      </div>

      {/* Mobile Bottom Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around py-2"
        style={{ backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-4 py-1 min-w-[64px]"
            >
              <item.icon active={isActive} />
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? 'var(--color-green-light)' : 'var(--color-gray)' }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

/* --- Icons --- */

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke={active ? 'var(--color-green-light)' : 'var(--color-gray)'}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function ScissorsIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke={active ? 'var(--color-green-light)' : 'var(--color-gray)'}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  )
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke={active ? 'var(--color-green-light)' : 'var(--color-gray)'}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

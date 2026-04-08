'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Barber, Service } from '@/lib/types'
import { formatPrice } from '@/lib/slots'

interface Props {
  barber: Barber
  services: Service[]
}

export default function BarberCard({ barber, services }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Avatar + Name */}
      <div
        className="flex items-center gap-4 cursor-pointer sm:cursor-default"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden flex-shrink-0"
          style={{
            border: '2px solid var(--color-green-primary)',
            backgroundColor: '#1e1e1e',
            color: 'var(--color-green-light)',
          }}
        >
          {barber.avatar_url ? (
            <Image
              src={barber.avatar_url}
              alt={barber.name}
              width={64}
              height={64}
              className="rounded-full object-cover w-full h-full"
            />
          ) : (
            barber.name.charAt(0)
          )}
        </div>
        <div className="flex-1">
          <h2
            className="text-2xl tracking-wide"
            style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
          >
            {barber.name}
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-gray)' }}>
            {services.length} serviço{services.length !== 1 ? 's' : ''} disponíve{services.length !== 1 ? 'is' : 'l'}
          </p>
        </div>
        {/* Chevron — mobile only */}
        <div
          className="sm:hidden flex-shrink-0 transition-transform duration-200"
          style={{
            color: 'var(--color-gray)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Services + CTA — always visible on desktop, collapsible on mobile */}
      <div className={`sm:block mt-5 ${expanded ? 'block' : 'hidden'}`}>
        <div className="flex flex-col gap-2">
          {services.map((service) => (
            <Link
              key={service.id}
              href={`/agendar/${barber.slug}?service=${service.id}`}
              className="flex items-center justify-between text-sm px-3 py-2 rounded-lg transition-colors hover:brightness-125"
              style={{ backgroundColor: '#1a1a1a' }}
            >
              <div className="flex flex-col">
                <span style={{ color: 'var(--color-white)' }}>{service.name}</span>
                <span className="text-[10px]" style={{ color: 'var(--color-gray)' }}>
                  {service.duration_minutes} min
                </span>
              </div>
              <span style={{ color: 'var(--color-green-light)' }}>
                {formatPrice(service.price)}
              </span>
            </Link>
          ))}
        </div>

        <Link
          href={`/agendar/${barber.slug}`}
          className="mt-5 block text-center py-3 rounded-xl text-sm font-semibold transition-all hover:brightness-110"
          style={{ backgroundColor: 'var(--color-green-primary)', color: 'var(--color-white)' }}
        >
          Agendar com {barber.name}
        </Link>
      </div>
    </div>
  )
}

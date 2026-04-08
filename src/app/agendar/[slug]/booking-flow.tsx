'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { calculateAvailableSlots, formatPrice, formatDateDisplay, formatDate, nowInSaoPaulo, getDaysWithSchedule } from '@/lib/slots'
import { MONTH_NAMES, DAY_NAMES_SHORT, MAX_BOOKING_DAYS } from '@/lib/constants'
import type { Barber, Service, BarberSchedule, Appointment, BlockedSlot, TimeSlot } from '@/lib/types'

type Step = 1 | 2 | 3 | 4

interface Props {
  barber: Barber
  services: Service[]
  schedules: BarberSchedule[]
}

export default function BookingFlow({ barber, services, schedules }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const storageKey = `booking_pending_${barber.id}`

  const [step, setStep] = useState<Step>(1)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [pendingRestore, setPendingRestore] = useState(false)

  // Preselect service from ?service= query param
  useEffect(() => {
    const serviceId = searchParams.get('service')
    if (!serviceId) return
    const svc = services.find((s) => s.id === serviceId)
    if (svc) {
      setSelectedService(svc)
      setStep(2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Restore pending booking from sessionStorage (after login redirect)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = sessionStorage.getItem(storageKey)
    if (!raw) return
    try {
      const data = JSON.parse(raw) as { serviceId: string; date: string; time: string }
      const svc = services.find((s) => s.id === data.serviceId)
      if (svc && data.date && data.time) {
        setSelectedService(svc)
        setSelectedDate(data.date)
        setSelectedTime(data.time)
        setStep(4)
        setPendingRestore(true)
      }
    } catch {}
  }, [storageKey, services])

  // Calendar state
  const now = nowInSaoPaulo()
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [calYear, setCalYear] = useState(now.getFullYear())

  // Slots state
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Confirm state
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auth state
  const [userId, setUserId] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
      setCheckingAuth(false)
    })
  }, [supabase.auth])

  // Days with schedule for calendar
  const scheduledDays = getDaysWithSchedule(calYear, calMonth, schedules)

  // Max date
  const maxDate = new Date(now)
  maxDate.setDate(maxDate.getDate() + MAX_BOOKING_DAYS)

  // Fetch slots when date changes
  const fetchSlots = useCallback(async () => {
    if (!selectedDate || !selectedService) return

    setLoadingSlots(true)
    const dateObj = new Date(selectedDate + 'T12:00:00')
    const dow = dateObj.getDay()
    const schedule = schedules.find((s) => s.day_of_week === dow && s.active) || null

    // Fetch appointments for this date
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('barber_id', barber.id)
      .eq('date', selectedDate)

    // Fetch blocked slots for this date
    const { data: blocked } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('barber_id', barber.id)
      .eq('date', selectedDate)

    const available = calculateAvailableSlots(
      selectedDate,
      schedule,
      (appointments || []) as Appointment[],
      (blocked || []) as BlockedSlot[],
      selectedService.duration_minutes
    )

    setSlots(available)
    setLoadingSlots(false)
  }, [selectedDate, selectedService, barber.id, schedules, supabase])

  useEffect(() => {
    if (selectedDate && selectedService) fetchSlots()
  }, [selectedDate, selectedService, fetchSlots])

  // Step handlers
  function selectService(service: Service) {
    setSelectedService(service)
    setSelectedDate(null)
    setSelectedTime(null)
    setStep(2)
  }

  function selectDate(dateStr: string) {
    setSelectedDate(dateStr)
    setSelectedTime(null)
    setStep(3)
  }

  function selectTime(time: string) {
    setSelectedTime(time)
    setStep(4)
  }

  function goToStep(s: Step) {
    if (s < step) {
      if (s <= 1) { setSelectedService(null); setSelectedDate(null); setSelectedTime(null) }
      if (s <= 2) { setSelectedDate(null); setSelectedTime(null) }
      if (s <= 3) { setSelectedTime(null) }
      setStep(s)
    }
  }

  async function confirmBooking() {
    if (!selectedService || !selectedDate || !selectedTime || !userId) return

    setConfirming(true)
    setError(null)

    // Calculate end time
    const [h, m] = selectedTime.split(':').map(Number)
    const endMinutes = h * 60 + m + selectedService.duration_minutes
    const endH = Math.floor(endMinutes / 60)
    const endM = endMinutes % 60
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`

    const { error: insertError } = await supabase.from('appointments').insert({
      barber_id: barber.id,
      client_id: userId,
      service_id: selectedService.id,
      date: selectedDate,
      start_time: selectedTime,
      end_time: endTime,
      status: 'active',
      created_by: 'client',
    })

    if (insertError) {
      setError('Erro ao confirmar agendamento. Tente novamente.')
      setConfirming(false)
      return
    }

    sessionStorage.removeItem(storageKey)
    router.push('/meus-agendamentos?sucesso=1')
  }

  // Auto-confirm after login redirect
  useEffect(() => {
    if (pendingRestore && userId && !confirming && selectedService && selectedDate && selectedTime) {
      setPendingRestore(false)
      confirmBooking()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRestore, userId])

  // Calendar navigation limits
  const canPrevMonth = calYear > now.getFullYear() || calMonth > now.getMonth()
  const canNextMonth =
    new Date(calYear, calMonth + 1, 1) <= new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 1)

  return (
    <main className="min-h-dvh">
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <Link href="/agendar" className="p-2 -ml-2" style={{ color: 'var(--color-gray)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0"
          style={{ border: '2px solid var(--color-green-primary)', backgroundColor: '#1e1e1e', color: 'var(--color-green-light)' }}
        >
          {barber.avatar_url ? (
            <Image src={barber.avatar_url} alt={barber.name} width={40} height={40} className="rounded-full object-cover w-full h-full" />
          ) : (
            barber.name.charAt(0)
          )}
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-white)' }}>{barber.name}</p>
          <p className="text-xs" style={{ color: 'var(--color-gray)' }}>Barbearia Brusquense</p>
        </div>
      </header>

      {/* Step indicator */}
      <div className="px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-start">
          {(['Serviço', 'Data', 'Horário', 'Confirmar'] as const).map((label, idx) => {
            const s = idx + 1
            return (
              <div key={s} className="flex items-start flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => goToStep(s as Step)}
                    disabled={s > step}
                    className="w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-colors flex-shrink-0"
                    style={{
                      backgroundColor: s <= step ? 'var(--color-green-primary)' : '#1e1e1e',
                      color: s <= step ? 'var(--color-white)' : 'var(--color-gray)',
                      cursor: s < step ? 'pointer' : s === step ? 'default' : 'not-allowed',
                    }}
                  >
                    {s < step ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      s
                    )}
                  </button>
                  <span className="text-[10px] mt-1 text-center" style={{ color: s <= step ? 'var(--color-green-light)' : 'var(--color-gray)' }}>
                    {label}
                  </span>
                </div>
                {idx < 3 && (
                  <div className="flex-1 h-0.5 mt-4 mx-1" style={{ backgroundColor: s < step ? 'var(--color-green-primary)' : 'var(--color-border)' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-12 max-w-lg mx-auto">

        {/* Step 1: Service */}
        {step === 1 && (
          <div>
            <h2
              className="text-3xl mb-4 tracking-wide"
              style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
            >
              Escolha o serviço
            </h2>
            <div className="flex flex-col gap-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => selectService(service)}
                  className="w-full text-left rounded-xl p-4 transition-all hover:scale-[1.01]"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold" style={{ color: 'var(--color-white)' }}>
                      {service.name}
                    </span>
                    <span className="font-bold" style={{ color: 'var(--color-green-light)' }}>
                      {formatPrice(service.price)}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--color-gray)' }}>
                    {service.duration_minutes} minutos
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Date */}
        {step === 2 && selectedService && (
          <div>
            <h2
              className="text-3xl mb-1 tracking-wide"
              style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
            >
              Escolha a data
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-gray)' }}>
              {selectedService.name} — {formatPrice(selectedService.price)}
            </p>

            {/* Calendar */}
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) }
                    else setCalMonth(calMonth - 1)
                  }}
                  disabled={!canPrevMonth}
                  className="p-2 disabled:opacity-30"
                  style={{ color: 'var(--color-white)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <span className="text-sm font-semibold" style={{ color: 'var(--color-white)' }}>
                  {MONTH_NAMES[calMonth]} {calYear}
                </span>
                <button
                  onClick={() => {
                    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) }
                    else setCalMonth(calMonth + 1)
                  }}
                  disabled={!canNextMonth}
                  className="p-2 disabled:opacity-30"
                  style={{ color: 'var(--color-white)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>

              {/* Day labels */}
              <div className="grid grid-cols-7 mb-2">
                {DAY_NAMES_SHORT.map((d) => (
                  <div key={d} className="text-center text-[10px] font-medium py-1" style={{ color: 'var(--color-gray)' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <CalendarGrid
                year={calYear}
                month={calMonth}
                scheduledDays={scheduledDays}
                today={formatDate(now)}
                maxDate={formatDate(maxDate)}
                selectedDate={selectedDate}
                onSelectDate={selectDate}
              />
            </div>
          </div>
        )}

        {/* Step 3: Time */}
        {step === 3 && selectedService && selectedDate && (
          <div>
            <h2
              className="text-3xl mb-1 tracking-wide"
              style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
            >
              Escolha o horário
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-gray)' }}>
              {selectedService.name} — {formatDateDisplay(selectedDate)}
            </p>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-16">
                <span className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : slots.filter(s => s.available).length === 0 ? (
              <div
                className="rounded-xl p-6 text-center text-sm"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-gray)' }}
              >
                Nenhum horário disponível nesta data. Escolha outra data.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && selectTime(slot.time)}
                    disabled={!slot.available}
                    className="py-3 rounded-xl text-sm font-medium transition-all min-h-[48px]"
                    style={{
                      backgroundColor: selectedTime === slot.time
                        ? 'var(--color-green-primary)'
                        : slot.available
                          ? 'var(--color-surface)'
                          : '#111',
                      border: `1px solid ${slot.available ? 'var(--color-green-primary)' : 'var(--color-border)'}`,
                      color: slot.available ? 'var(--color-white)' : '#444',
                      cursor: slot.available ? 'pointer' : 'not-allowed',
                      opacity: slot.available ? 1 : 0.4,
                    }}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && selectedService && selectedDate && selectedTime && (
          <div>
            <h2
              className="text-3xl mb-4 tracking-wide"
              style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
            >
              Confirme seu agendamento
            </h2>

            <div
              className="rounded-xl p-5 flex flex-col gap-4"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <SummaryRow label="Barbeiro" value={barber.name} />
              <SummaryRow label="Serviço" value={selectedService.name} />
              <SummaryRow label="Data" value={formatDateDisplay(selectedDate)} />
              <SummaryRow label="Horário" value={selectedTime} />
              <SummaryRow label="Duração" value={`${selectedService.duration_minutes} min`} />
              <div className="h-px" style={{ backgroundColor: 'var(--color-border)' }} />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: 'var(--color-gray)' }}>Total</span>
                <span className="text-xl font-bold" style={{ color: 'var(--color-green-light)' }}>
                  {formatPrice(selectedService.price)}
                </span>
              </div>
            </div>

            {error && (
              <div
                className="mt-4 rounded-lg px-4 py-3 text-sm"
                style={{ backgroundColor: '#3a1a1a', color: 'var(--color-error)', border: '1px solid var(--color-error)' }}
              >
                {error}
              </div>
            )}

            {checkingAuth ? (
              <div className="mt-6 flex justify-center">
                <span className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !userId ? (
              <div className="mt-6">
                <p className="text-sm text-center mb-3" style={{ color: 'var(--color-gray)' }}>
                  Você precisa estar logado para confirmar o agendamento.
                </p>
                <Link
                  href={`/login?next=/agendar/${barber.slug}`}
                  onClick={() => {
                    if (selectedService && selectedDate && selectedTime) {
                      sessionStorage.setItem(storageKey, JSON.stringify({
                        serviceId: selectedService.id,
                        date: selectedDate,
                        time: selectedTime,
                      }))
                    }
                  }}
                  className="block w-full text-center rounded-xl py-3 text-sm font-semibold min-h-[48px] leading-[48px]"
                  style={{ backgroundColor: 'var(--color-green-primary)', color: 'var(--color-white)' }}
                >
                  Fazer login para confirmar
                </Link>
              </div>
            ) : (
              <button
                onClick={confirmBooking}
                disabled={confirming}
                className="w-full mt-6 rounded-xl py-3 text-sm font-semibold transition-colors min-h-[48px] disabled:opacity-60"
                style={{ backgroundColor: 'var(--color-green-primary)', color: 'var(--color-white)' }}
              >
                {confirming ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Confirmando...
                  </span>
                ) : (
                  'Confirmar agendamento'
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

/* ---------- Sub-components ---------- */

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--color-gray)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--color-white)' }}>{value}</span>
    </div>
  )
}

function CalendarGrid({
  year,
  month,
  scheduledDays,
  today,
  maxDate,
  selectedDate,
  onSelectDate,
}: {
  year: number
  month: number
  scheduledDays: Set<number>
  today: string
  maxDate: string
  selectedDate: string | null
  onSelectDate: (date: string) => void
}) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="grid grid-cols-7 gap-1">
      {cells.map((day, i) => {
        if (day === null) return <div key={`empty-${i}`} />

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const hasSchedule = scheduledDays.has(day)
        const isPast = dateStr < today
        const isBeyondMax = dateStr > maxDate
        const isSelected = dateStr === selectedDate
        const isToday = dateStr === today
        const isAvailable = hasSchedule && !isPast && !isBeyondMax

        return (
          <button
            key={dateStr}
            onClick={() => isAvailable && onSelectDate(dateStr)}
            disabled={!isAvailable}
            className="aspect-square flex items-center justify-center rounded-lg text-sm transition-all relative"
            style={{
              backgroundColor: isSelected
                ? 'var(--color-green-primary)'
                : 'transparent',
              color: isSelected
                ? 'var(--color-white)'
                : isAvailable
                  ? 'var(--color-white)'
                  : '#333',
              cursor: isAvailable ? 'pointer' : 'default',
              fontWeight: isToday ? 700 : 400,
            }}
          >
            {day}
            {isToday && !isSelected && (
              <span
                className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                style={{ backgroundColor: 'var(--color-green-light)' }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

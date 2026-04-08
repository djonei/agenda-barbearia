'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { formatDate, nowInSaoPaulo, formatPrice } from '@/lib/slots'
import { DAY_NAMES_SHORT, DAY_NAMES } from '@/lib/constants'
import type { Barber, Service, BarberSchedule, Appointment, BlockedSlot } from '@/lib/types'

type ViewMode = 'day' | 'week'
type BarberFilter = 'all' | string // 'all' or barber slug

interface ManualBooking {
  barberId: string
  time: string
  date: string
}

export default function AgendaPage() {
  const supabase = createClient()
  const today = nowInSaoPaulo()

  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(formatDate(today))
  const [filter, setFilter] = useState<BarberFilter>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_barber_filter') || 'all'
    }
    return 'all'
  })

  const [barbers, setBarbers] = useState<Barber[]>([])
  const [schedules, setSchedules] = useState<BarberSchedule[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [manualBooking, setManualBooking] = useState<ManualBooking | null>(null)
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null)

  // Save filter to localStorage
  useEffect(() => {
    localStorage.setItem('admin_barber_filter', filter)
  }, [filter])

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)

    const [barbersRes, schedulesRes, servicesRes] = await Promise.all([
      supabase.from('barbers').select('*').not('slug', 'is', null).order('name'),
      supabase.from('barber_schedules').select('*'),
      supabase.from('services').select('*').eq('active', true),
    ])

    setBarbers((barbersRes.data || []) as Barber[])
    setSchedules((schedulesRes.data || []) as BarberSchedule[])
    setServices((servicesRes.data || []) as Service[])

    await fetchAppointments(currentDate, viewMode)
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAppointments = useCallback(async (date: string, mode: ViewMode) => {
    let startDate = date
    let endDate = date

    if (mode === 'week') {
      const d = new Date(date + 'T12:00:00')
      const dayOfWeek = d.getDay()
      const start = new Date(d)
      start.setDate(d.getDate() - dayOfWeek)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      startDate = formatDate(start)
      endDate = formatDate(end)
    }

    const [aptsRes, blockedRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('*, service:services(*), barber:barbers(*), client:clients(*)')
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('blocked_slots')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate),
    ])

    setAppointments((aptsRes.data || []) as Appointment[])
    setBlockedSlots((blockedRes.data || []) as BlockedSlot[])
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    fetchAppointments(currentDate, viewMode)
  }, [currentDate, viewMode, fetchAppointments])

  // Date nav
  function changeDate(days: number) {
    const d = new Date(currentDate + 'T12:00:00')
    d.setDate(d.getDate() + days)
    setCurrentDate(formatDate(d))
  }

  function goToday() {
    setCurrentDate(formatDate(nowInSaoPaulo()))
  }

  // Filtered barbers
  const filteredBarbers = filter === 'all'
    ? barbers
    : barbers.filter((b) => b.slug === filter)

  // Get display date label
  const dateObj = new Date(currentDate + 'T12:00:00')
  const dateLabel = dateObj.toLocaleDateString('pt-BR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })

  return (
    <div className="px-4 py-4">
      {/* Controls bar */}
      <div className="flex flex-col gap-3 mb-4">
        {/* Filter */}
        <div className="flex items-center gap-2">
          <FilterButton label="Ambos" active={filter === 'all'} onClick={() => setFilter('all')} />
          {barbers.map((b) => (
            <FilterButton key={b.id} label={b.name} active={filter === b.slug} onClick={() => setFilter(b.slug!)} />
          ))}
        </div>

        {/* View mode + date nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('day')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: viewMode === 'day' ? 'var(--color-green-primary)' : 'transparent',
                color: viewMode === 'day' ? 'var(--color-white)' : 'var(--color-gray)',
                border: `1px solid ${viewMode === 'day' ? 'var(--color-green-primary)' : 'var(--color-border)'}`,
              }}
            >
              Dia
            </button>
            <button
              onClick={() => setViewMode('week')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: viewMode === 'week' ? 'var(--color-green-primary)' : 'transparent',
                color: viewMode === 'week' ? 'var(--color-white)' : 'var(--color-gray)',
                border: `1px solid ${viewMode === 'week' ? 'var(--color-green-primary)' : 'var(--color-border)'}`,
              }}
            >
              Semana
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => changeDate(viewMode === 'week' ? -7 : -1)} className="p-1.5" style={{ color: 'var(--color-gray)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button onClick={goToday} className="text-xs font-medium px-2 py-1 rounded" style={{ color: 'var(--color-green-light)' }}>
              Hoje
            </button>
            <span className="text-sm font-medium min-w-[120px] text-center" style={{ color: 'var(--color-white)' }}>
              {dateLabel}
            </span>
            <button onClick={() => changeDate(viewMode === 'week' ? 7 : 1)} className="p-1.5" style={{ color: 'var(--color-gray)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === 'day' ? (
        <DayView
          date={currentDate}
          barbers={filteredBarbers}
          schedules={schedules}
          appointments={appointments}
          blockedSlots={blockedSlots}
          services={services}
          onSlotClick={(barberId, time) => setManualBooking({ barberId, time, date: currentDate })}
          onAppointmentClick={(apt) => setDetailAppointment(apt)}
        />
      ) : (
        <WeekView
          startDate={currentDate}
          barbers={filteredBarbers}
          schedules={schedules}
          appointments={appointments}
          blockedSlots={blockedSlots}
          onAppointmentClick={(apt) => setDetailAppointment(apt)}
        />
      )}

      {/* Manual booking modal */}
      {manualBooking && (
        <ManualBookingModal
          barberId={manualBooking.barberId}
          date={manualBooking.date}
          time={manualBooking.time}
          services={services}
          barbers={barbers}
          onClose={() => setManualBooking(null)}
          onSaved={() => {
            setManualBooking(null)
            fetchAppointments(currentDate, viewMode)
          }}
        />
      )}

      {/* Appointment detail modal */}
      {detailAppointment && (
        <AppointmentDetailModal
          appointment={detailAppointment}
          onClose={() => setDetailAppointment(null)}
          onCancelled={() => {
            setDetailAppointment(null)
            fetchAppointments(currentDate, viewMode)
          }}
        />
      )}
    </div>
  )
}

/* ---------- Filter Button ---------- */

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors min-h-[40px]"
      style={{
        backgroundColor: active ? 'var(--color-green-primary)' : 'transparent',
        color: active ? 'var(--color-white)' : 'var(--color-gray)',
        border: `1px solid ${active ? 'var(--color-green-primary)' : 'var(--color-border)'}`,
      }}
    >
      {label}
    </button>
  )
}

/* ---------- Day View ---------- */

function DayView({
  date,
  barbers,
  schedules,
  appointments,
  blockedSlots,
  services,
  onSlotClick,
  onAppointmentClick,
}: {
  date: string
  barbers: Barber[]
  schedules: BarberSchedule[]
  appointments: Appointment[]
  blockedSlots: BlockedSlot[]
  services: Service[]
  onSlotClick: (barberId: string, time: string) => void
  onAppointmentClick: (apt: Appointment) => void
}) {
  const dateObj = new Date(date + 'T12:00:00')
  const dow = dateObj.getDay()

  const nowSP = nowInSaoPaulo()
  const isToday = date === formatDate(nowSP)
  const currentHour = nowSP.getHours()

  return (
    <div className={`grid gap-2 md:gap-4 ${barbers.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {barbers.map((barber) => {
        const schedule = schedules.find(
          (s) => s.barber_id === barber.id && s.day_of_week === dow && s.active
        )

        if (!schedule) {
          return (
            <div key={barber.id}>
              <BarberColumnHeader name={barber.name} />
              <div
                className="rounded-xl p-6 text-center text-sm mt-2"
                style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-gray)' }}
              >
                Sem expediente neste dia
              </div>
            </div>
          )
        }

        // Generate time slots
        const slots = generateTimeSlots(schedule)
        const barberAppointments = appointments.filter(
          (a) => a.barber_id === barber.id && a.date === date
        )
        const barberBlocked = blockedSlots.filter(
          (b) => b.barber_id === barber.id && b.date === date
        )

        return (
          <div key={barber.id}>
            <BarberColumnHeader name={barber.name} />
            <div className="flex flex-col gap-1 mt-2">
              {slots.map((time) => {
                const apt = barberAppointments.find(
                  (a) => a.start_time.substring(0, 5) === time && a.status === 'active'
                )
                const cancelledApt = barberAppointments.find(
                  (a) => a.start_time.substring(0, 5) === time && a.status === 'cancelled'
                )
                const isBlocked = barberBlocked.some((b) => {
                  const bStart = b.start_time.substring(0, 5)
                  const bEnd = b.end_time.substring(0, 5)
                  return time >= bStart && time < bEnd
                })
                const isCurrentHour = isToday && parseInt(time.split(':')[0]) === currentHour

                if (apt) {
                  return (
                    <button
                      key={time}
                      onClick={() => onAppointmentClick(apt)}
                      className="w-full text-left rounded-lg px-3 flex items-center justify-between gap-2 h-[44px] overflow-hidden transition-colors"
                      style={{
                        backgroundColor: isCurrentHour ? 'rgba(234,179,8,0.18)' : 'rgba(45,122,58,0.2)',
                        border: `1px solid ${isCurrentHour ? 'rgba(234,179,8,0.7)' : 'var(--color-green-primary)'}`,
                      }}
                    >
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono font-bold" style={{ color: 'var(--color-white)' }}>{time}</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-white)' }}>
                          {(apt.client?.name || apt.client_name || 'Cliente').split(' ')[0]}
                        </span>
                      </div>
                      <span className="text-[10px] text-right leading-tight" style={{ color: 'var(--color-gray)' }}>
                        {apt.service?.name}
                      </span>
                    </button>
                  )
                }

                if (isBlocked) {
                  return (
                    <div
                      key={time}
                      className="rounded-lg px-3 flex items-center gap-2 h-[44px]"
                      style={{
                        backgroundColor: isCurrentHour ? 'rgba(234,179,8,0.06)' : '#1a1a1a',
                        border: `1px solid ${isCurrentHour ? 'rgba(234,179,8,0.3)' : 'var(--color-border)'}`,
                      }}
                    >
                      <span className="text-xs font-mono" style={{ color: '#444' }}>{time}</span>
                      <span className="text-xs" style={{ color: '#444' }}>Bloqueado</span>
                    </div>
                  )
                }

                if (cancelledApt) {
                  return (
                    <div
                      key={time}
                      className="w-full rounded-lg flex items-center min-h-[44px] overflow-hidden"
                      style={{ border: `1px solid ${isCurrentHour ? 'rgba(234,179,8,0.3)' : '#3a1a1a'}` }}
                    >
                      {/* Left: cancelled info — click to see details */}
                      <button
                        onClick={() => onAppointmentClick(cancelledApt)}
                        className="flex items-center gap-2 px-3 py-2.5 flex-1 min-w-0"
                        style={{ backgroundColor: isCurrentHour ? 'rgba(234,179,8,0.05)' : '#1a1111' }}
                      >
                        <span className="text-xs font-mono shrink-0" style={{ color: '#666' }}>{time}</span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
                          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                      </button>
                      {/* Divider */}
                      <div className="w-px self-stretch" style={{ backgroundColor: isCurrentHour ? 'rgba(234,179,8,0.3)' : '#3a1a1a' }} />
                      {/* Right: available slot — click to book */}
                      <button
                        onClick={() => onSlotClick(barber.id, time)}
                        className="px-3 py-2.5 text-xs font-medium shrink-0"
                        style={{ backgroundColor: 'var(--color-surface)', color: '#333' }}
                      >
                        Disponível
                      </button>
                    </div>
                  )
                }

                // Free slot
                return (
                  <button
                    key={time}
                    onClick={() => onSlotClick(barber.id, time)}
                    className="w-full text-left rounded-lg px-3 flex items-center gap-2 h-[44px] transition-colors"
                    style={{
                      backgroundColor: isCurrentHour ? 'rgba(234,179,8,0.08)' : 'var(--color-surface)',
                      border: `1px solid ${isCurrentHour ? 'rgba(234,179,8,0.4)' : 'var(--color-border)'}`,
                    }}
                  >
                    <span className="text-xs font-mono font-bold" style={{ color: 'var(--color-white)' }}>{time}</span>
                    <span className="text-xs" style={{ color: isCurrentHour ? 'rgba(234,179,8,0.6)' : '#333' }}>Disponível</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Week View ---------- */

function WeekView({
  startDate,
  barbers,
  schedules,
  appointments,
  blockedSlots,
  onAppointmentClick,
}: {
  startDate: string
  barbers: Barber[]
  schedules: BarberSchedule[]
  appointments: Appointment[]
  blockedSlots: BlockedSlot[]
  onAppointmentClick: (apt: Appointment) => void
}) {
  const d = new Date(startDate + 'T12:00:00')
  const dayOfWeek = d.getDay()
  const weekStart = new Date(d)
  weekStart.setDate(d.getDate() - dayOfWeek)

  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    days.push(formatDate(day))
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header */}
        <div className="grid grid-cols-8 gap-1 mb-2">
          <div className="text-xs py-2 text-center" style={{ color: 'var(--color-gray)' }}>Horário</div>
          {days.map((dayStr, i) => {
            const dayDate = new Date(dayStr + 'T12:00:00')
            const isToday = dayStr === formatDate(nowInSaoPaulo())
            return (
              <div
                key={dayStr}
                className="text-center py-2 rounded-lg"
                style={{ backgroundColor: isToday ? 'rgba(45,122,58,0.15)' : 'transparent' }}
              >
                <div className="text-[10px] font-medium" style={{ color: 'var(--color-gray)' }}>
                  {DAY_NAMES_SHORT[i]}
                </div>
                <div
                  className="text-sm font-bold"
                  style={{ color: isToday ? 'var(--color-green-light)' : 'var(--color-white)' }}
                >
                  {dayDate.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Time rows */}
        {generateHourSlots().map((time) => (
          <div key={time} className="grid grid-cols-8 gap-1 mb-1">
            <div className="text-[10px] font-mono py-2 text-right pr-2" style={{ color: 'var(--color-gray)' }}>
              {time}
            </div>
            {days.map((dayStr) => {
              const dayAppts = appointments.filter(
                (a) => a.date === dayStr && a.start_time.substring(0, 5) === time && a.status === 'active'
              )
              const isBlocked = blockedSlots.some(
                (b) => b.date === dayStr && b.start_time.substring(0, 5) <= time && b.end_time.substring(0, 5) > time
              )

              if (dayAppts.length > 0) {
                return (
                  <button
                    key={dayStr}
                    onClick={() => onAppointmentClick(dayAppts[0])}
                    className="rounded px-1 py-1.5 text-[10px] truncate text-left transition-colors"
                    style={{ backgroundColor: 'rgba(45,122,58,0.3)', border: '1px solid var(--color-green-primary)' }}
                  >
                    {barbers.length > 1 && (
                      <span style={{ color: 'var(--color-green-light)' }}>
                        {dayAppts[0].barber?.name?.charAt(0)}{' '}
                      </span>
                    )}
                    <span style={{ color: 'var(--color-white)' }}>
                      {(dayAppts[0].client?.name || dayAppts[0].client_name || dayAppts[0].service?.name || '').split(' ')[0]}
                    </span>
                    {dayAppts.length > 1 && (
                      <span style={{ color: 'var(--color-gray)' }}> +{dayAppts.length - 1}</span>
                    )}
                  </button>
                )
              }

              if (isBlocked) {
                return (
                  <div
                    key={dayStr}
                    className="rounded px-1 py-1.5"
                    style={{ backgroundColor: '#111', border: '1px solid var(--color-border)' }}
                  />
                )
              }

              return (
                <div
                  key={dayStr}
                  className="rounded px-1 py-1.5"
                  style={{ border: '1px solid #1a1a1a' }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Manual Booking Modal ---------- */

function ManualBookingModal({
  barberId,
  date,
  time,
  services,
  barbers,
  onClose,
  onSaved,
}: {
  barberId: string
  date: string
  time: string
  services: Service[]
  barbers: Barber[]
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const barber = barbers.find((b) => b.id === barberId)
  const barberServices = services.filter((s) => s.barber_id === barberId)

  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [serviceId, setServiceId] = useState(barberServices[0]?.id || '')
  const [selectedTime, setSelectedTime] = useState(time)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!clientName.trim() || !serviceId) return
    setSaving(true)
    setError(null)

    const service = barberServices.find((s) => s.id === serviceId)
    if (!service) return

    const [h, m] = selectedTime.split(':').map(Number)
    const endMin = h * 60 + m + service.duration_minutes
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`

    const { error: insertError } = await supabase.from('appointments').insert({
      barber_id: barberId,
      client_id: null,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim() || null,
      service_id: serviceId,
      date,
      start_time: selectedTime,
      end_time: endTime,
      status: 'active',
      created_by: 'barber',
    })

    if (insertError) {
      setError('Erro ao salvar agendamento.')
      setSaving(false)
      return
    }

    onSaved()
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2
        className="text-3xl mb-1 tracking-wide"
        style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
      >
        Agendamento manual
      </h2>
      <p className="text-xs mb-5" style={{ color: 'var(--color-gray)' }}>
        {barber?.name} — {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}
      </p>

      <div className="flex flex-col gap-3">
        <InputField label="Nome do cliente" value={clientName} onChange={setClientName} required />
        <InputField label="Telefone (opcional)" value={clientPhone} onChange={setClientPhone} />
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-gray)' }}>Serviço</label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]"
            style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }}
          >
            {barberServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.duration_minutes}min — {formatPrice(s.price)}
              </option>
            ))}
          </select>
        </div>
        <InputField label="Horário" value={selectedTime} onChange={setSelectedTime} type="time" />
      </div>

      {error && (
        <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: '#3a1a1a', color: 'var(--color-error)' }}>
          {error}
        </div>
      )}

      <div className="flex gap-2 mt-5">
        <button onClick={onClose} className="flex-1 rounded-xl py-3 text-sm min-h-[48px]" style={{ border: '1px solid var(--color-border)', color: 'var(--color-gray)' }}>
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !clientName.trim()}
          className="flex-1 rounded-xl py-3 text-sm font-semibold min-h-[48px] disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-green-primary)', color: 'var(--color-white)' }}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </ModalOverlay>
  )
}

/* ---------- Appointment Detail Modal ---------- */

function AppointmentDetailModal({
  appointment,
  onClose,
  onCancelled,
}: {
  appointment: Appointment
  onClose: () => void
  onCancelled: () => void
}) {
  const supabase = createClient()
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  async function handleCancel() {
    setCancelling(true)
    await supabase
      .from('appointments')
      .update({ status: 'cancelled', cancelled_by: 'barber' })
      .eq('id', appointment.id)
    onCancelled()
  }

  const isCancelled = appointment.status === 'cancelled'

  return (
    <ModalOverlay onClose={onClose}>
      <h2
        className="text-3xl mb-4 tracking-wide"
        style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
      >
        Detalhes do agendamento
      </h2>

      {isCancelled && (
        <div className="mb-4 rounded-lg px-3 py-2 text-xs text-center" style={{ backgroundColor: '#3a1a1a', color: 'var(--color-error)', border: '1px solid var(--color-error)' }}>
          <span className="font-bold">CANCELADO</span>
          <span className="font-normal ml-1">
            {appointment.cancelled_by === 'client'
              ? '— pelo cliente (app)'
              : appointment.cancelled_by === 'barber'
              ? `— pelo barbeiro${appointment.barber?.name ? ` (${appointment.barber.name})` : ''}`
              : '— cancelado pelo barbeiro'}
          </span>
        </div>
      )}

      {/* Client info with photo */}
      {(() => {
        const clientName = appointment.client?.name || appointment.client_name || null
        const avatarUrl = appointment.client?.avatar_url || null
        const initial = clientName?.charAt(0).toUpperCase() || '?'
        return (
          <div className="flex items-center gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div
              className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{ border: '2px solid var(--color-green-primary)', backgroundColor: '#1e1e1e', color: 'var(--color-green-light)' }}
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt={clientName || 'Cliente'} width={64} height={64} className="rounded-full object-cover w-full h-full" />
              ) : initial}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold truncate" style={{ color: 'var(--color-white)' }}>
                {clientName || '(sem nome)'}
              </p>
              {appointment.client_phone && (
                <p className="text-sm" style={{ color: 'var(--color-gray)' }}>{appointment.client_phone}</p>
              )}
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-gray)' }}>
                {appointment.created_by === 'barber' ? 'Agendado pelo barbeiro' : 'Agendado pelo app'}
              </p>
            </div>
          </div>
        )
      })()}

      <div className="flex flex-col gap-3">
        <DetailRow label="Barbeiro" value={appointment.barber?.name || '—'} />
        <DetailRow label="Serviço" value={appointment.service?.name || '—'} />
        <DetailRow label="Data" value={new Date(appointment.date + 'T12:00:00').toLocaleDateString('pt-BR')} />
        <DetailRow label="Horário" value={`${appointment.start_time.substring(0, 5)} — ${appointment.end_time.substring(0, 5)}`} />
        {appointment.service && <DetailRow label="Preço" value={formatPrice(appointment.service.price)} highlight />}
      </div>

      <div className="flex gap-2 mt-5">
        <button onClick={onClose} className="flex-1 rounded-xl py-3 text-sm min-h-[48px]" style={{ border: '1px solid var(--color-border)', color: 'var(--color-gray)' }}>
          Fechar
        </button>
        {!isCancelled && (
          !confirmCancel ? (
            <button
              onClick={() => setConfirmCancel(true)}
              className="flex-1 rounded-xl py-3 text-sm font-semibold min-h-[48px]"
              style={{ backgroundColor: '#3a1a1a', color: 'var(--color-error)', border: '1px solid var(--color-error)' }}
            >
              Cancelar agendamento
            </button>
          ) : (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 rounded-xl py-3 text-sm font-semibold min-h-[48px] disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-error)', color: 'var(--color-white)' }}
            >
              {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
            </button>
          )
        )}
      </div>
    </ModalOverlay>
  )
}

/* ---------- Shared Components ---------- */

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1" style={{ color: 'var(--color-gray)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        {children}
      </div>
    </div>
  )
}

function BarberColumnHeader({ name }: { name: string }) {
  return (
    <div
      className="text-lg font-bold tracking-wide py-2 px-1"
      style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-green-light)' }}
    >
      {name}
    </div>
  )
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--color-gray)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: highlight ? 'var(--color-green-light)' : 'var(--color-white)' }}>{value}</span>
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-gray)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]"
        style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }}
      />
    </div>
  )
}

/* ---------- Helpers ---------- */

function generateTimeSlots(schedule: BarberSchedule): string[] {
  const slots: string[] = []
  const [sh, sm] = schedule.start_time.split(':').map(Number)
  const [eh, em] = schedule.end_time.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em

  for (let m = startMin; m < endMin; m += schedule.slot_duration_minutes) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return slots
}

function generateHourSlots(): string[] {
  const slots: string[] = []
  for (let h = 8; h <= 20; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
}

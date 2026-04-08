'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DAY_NAMES } from '@/lib/constants'
import type { Barber, BarberSchedule, BlockedSlot } from '@/lib/types'

// Derive start_time / end_time from the morning+afternoon periods
function computeStartEnd(s: Partial<BarberSchedule>): { start_time: string; end_time: string } {
  const starts: string[] = []
  const ends: string[] = []
  if (s.morning_active && s.morning_start) starts.push(s.morning_start.substring(0, 5))
  if (s.morning_active && s.morning_end)   ends.push(s.morning_end.substring(0, 5))
  if (s.afternoon_active && s.afternoon_start) starts.push(s.afternoon_start.substring(0, 5))
  if (s.afternoon_active && s.afternoon_end)   ends.push(s.afternoon_end.substring(0, 5))
  const start_time = starts.length > 0 ? starts.reduce((a, b) => (a < b ? a : b)) : '09:00'
  const end_time   = ends.length   > 0 ? ends.reduce((a, b)   => (a > b ? a : b)) : '19:00'
  return { start_time, end_time }
}

export default function ConfiguracoesPage() {
  const supabase = createClient()

  const [barbers, setBarbers] = useState<Barber[]>([])
  const [savedSchedules, setSavedSchedules]   = useState<BarberSchedule[]>([])
  const [localSchedules, setLocalSchedules]   = useState<BarberSchedule[]>([])
  const [blockedSlots, setBlockedSlots]       = useState<BlockedSlot[]>([])
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showBlockModal, setShowBlockModal] = useState(false)

  // Dirty check — include start_time/end_time so drift from computeStartEnd is detected
  const TRACK = ['active','morning_active','morning_start','morning_end','afternoon_active','afternoon_start','afternoon_end','slot_duration_minutes','start_time','end_time'] as const
  const isDirty = localSchedules.some((local) => {
    const saved = savedSchedules.find((s) => s.id === local.id)
    if (!saved) return true
    return TRACK.some((k) => {
      const lv = String(local[k] ?? '').substring(0, 5)
      const sv = String(saved[k] ?? '').substring(0, 5)
      return lv !== sv
    })
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [barbersRes, schedulesRes, blockedRes] = await Promise.all([
      supabase.from('barbers').select('*').not('slug', 'is', null).order('name'),
      supabase.from('barber_schedules').select('*'),
      supabase.from('blocked_slots').select('*').order('date', { ascending: false }),
    ])
    const barbersData     = (barbersRes.data    || []) as Barber[]
    const schedulesData   = (schedulesRes.data  || []) as BarberSchedule[]
    // Apply computeStartEnd so localSchedules always has correct start_time/end_time
    const corrected = schedulesData.map((s) => {
      const { start_time, end_time } = computeStartEnd(s)
      return { ...s, start_time, end_time }
    })
    setBarbers(barbersData)
    setSavedSchedules(schedulesData)
    setLocalSchedules(structuredClone(corrected))
    setBlockedSlots((blockedRes.data || []) as BlockedSlot[])
    if (!selectedBarberId && barbersData.length > 0) setSelectedBarberId(barbersData[0].id)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Update only local state — no DB call
  function updateLocal(dayOfWeek: number, changes: Partial<BarberSchedule>) {
    setLocalSchedules((prev) => {
      const idx = prev.findIndex(
        (s) => s.barber_id === selectedBarberId && s.day_of_week === dayOfWeek
      )
      if (idx !== -1) {
        const updated = { ...prev[idx], ...changes }
        const { start_time, end_time } = computeStartEnd(updated)
        const next = [...prev]
        next[idx] = { ...updated, start_time, end_time }
        return next
      }
      // New row (no existing schedule for this day)
      if (!selectedBarberId) return prev
      const base: BarberSchedule = {
        id: `new-${selectedBarberId}-${dayOfWeek}`,
        barber_id: selectedBarberId,
        day_of_week: dayOfWeek,
        active: true,
        morning_active: true,
        morning_start: '09:00',
        morning_end: '12:00',
        afternoon_active: true,
        afternoon_start: '13:00',
        afternoon_end: '19:00',
        slot_duration_minutes: 30,
        start_time: '09:00',
        end_time: '19:00',
        ...changes,
      }
      const { start_time, end_time } = computeStartEnd(base)
      return [...prev, { ...base, start_time, end_time }]
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      for (const local of localSchedules) {
        const saved = savedSchedules.find((s) => s.id === local.id)
        const isNew = local.id.startsWith('new-')

        if (isNew) {
          const { id: _id, ...rest } = local
          await supabase.from('barber_schedules').insert(rest)
        } else if (saved) {
          const changed = TRACK.some(
            (k) => String(local[k] ?? '').substring(0, 5) !== String(saved[k] ?? '').substring(0, 5)
          )
          if (changed) {
            await supabase.from('barber_schedules').update({
              active: local.active,
              morning_active: local.morning_active,
              morning_start: local.morning_start,
              morning_end: local.morning_end,
              afternoon_active: local.afternoon_active,
              afternoon_start: local.afternoon_start,
              afternoon_end: local.afternoon_end,
              slot_duration_minutes: local.slot_duration_minutes,
              start_time: local.start_time,
              end_time: local.end_time,
            }).eq('id', local.id)
          }
        }
      }
      await fetchData()
    } catch {
      setSaveError('Erro ao salvar. Tente novamente.')
    }
    setSaving(false)
  }

  async function deleteBlock(id: string) {
    await supabase.from('blocked_slots').delete().eq('id', id)
    fetchData()
  }

  const barberSchedules = localSchedules.filter((s) => s.barber_id === selectedBarberId)

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto pb-28">
      {/* Barber selector */}
      <div className="mb-6">
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-gray)' }}>
          Configurando:
        </label>
        <div className="flex items-center gap-2">
          {barbers.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBarberId(b.id)}
              className="px-4 py-2 rounded-xl text-xs font-semibold min-h-[40px]"
              style={{
                backgroundColor: selectedBarberId === b.id ? 'var(--color-green-primary)' : 'transparent',
                color: selectedBarberId === b.id ? 'var(--color-white)' : 'var(--color-gray)',
                border: `1px solid ${selectedBarberId === b.id ? 'var(--color-green-primary)' : 'var(--color-border)'}`,
              }}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Schedule section */}
          <section className="mb-8">
            <h2
              className="text-2xl mb-3 tracking-wide"
              style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
            >
              Horário de funcionamento
            </h2>
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
                const schedule = barberSchedules.find((s) => s.day_of_week === dow)
                return (
                  <DayScheduleRow
                    key={dow}
                    dayOfWeek={dow}
                    schedule={schedule}
                    onChange={(changes) => updateLocal(dow, changes)}
                  />
                )
              })}
            </div>
          </section>

          {/* Blocked slots section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-2xl tracking-wide"
                style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
              >
                Bloqueios pontuais
              </h2>
              <button
                onClick={() => setShowBlockModal(true)}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
                style={{ backgroundColor: 'var(--color-green-primary)', color: 'var(--color-white)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Novo
              </button>
            </div>

            {blockedSlots.length === 0 ? (
              <div
                className="rounded-xl p-4 text-center text-xs"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-gray)' }}
              >
                Nenhum bloqueio cadastrado.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {(() => {
                  type Group = { ids: string[]; dates: string[]; block: BlockedSlot; barberIds: string[] }
                  const groups: Group[] = []
                  const sorted = [...blockedSlots].sort((a, b) => a.date.localeCompare(b.date))
                  for (const block of sorted) {
                    const sameParams = (g: Group) =>
                      g.block.all_day === block.all_day &&
                      g.block.start_time === block.start_time &&
                      g.block.end_time === block.end_time &&
                      g.block.reason === block.reason &&
                      g.block.barber_id === block.barber_id
                    const existing = groups.find((g) => sameParams(g))
                    if (existing) {
                      existing.ids.push(block.id)
                      existing.dates.push(block.date)
                      existing.barberIds.push(block.barber_id)
                    } else {
                      groups.push({ ids: [block.id], dates: [block.date], block, barberIds: [block.barber_id] })
                    }
                  }

                  type MergedGroup = { ids: string[]; dates: string[]; block: BlockedSlot; barberIds: string[] }
                  const merged: MergedGroup[] = []
                  for (const g of groups) {
                    const ex = merged.find(
                      (m) =>
                        m.block.all_day === g.block.all_day &&
                        m.block.start_time === g.block.start_time &&
                        m.block.end_time === g.block.end_time &&
                        m.block.reason === g.block.reason &&
                        JSON.stringify([...m.dates].sort()) === JSON.stringify([...g.dates].sort())
                    )
                    if (ex) {
                      ex.ids.push(...g.ids)
                      ex.barberIds.push(...g.barberIds)
                    } else {
                      merged.push({ ...g })
                    }
                  }
                  merged.sort((a, b) => b.dates[0].localeCompare(a.dates[0]))

                  return merged.map((group) => {
                    const isAll = group.barberIds.length >= barbers.length && barbers.length > 0
                    const uniqueBarberIds = [...new Set(group.barberIds)]
                    const barberLabel = isAll
                      ? 'Todos'
                      : uniqueBarberIds.map((bid) => barbers.find((b) => b.id === bid)?.name).filter(Boolean).join(', ')
                    const sortedDates = [...group.dates].sort()
                    const firstDate = new Date(sortedDates[0] + 'T12:00:00').toLocaleDateString('pt-BR')
                    const lastDate  = new Date(sortedDates[sortedDates.length - 1] + 'T12:00:00').toLocaleDateString('pt-BR')
                    const dateLabel = sortedDates.length > 1 ? `${firstDate} a ${lastDate}` : firstDate

                    return (
                      <div
                        key={group.ids.join('-')}
                        className="rounded-xl p-3 flex items-center justify-between"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium" style={{ color: 'var(--color-white)' }}>
                              {dateLabel}{' — '}
                              {group.block.all_day
                                ? 'Dia inteiro'
                                : `${group.block.start_time.substring(0, 5)} às ${group.block.end_time.substring(0, 5)}`}
                            </p>
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: 'rgba(45,122,58,0.15)', color: 'var(--color-green-light)', border: '1px solid var(--color-green-primary)' }}
                            >
                              {barberLabel}
                            </span>
                          </div>
                          {group.block.reason && (
                            <p className="text-xs" style={{ color: 'var(--color-gray)' }}>{group.block.reason}</p>
                          )}
                        </div>
                        <button
                          onClick={() => group.ids.forEach((id) => deleteBlock(id))}
                          className="p-2 rounded-lg flex-shrink-0 ml-2"
                          style={{ color: 'var(--color-error)', border: '1px solid var(--color-border)' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </section>
        </>
      )}

      {/* Floating save bar */}
      {isDirty && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-4 px-6 py-4"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderTop: '1px solid var(--color-border)',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--color-gray)' }}>
            Há alterações não salvas.
          </p>
          <div className="flex items-center gap-3">
            {saveError && (
              <span className="text-xs" style={{ color: 'var(--color-error)' }}>{saveError}</span>
            )}
            <button
              onClick={() => {
                setLocalSchedules(structuredClone(savedSchedules))
                setSaveError(null)
              }}
              className="px-4 py-2 rounded-xl text-sm min-h-[40px]"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-gray)' }}
            >
              Descartar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-xl text-sm font-semibold min-h-[40px] disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-green-primary)', color: 'var(--color-white)' }}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </span>
              ) : (
                'Salvar'
              )}
            </button>
          </div>
        </div>
      )}

      {showBlockModal && (
        <BlockFormModal
          barbers={barbers}
          defaultBarberId={selectedBarberId}
          onClose={() => setShowBlockModal(false)}
          onSaved={() => { setShowBlockModal(false); fetchData() }}
        />
      )}
    </div>
  )
}

function DayScheduleRow({
  dayOfWeek,
  schedule,
  onChange,
}: {
  dayOfWeek: number
  schedule: BarberSchedule | undefined
  onChange: (changes: Partial<BarberSchedule>) => void
}) {
  const active          = schedule?.active          ?? false
  const morningActive   = schedule?.morning_active   ?? true
  const afternoonActive = schedule?.afternoon_active ?? true

  return (
    <div
      className="rounded-xl p-3"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        opacity: active ? 1 : 0.6,
      }}
    >
      {/* Day header */}
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => onChange({ active: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-white)' }}>
            {DAY_NAMES[dayOfWeek]}
          </span>
        </label>
        {active && (
          <div className="flex items-center gap-1.5">
            <label className="text-[10px]" style={{ color: 'var(--color-gray)' }}>Slot</label>
            <select
              value={schedule?.slot_duration_minutes ?? 30}
              onChange={(e) => onChange({ slot_duration_minutes: parseInt(e.target.value) })}
              className="rounded-lg px-2 py-1 text-xs outline-none"
              style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }}
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
          </div>
        )}
      </div>

      {active && (
        <div className="flex flex-col gap-2 mt-1">
          {/* Morning */}
          <div
            className="rounded-lg p-2"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid var(--color-border)', opacity: morningActive ? 1 : 0.5 }}
          >
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={morningActive}
                onChange={(e) => onChange({ morning_active: e.target.checked })}
                className="w-3.5 h-3.5"
              />
              <span className="text-xs font-medium" style={{ color: 'var(--color-gray)' }}>Manhã</span>
            </label>
            {morningActive && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] mb-0.5" style={{ color: 'var(--color-gray)' }}>Início</label>
                  <input
                    type="time"
                    value={schedule?.morning_start?.substring(0, 5) ?? '09:00'}
                    onChange={(e) => onChange({ morning_start: e.target.value })}
                    className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                    style={{ backgroundColor: '#111', border: '1px solid var(--color-border)', color: 'var(--color-white)' }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] mb-0.5" style={{ color: 'var(--color-gray)' }}>Fim</label>
                  <input
                    type="time"
                    value={schedule?.morning_end?.substring(0, 5) ?? '12:00'}
                    onChange={(e) => onChange({ morning_end: e.target.value })}
                    className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                    style={{ backgroundColor: '#111', border: '1px solid var(--color-border)', color: 'var(--color-white)' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Afternoon */}
          <div
            className="rounded-lg p-2"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid var(--color-border)', opacity: afternoonActive ? 1 : 0.5 }}
          >
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={afternoonActive}
                onChange={(e) => onChange({ afternoon_active: e.target.checked })}
                className="w-3.5 h-3.5"
              />
              <span className="text-xs font-medium" style={{ color: 'var(--color-gray)' }}>Tarde</span>
            </label>
            {afternoonActive && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] mb-0.5" style={{ color: 'var(--color-gray)' }}>Início</label>
                  <input
                    type="time"
                    value={schedule?.afternoon_start?.substring(0, 5) ?? '13:00'}
                    onChange={(e) => onChange({ afternoon_start: e.target.value })}
                    className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                    style={{ backgroundColor: '#111', border: '1px solid var(--color-border)', color: 'var(--color-white)' }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] mb-0.5" style={{ color: 'var(--color-gray)' }}>Fim</label>
                  <input
                    type="time"
                    value={schedule?.afternoon_end?.substring(0, 5) ?? '19:00'}
                    onChange={(e) => onChange({ afternoon_end: e.target.value })}
                    className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                    style={{ backgroundColor: '#111', border: '1px solid var(--color-border)', color: 'var(--color-white)' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BlockFormModal({
  barbers,
  defaultBarberId,
  onClose,
  onSaved,
}: {
  barbers: Barber[]
  defaultBarberId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [selectedBarber, setSelectedBarber] = useState<string>(defaultBarberId ?? 'all')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd]     = useState('')
  const [allDay, setAllDay]       = useState(false)
  const [startTime, setStartTime] = useState('12:00')
  const [endTime, setEndTime]     = useState('13:00')
  const [reason, setReason]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  function getDatesInRange(start: string, end: string): string[] {
    const dates: string[] = []
    const cur  = new Date(start + 'T12:00:00')
    const last = new Date(end   + 'T12:00:00')
    while (cur <= last) {
      const y = cur.getFullYear()
      const m = String(cur.getMonth() + 1).padStart(2, '0')
      const d = String(cur.getDate()).padStart(2, '0')
      dates.push(`${y}-${m}-${d}`)
      cur.setDate(cur.getDate() + 1)
    }
    return dates
  }

  async function handleSave() {
    if (!dateStart) return
    setSaving(true)
    setError(null)
    const targetIds = selectedBarber === 'all' ? barbers.map((b) => b.id) : [selectedBarber]
    const dates = dateEnd && dateEnd >= dateStart ? getDatesInRange(dateStart, dateEnd) : [dateStart]
    const inserts = targetIds.flatMap((bid) =>
      dates.map((d) => ({
        barber_id: bid,
        date: d,
        all_day: allDay,
        start_time: allDay ? '00:00' : startTime,
        end_time:   allDay ? '23:59' : endTime,
        reason: reason.trim() || null,
      }))
    )
    const { error: dbError } = await supabase.from('blocked_slots').insert(inserts)
    if (dbError) { setError('Erro ao salvar bloqueio.'); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} />
      <div
        className="relative w-full max-w-md rounded-2xl p-6"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-3xl mb-5 tracking-wide"
          style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
        >
          Novo bloqueio
        </h2>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-gray)' }}>Barbeiro</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setSelectedBarber('all')}
                className="px-3 py-2 rounded-xl text-xs font-semibold min-h-[40px]"
                style={{
                  backgroundColor: selectedBarber === 'all' ? 'var(--color-green-primary)' : 'transparent',
                  color: selectedBarber === 'all' ? 'var(--color-white)' : 'var(--color-gray)',
                  border: `1px solid ${selectedBarber === 'all' ? 'var(--color-green-primary)' : 'var(--color-border)'}`,
                }}>
                Todos
              </button>
              {barbers.map((b) => (
                <button key={b.id} type="button" onClick={() => setSelectedBarber(b.id)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold min-h-[40px]"
                  style={{
                    backgroundColor: selectedBarber === b.id ? 'var(--color-green-primary)' : 'transparent',
                    color: selectedBarber === b.id ? 'var(--color-white)' : 'var(--color-gray)',
                    border: `1px solid ${selectedBarber === b.id ? 'var(--color-green-primary)' : 'var(--color-border)'}`,
                  }}>
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-gray)' }}>Data inicial</label>
              <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]"
                style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-gray)' }}>
                Data final <span style={{ fontWeight: 400 }}>(opcional)</span>
              </label>
              <input type="date" value={dateEnd} min={dateStart} onChange={(e) => setDateEnd(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]"
                style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm" style={{ color: 'var(--color-white)' }}>Dia inteiro</span>
          </label>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-gray)' }}>Início</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]"
                  style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-gray)' }}>Fim</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]"
                  style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }} />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-gray)' }}>Motivo (opcional)</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Almoço, folga, consulta..."
              className="w-full rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]"
              style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }} />
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: '#3a1a1a', color: 'var(--color-error)' }}>
            {error}
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 rounded-xl py-3 text-sm min-h-[48px]"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-gray)' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !dateStart}
            className="flex-1 rounded-xl py-3 text-sm font-semibold min-h-[48px] disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-green-primary)', color: 'var(--color-white)' }}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

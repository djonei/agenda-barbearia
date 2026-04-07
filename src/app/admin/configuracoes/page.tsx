'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DAY_NAMES } from '@/lib/constants'
import type { Barber, BarberSchedule, BlockedSlot } from '@/lib/types'

export default function ConfiguracoesPage() {
  const supabase = createClient()

  const [barbers, setBarbers] = useState<Barber[]>([])
  const [schedules, setSchedules] = useState<BarberSchedule[]>([])
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showBlockModal, setShowBlockModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [barbersRes, schedulesRes, blockedRes] = await Promise.all([
      supabase.from('barbers').select('*').not('slug', 'is', null).order('name'),
      supabase.from('barber_schedules').select('*'),
      supabase.from('blocked_slots').select('*').order('date', { ascending: false }),
    ])

    const barbersData = (barbersRes.data || []) as Barber[]
    setBarbers(barbersData)
    setSchedules((schedulesRes.data || []) as BarberSchedule[])
    setBlockedSlots((blockedRes.data || []) as BlockedSlot[])
    if (!selectedBarberId && barbersData.length > 0) {
      setSelectedBarberId(barbersData[0].id)
    }
    setLoading(false)
  }, [supabase, selectedBarberId])

  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const barberSchedules = schedules.filter((s) => s.barber_id === selectedBarberId)
  const barberBlocked = blockedSlots.filter((b) => b.barber_id === selectedBarberId)

  async function updateDaySchedule(dayOfWeek: number, changes: Partial<BarberSchedule>) {
    const existing = barberSchedules.find((s) => s.day_of_week === dayOfWeek)

    if (existing) {
      await supabase.from('barber_schedules').update(changes).eq('id', existing.id)
    } else if (selectedBarberId) {
      await supabase.from('barber_schedules').insert({
        barber_id: selectedBarberId,
        day_of_week: dayOfWeek,
        start_time: '09:00',
        end_time: '19:00',
        slot_duration_minutes: 30,
        active: true,
        ...changes,
      })
    }
    fetchData()
    setSaveMessage('Salvo!')
    setTimeout(() => setSaveMessage(null), 2000)
  }

  async function deleteBlock(id: string) {
    await supabase.from('blocked_slots').delete().eq('id', id)
    fetchData()
  }

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto">
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

      {saveMessage && (
        <div
          className="mb-4 rounded-lg px-3 py-2 text-xs text-center"
          style={{ backgroundColor: 'rgba(45,122,58,0.15)', color: 'var(--color-green-light)', border: '1px solid var(--color-green-primary)' }}
        >
          {saveMessage}
        </div>
      )}

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
                    onChange={(changes) => updateDaySchedule(dow, changes)}
                  />
                )
              })}
            </div>
          </section>

          {/* Blocks section */}
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

            {barberBlocked.length === 0 ? (
              <div
                className="rounded-xl p-4 text-center text-xs"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-gray)' }}
              >
                Nenhum bloqueio cadastrado.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {barberBlocked.map((block) => (
                  <div
                    key={block.id}
                    className="rounded-xl p-3 flex items-center justify-between"
                    style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-white)' }}>
                        {new Date(block.date + 'T12:00:00').toLocaleDateString('pt-BR')} — {block.start_time.substring(0, 5)} às {block.end_time.substring(0, 5)}
                      </p>
                      {block.reason && (
                        <p className="text-xs" style={{ color: 'var(--color-gray)' }}>{block.reason}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteBlock(block.id)}
                      className="p-2 rounded-lg"
                      style={{ color: 'var(--color-error)', border: '1px solid var(--color-border)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {showBlockModal && selectedBarberId && (
        <BlockFormModal
          barberId={selectedBarberId}
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
  const active = schedule?.active ?? false

  return (
    <div
      className="rounded-xl p-3"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        opacity: active ? 1 : 0.6,
      }}
    >
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
      </div>
      {active && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] mb-0.5" style={{ color: 'var(--color-gray)' }}>Início</label>
            <input
              type="time"
              defaultValue={schedule?.start_time?.substring(0, 5) || '09:00'}
              onBlur={(e) => onChange({ start_time: e.target.value })}
              className="w-full rounded-lg px-2 py-2 text-xs outline-none"
              style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }}
            />
          </div>
          <div>
            <label className="block text-[10px] mb-0.5" style={{ color: 'var(--color-gray)' }}>Fim</label>
            <input
              type="time"
              defaultValue={schedule?.end_time?.substring(0, 5) || '19:00'}
              onBlur={(e) => onChange({ end_time: e.target.value })}
              className="w-full rounded-lg px-2 py-2 text-xs outline-none"
              style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }}
            />
          </div>
          <div>
            <label className="block text-[10px] mb-0.5" style={{ color: 'var(--color-gray)' }}>Slot (min)</label>
            <select
              defaultValue={schedule?.slot_duration_minutes || 30}
              onBlur={(e) => onChange({ slot_duration_minutes: parseInt(e.target.value) })}
              onChange={(e) => onChange({ slot_duration_minutes: parseInt(e.target.value) })}
              className="w-full rounded-lg px-2 py-2 text-xs outline-none"
              style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }}
            >
              <option value="15">15</option>
              <option value="30">30</option>
              <option value="45">45</option>
              <option value="60">60</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

function BlockFormModal({
  barberId,
  onClose,
  onSaved,
}: {
  barberId: string
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('12:00')
  const [endTime, setEndTime] = useState('13:00')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!date) return
    setSaving(true)
    setError(null)

    const { error: dbError } = await supabase.from('blocked_slots').insert({
      barber_id: barberId,
      date,
      start_time: startTime,
      end_time: endTime,
      reason: reason.trim() || null,
    })

    if (dbError) {
      setError('Erro ao salvar bloqueio.')
      setSaving(false)
      return
    }
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
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-gray)' }}>Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]"
              style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-gray)' }}>Início</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]"
                style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-gray)' }}>Fim</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]"
                style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-gray)' }}>Motivo (opcional)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Almoço, folga, consulta..."
              className="w-full rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]"
              style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }}
            />
          </div>
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
            disabled={saving || !date}
            className="flex-1 rounded-xl py-3 text-sm font-semibold min-h-[48px] disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-green-primary)', color: 'var(--color-white)' }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

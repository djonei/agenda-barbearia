'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DAY_NAMES } from '@/lib/constants'
import type { Barber, BarberSchedule } from '@/lib/types'

// Resize an image to maxSize × maxSize, converting to WebP
async function resizeImage(file: File, maxSize = 256): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > height) {
        if (width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize }
      } else {
        if (height > maxSize) { width = Math.round((width * maxSize) / height); height = maxSize }
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error('Falha ao converter imagem')) },
        'image/webp',
        0.85,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Falha ao carregar imagem')) }
    img.src = url
  })
}

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
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

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
    const [barbersRes, schedulesRes] = await Promise.all([
      supabase.from('barbers').select('*').not('slug', 'is', null).order('name'),
      supabase.from('barber_schedules').select('*'),
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

  const barberSchedules = localSchedules.filter((s) => s.barber_id === selectedBarberId)
  const selectedBarber = barbers.find((b) => b.id === selectedBarberId) ?? null

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedBarberId) return
    setAvatarUploading(true)
    setAvatarError(null)
    try {
      const resized = await resizeImage(file)
      const path = `${selectedBarberId}/${Date.now()}.webp`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, resized, { contentType: 'image/webp', upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const { error: updateError } = await supabase
        .from('barbers')
        .update({ avatar_url: publicUrl })
        .eq('id', selectedBarberId)
      if (updateError) throw updateError
      setBarbers((prev) => prev.map((b) => b.id === selectedBarberId ? { ...b, avatar_url: publicUrl } : b))
    } catch {
      setAvatarError('Erro ao enviar foto. Tente novamente.')
    } finally {
      setAvatarUploading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto pb-28">

      {/* Avatar section */}
      {selectedBarber && (
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div
              className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold"
              style={{ backgroundColor: 'var(--color-surface)', border: '2px solid var(--color-border)', color: 'var(--color-white)' }}
            >
              {selectedBarber.avatar_url ? (
                <Image
                  src={selectedBarber.avatar_url}
                  alt={selectedBarber.name}
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                  unoptimized={selectedBarber.avatar_url.startsWith('/') }
                />
              ) : (
                selectedBarber.name.charAt(0).toUpperCase()
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              title="Trocar foto"
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-green-primary)', border: '2px solid var(--color-bg)' }}
            >
              {avatarUploading ? (
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div>
            <p className="text-base font-semibold" style={{ color: 'var(--color-white)' }}>
              {selectedBarber.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-gray)' }}>
              {avatarUploading ? 'Enviando foto...' : 'Clique na câmera para trocar o avatar'}
            </p>
            {avatarError && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-error)' }}>{avatarError}</p>
            )}
          </div>
        </div>
      )}

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
          {/* Bloqueios link */}
          <div className="mb-4">
            <Link
              href="/admin/bloqueios"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-gray)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Bloqueios
            </Link>
          </div>

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


'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, nowInSaoPaulo } from '@/lib/slots'
import type { Barber, BlockedSlot } from '@/lib/types'

type MergedGroup = {
  ids: string[]
  dates: string[]
  block: BlockedSlot
  barberIds: string[]
}

function groupBlocks(slots: BlockedSlot[]): MergedGroup[] {
  type Group = MergedGroup
  const groups: Group[] = []
  const sorted = [...slots].sort((a, b) => a.date.localeCompare(b.date))

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

  return merged
}

function BlockCard({
  group,
  barbers,
  onDelete,
}: {
  group: MergedGroup
  barbers: Barber[]
  onDelete: (ids: string[]) => void
}) {
  const isAll = group.barberIds.length >= barbers.length && barbers.length > 0
  const uniqueBarberIds = [...new Set(group.barberIds)]
  const barberLabel = isAll
    ? 'Todos'
    : uniqueBarberIds.map((bid) => barbers.find((b) => b.id === bid)?.name).filter(Boolean).join(', ')
  const sortedDates = [...group.dates].sort()
  const firstDate = new Date(sortedDates[0] + 'T12:00:00').toLocaleDateString('pt-BR')
  const lastDate = new Date(sortedDates[sortedDates.length - 1] + 'T12:00:00').toLocaleDateString('pt-BR')
  const dateLabel = sortedDates.length > 1 ? `${firstDate} a ${lastDate}` : firstDate

  return (
    <div
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
        onClick={() => onDelete(group.ids)}
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
}

function HistoricoModal({
  groups,
  barbers,
  onClose,
}: {
  groups: MergedGroup[]
  barbers: Barber[]
  onClose: () => void
}) {
  const PAGE_SIZE = 10
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(groups.length / PAGE_SIZE)
  const pageGroups = groups.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 max-h-[85vh] flex flex-col"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1" style={{ color: 'var(--color-gray)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <h2
          className="text-3xl mb-1 tracking-wide shrink-0"
          style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
        >
          Histórico de bloqueios
        </h2>
        <p className="text-xs mb-4 shrink-0" style={{ color: 'var(--color-gray)' }}>
          {groups.length} {groups.length === 1 ? 'registro' : 'registros'} encontrados
        </p>

        <div className="overflow-y-auto flex-1 flex flex-col gap-2 pr-1">
          {pageGroups.length === 0 ? (
            <div
              className="rounded-xl p-4 text-center text-xs"
              style={{ backgroundColor: '#111', border: '1px solid var(--color-border)', color: 'var(--color-gray)' }}
            >
              Nenhum bloqueio no histórico.
            </div>
          ) : (
            pageGroups.map((group) => {
              const isAll = group.barberIds.length >= barbers.length && barbers.length > 0
              const uniqueBarberIds = [...new Set(group.barberIds)]
              const barberLabel = isAll
                ? 'Todos'
                : uniqueBarberIds.map((bid) => barbers.find((b) => b.id === bid)?.name).filter(Boolean).join(', ')
              const sortedDates = [...group.dates].sort()
              const firstDate = new Date(sortedDates[0] + 'T12:00:00').toLocaleDateString('pt-BR')
              const lastDate = new Date(sortedDates[sortedDates.length - 1] + 'T12:00:00').toLocaleDateString('pt-BR')
              const dateLabel = sortedDates.length > 1 ? `${firstDate} a ${lastDate}` : firstDate

              return (
                <div
                  key={group.ids.join('-')}
                  className="rounded-xl p-3"
                  style={{ backgroundColor: '#111', border: '1px solid var(--color-border)', opacity: 0.75 }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-white)' }}>
                      {dateLabel}{' — '}
                      {group.block.all_day
                        ? 'Dia inteiro'
                        : `${group.block.start_time.substring(0, 5)} às ${group.block.end_time.substring(0, 5)}`}
                    </p>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: 'rgba(45,122,58,0.1)', color: 'var(--color-gray)', border: '1px solid var(--color-border)' }}
                    >
                      {barberLabel}
                    </span>
                  </div>
                  {group.block.reason && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-gray)' }}>{group.block.reason}</p>
                  )}
                </div>
              )
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 shrink-0">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-xl text-sm disabled:opacity-40"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-gray)' }}
            >
              ← Anterior
            </button>
            <span className="text-xs" style={{ color: 'var(--color-gray)' }}>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-4 py-2 rounded-xl text-sm disabled:opacity-40"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-gray)' }}
            >
              Próximo →
            </button>
          </div>
        )}
      </div>
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
  const [dateEnd, setDateEnd] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [startTime, setStartTime] = useState('12:00')
  const [endTime, setEndTime] = useState('13:00')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function getDatesInRange(start: string, end: string): string[] {
    const dates: string[] = []
    const cur = new Date(start + 'T12:00:00')
    const last = new Date(end + 'T12:00:00')
    while (cur <= last) {
      dates.push(formatDate(cur))
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
        end_time: allDay ? '23:59' : endTime,
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
        <button onClick={onClose} className="absolute top-4 right-4 p-1" style={{ color: 'var(--color-gray)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

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

export default function BloqueiosPage() {
  const supabase = createClient()
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showHistorico, setShowHistorico] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [barbersRes, blockedRes] = await Promise.all([
      supabase.from('barbers').select('*').not('slug', 'is', null).order('name'),
      supabase.from('blocked_slots').select('*'),
    ])
    setBarbers((barbersRes.data || []) as Barber[])
    setBlockedSlots((blockedRes.data || []) as BlockedSlot[])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function deleteBlock(ids: string[]) {
    await Promise.all(ids.map((id) => supabase.from('blocked_slots').delete().eq('id', id)))
    fetchData()
  }

  const today = formatDate(nowInSaoPaulo())

  // Upcoming: date >= today, sorted ASC (closest first)
  const upcoming = blockedSlots.filter((b) => b.date >= today)
  const upcomingGroups = groupBlocks(upcoming).sort((a, b) => {
    const aMin = [...a.dates].sort()[0]
    const bMin = [...b.dates].sort()[0]
    return aMin.localeCompare(bMin)
  })

  // Past: date < today (D-1), sorted DESC (most recent first)
  const past = blockedSlots.filter((b) => b.date < today)
  const pastGroups = groupBlocks(past).sort((a, b) => {
    const aMax = [...a.dates].sort().reverse()[0]
    const bMax = [...b.dates].sort().reverse()[0]
    return bMax.localeCompare(aMax)
  })

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto pb-28">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-3xl tracking-wide"
          style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
        >
          Bloqueios
        </h1>
        <div className="flex items-center gap-2">
          {pastGroups.length > 0 && (
            <button
              onClick={() => setShowHistorico(true)}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-gray)' }}
            >
              Histórico
            </button>
          )}
          <button
            onClick={() => setShowNewModal(true)}
            className="rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
            style={{ backgroundColor: 'var(--color-green-primary)', color: 'var(--color-white)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      ) : upcomingGroups.length === 0 ? (
        <div
          className="rounded-xl p-6 text-center text-sm"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-gray)' }}
        >
          Nenhum bloqueio cadastrado.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {upcomingGroups.map((group) => (
            <BlockCard
              key={group.ids.join('-')}
              group={group}
              barbers={barbers}
              onDelete={deleteBlock}
            />
          ))}
        </div>
      )}

      {showNewModal && (
        <BlockFormModal
          barbers={barbers}
          defaultBarberId={barbers[0]?.id ?? null}
          onClose={() => setShowNewModal(false)}
          onSaved={() => { setShowNewModal(false); fetchData() }}
        />
      )}

      {showHistorico && (
        <HistoricoModal
          groups={pastGroups}
          barbers={barbers}
          onClose={() => setShowHistorico(false)}
        />
      )}
    </div>
  )
}

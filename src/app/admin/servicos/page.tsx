'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/slots'
import type { Barber, Service } from '@/lib/types'

export default function ServicosPage() {
  const supabase = createClient()

  const [barbers, setBarbers] = useState<Barber[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [barbersRes, servicesRes] = await Promise.all([
      supabase.from('barbers').select('*').not('slug', 'is', null).order('name'),
      supabase.from('services').select('*').order('name'),
    ])

    const barbersData = (barbersRes.data || []) as Barber[]
    setBarbers(barbersData)
    setServices((servicesRes.data || []) as Service[])
    if (!selectedBarberId && barbersData.length > 0) {
      setSelectedBarberId(barbersData[0].id)
    }
    setLoading(false)
  }, [supabase, selectedBarberId])

  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleActive(service: Service) {
    await supabase.from('services').update({ active: !service.active }).eq('id', service.id)
    fetchData()
  }

  const barberServices = services.filter((s) => s.barber_id === selectedBarberId)

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto">
      {/* Barber selector */}
      <div className="mb-6">
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-gray)' }}>
          Editando serviços de:
        </label>
        <div className="flex items-center gap-2">
          {barbers.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBarberId(b.id)}
              className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors min-h-[40px]"
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

      {/* Title + new */}
      <div className="flex items-center justify-between mb-4">
        <h1
          className="text-3xl tracking-wide"
          style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
        >
          Serviços
        </h1>
        <button
          onClick={() => setShowNewModal(true)}
          className="rounded-xl px-4 py-2 text-xs font-semibold min-h-[40px] flex items-center gap-1"
          style={{ backgroundColor: 'var(--color-green-primary)', color: 'var(--color-white)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novo
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      ) : barberServices.length === 0 ? (
        <div
          className="rounded-xl p-6 text-center text-sm"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-gray)' }}
        >
          Nenhum serviço cadastrado. Clique em &quot;Novo&quot; para adicionar.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {barberServices.map((service) => (
            <div
              key={service.id}
              className="rounded-xl p-4 flex items-center justify-between"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                opacity: service.active ? 1 : 0.5,
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-white)' }}>
                    {service.name}
                  </p>
                  {!service.active && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#333', color: 'var(--color-gray)' }}>
                      INATIVO
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-gray)' }}>
                  <span>{service.duration_minutes} min</span>
                  <span style={{ color: 'var(--color-green-light)' }}>{formatPrice(service.price)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(service)}
                  className="text-[10px] px-2 py-1 rounded"
                  style={{ color: 'var(--color-gray)', border: '1px solid var(--color-border)' }}
                >
                  {service.active ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => setEditingService(service)}
                  className="p-2 rounded-lg"
                  style={{ color: 'var(--color-green-light)', border: '1px solid var(--color-border)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showNewModal || editingService) && selectedBarberId && (
        <ServiceFormModal
          barberId={selectedBarberId}
          service={editingService}
          onClose={() => { setShowNewModal(false); setEditingService(null) }}
          onSaved={() => { setShowNewModal(false); setEditingService(null); fetchData() }}
        />
      )}
    </div>
  )
}

function ServiceFormModal({
  barberId,
  service,
  onClose,
  onSaved,
}: {
  barberId: string
  service: Service | null
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const isEditing = !!service

  const [name, setName] = useState(service?.name || '')
  const [duration, setDuration] = useState(String(service?.duration_minutes || 30))
  const [price, setPrice] = useState(String(service?.price || ''))
  const [active, setActive] = useState(service?.active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim() || !duration || !price) return
    setSaving(true)
    setError(null)

    const data = {
      barber_id: barberId,
      name: name.trim(),
      duration_minutes: parseInt(duration),
      price: parseFloat(price),
      active,
    }

    const { error: dbError } = isEditing
      ? await supabase.from('services').update(data).eq('id', service!.id)
      : await supabase.from('services').insert(data)

    if (dbError) {
      setError('Erro ao salvar serviço.')
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
          {isEditing ? 'Editar serviço' : 'Novo serviço'}
        </h2>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-gray)' }}>Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Corte"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]"
              style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-gray)' }}>Duração (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]"
                style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-gray)' }}>Preço (R$)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]"
                style={{ backgroundColor: '#1e1e1e', border: '1px solid var(--color-border)', color: 'var(--color-white)' }}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm" style={{ color: 'var(--color-white)' }}>Serviço ativo (visível para clientes)</span>
          </label>
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
            disabled={saving}
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

import { useState, useEffect, useCallback } from 'react'
import { chamosSupabase } from '../../lib/supabase-helpers'
import type { Database } from '../../lib/database.types'
import { getChileHoy, getChileAhora } from '../lib/date-utils'

type Barbero = Database['public']['Tables']['barberos']['Row']
type Servicio = Database['public']['Tables']['servicios']['Row']

export interface ReservaFormData {
  barbero_id: string
  fecha: string
  hora: string
  cliente_nombre: string
  cliente_telefono: string
  cliente_email: string
  notas: string
}

export interface SlotDisponible {
  hora: string
  disponible: boolean
  motivo?: string
}

export interface SugerenciaParcial {
  servicio: Servicio
  horarios: SlotDisponible[]
}

const INITIAL_FORM: ReservaFormData = {
  barbero_id: '',
  fecha: '',
  hora: '',
  cliente_nombre: '',
  cliente_telefono: '',
  cliente_email: '',
  notas: '',
}

export function useReservaWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([])
  const [formData, setFormData] = useState<ReservaFormData>(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<SlotDisponible[]>([])
  const [sugerenciaParcial, setSugerenciaParcial] = useState<SugerenciaParcial | null>(null)

  const totalSteps = 5

  // Carga inicial en paralelo
  useEffect(() => {
    const loadData = async () => {
      try {
        const [barberosData, serviciosData] = await Promise.all([
          chamosSupabase.getBarberos(true),
          chamosSupabase.getServicios(true),
        ])
        setBarberos(barberosData || [])
        setServicios(serviciosData || [])
      } catch (error) {
        console.error('[useReservaWizard] Error loading initial data:', error)
      }
    }
    loadData()
  }, [])

  const calcularTotales = useCallback(() => {
    const counts = serviciosSeleccionados.reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const serviciosInfo = Object.entries(counts).map(([id, quantity]) => {
      const s = servicios.find(srv => srv.id === id)
      if (!s) return null
      return { ...s, quantity }
    }).filter(Boolean) as (Servicio & { quantity: number; tiempo_buffer?: number })[]

    const duracionServicios = serviciosInfo.reduce((sum, s) => sum + (s.duracion_minutos * s.quantity), 0)
    const maxBuffer = serviciosInfo.reduce((max, s) => Math.max(max, s.tiempo_buffer ?? 5), 0)
    const duracionTotal = duracionServicios + (serviciosInfo.length > 0 ? maxBuffer : 0)
    const precioTotal = serviciosInfo.reduce((sum, s) => sum + (s.precio * s.quantity), 0)

    return { duracionTotal, duracionServicios, precioTotal, serviciosInfo }
  }, [serviciosSeleccionados, servicios])

  const loadAvailableSlots = useCallback(async () => {
    try {
      setSugerenciaParcial(null)
      const { duracionTotal, serviciosInfo } = calcularTotales()
      const duracionSolicitada = duracionTotal > 0 ? duracionTotal : 30

      const data = await chamosSupabase.getHorariosDisponibles(
        formData.barbero_id,
        formData.fecha,
        duracionSolicitada
      )
      const slots = (Array.isArray(data) ? data : []) as SlotDisponible[]
      setAvailableSlots(slots)

      if (!slots.some(s => s.disponible) && serviciosInfo.length > 1) {
        const servicioAlternativo = [...serviciosInfo].sort((a, b) => a.duracion_minutos - b.duracion_minutos)[0]
        if (servicioAlternativo) {
          const dataAlternativa = await chamosSupabase.getHorariosDisponibles(
            formData.barbero_id,
            formData.fecha,
            servicioAlternativo.duracion_minutos
          )
          const slotsAlternativos = (dataAlternativa || []) as SlotDisponible[]
          if (slotsAlternativos.some(s => s.disponible)) {
            setSugerenciaParcial({ servicio: servicioAlternativo, horarios: slotsAlternativos })
          }
        }
      }
    } catch (error) {
      console.error('[useReservaWizard] Error loading slots:', error)
      setAvailableSlots([])
    }
  }, [formData.barbero_id, formData.fecha, calcularTotales])

  useEffect(() => {
    if (formData.fecha && formData.barbero_id) {
      loadAvailableSlots()
    }
  }, [formData.fecha, formData.barbero_id, serviciosSeleccionados, loadAvailableSlots])

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, totalSteps))
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1))

  const handleInputChange = (field: keyof ReservaFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleServicio = (servicioId: string) => {
    setServiciosSeleccionados(prev =>
      prev.includes(servicioId) ? prev.filter(id => id !== servicioId) : [...prev, servicioId]
    )
  }

  const actualizarCantidadServicio = (servicioId: string, delta: number) => {
    setServiciosSeleccionados(prev => {
      if (delta > 0) return [...prev, servicioId]
      const index = prev.lastIndexOf(servicioId)
      if (index === -1) return prev
      const next = [...prev]
      next.splice(index, 1)
      return next
    })
  }

  const calculateEndTime = (startTime: string) => {
    if (!startTime) return ''
    const { duracionServicios } = calcularTotales()
    const [hours, minutes] = startTime.split(':').map(Number)
    const date = getChileAhora()
    date.setHours(hours)
    date.setMinutes(minutes + (duracionServicios || 30))
    return date.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Santiago'
    }).substring(0, 5)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { serviciosInfo } = calcularTotales()
      const items = serviciosInfo.map(s => ({
        servicio_id: s.id,
        nombre: s.nombre,
        precio: s.precio,
        cantidad: s.quantity,
        subtotal: s.precio * s.quantity
      }))

      const response = await fetch('/api/crear-cita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicio_id: items[0]?.servicio_id,
          servicios_ids: serviciosSeleccionados,
          items,
          precio_final: calcularTotales().precioTotal,
          ...formData,
          cliente_email: formData.cliente_email || null,
          notas: formData.notas || null,
          estado: 'pendiente',
        }),
      })

      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Error al crear la cita')

      alert(result.message || '¡Cita reservada exitosamente! Te contactaremos pronto para confirmar.')

      setServiciosSeleccionados([])
      setFormData(INITIAL_FORM)
      setCurrentStep(1)
    } catch (error) {
      console.error('[useReservaWizard] Error en handleSubmit:', error)
      if (error instanceof Error) {
        alert(`Error: ${error.message}`)
      } else {
        alert('Error al reservar la cita. Por favor, inténtalo de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const getImageUrl = (imagen_url: string | null) => {
    if (!imagen_url) return 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80'
    if (imagen_url.startsWith('http')) return imagen_url
    return `/images/barberos/${imagen_url}`
  }

  const getMinDate = () => getChileHoy()
  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30)
    return maxDate.toISOString().split('T')[0]
  }

  return {
    currentStep,
    setCurrentStep,
    totalSteps,
    nextStep,
    prevStep,
    barberos,
    servicios,
    serviciosSeleccionados,
    setServiciosSeleccionados,
    formData,
    handleInputChange,
    availableSlots,
    sugerenciaParcial,
    loading,
    toggleServicio,
    actualizarCantidadServicio,
    calcularTotales,
    calculateEndTime,
    handleSubmit,
    getImageUrl,
    getMinDate,
    getMaxDate,
  }
}

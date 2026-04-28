import { useState, useEffect } from 'react'
import { DollarSign, Calendar, TrendingUp, Clock, Scissors, Award, Star } from 'lucide-react'
import { MetricasDiarias } from '@/types/barber-app'
import { useFormatCurrency } from '@/context/ConfigContext'
import toast from 'react-hot-toast'

interface DashboardSectionProps {
  barberoId: string
  nombreBarbero: string
}

export default function DashboardSection({ barberoId, nombreBarbero }: DashboardSectionProps) {
  const [metricas, setMetricas] = useState<MetricasDiarias | null>(null)
  const [loading, setLoading] = useState(true)
  const formatCurrency = useFormatCurrency()

  useEffect(() => {
    if (barberoId) {
      fetchMetricas()
    }
  }, [barberoId])

  const fetchMetricas = async () => {
    try {
      setLoading(true)
      // Usar la misma lógica que el mobile app
      const response = await fetch(`/api/barbero/metricas?barberoId=${barberoId}`)
      const result = await response.json()
      if (result.success) {
        setMetricas(result.data)
      } else {
        console.error('[DashboardSection] API error:', result.error ?? result)
        toast.error('No se pudieron cargar las métricas')
      }
    } catch (error) {
      console.error('[DashboardSection] Error fetching metrics:', error)
      toast.error('Error de conexión al cargar métricas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-container">
      <div className="welcome-header mb-8">
        <h1 className="text-3xl font-black text-white mb-2">¡Hola, {nombreBarbero}! 👋</h1>
        <p className="text-white/50 text-sm">Este es el resumen de tu actividad y ganancias acumuladas.</p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-white/50">Cargando métricas...</div>
      ) : metricas ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Card Principal: Acumulado Mes */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-gold/30 rounded-3xl p-6 flex flex-col gap-4 shadow-xl shadow-gold/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-gold/20 transition-all duration-500"></div>
              <div className="flex items-center gap-3 text-gold relative z-10">
                <TrendingUp className="w-6 h-6" />
                <span className="font-bold text-sm uppercase tracking-wider">Acumulado del Mes</span>
              </div>
              <div className="flex-1 relative z-10">
                <div className="text-3xl font-black text-gold mb-1">{formatCurrency(metricas.mes.ganancia)}</div>
                <div className="text-xs text-white/50">{metricas.mes.total_servicios} servicios realizados</div>
              </div>
              <div className="pt-4 mt-2 border-t border-gold/20 relative z-10 flex justify-between items-center text-sm">
                <span className="text-white/60">Esta Semana</span>
                <span className="font-bold text-white">{formatCurrency(metricas.semana.ganancia)}</span>
              </div>
            </div>

            {/* Hoy */}
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 flex flex-col gap-4 backdrop-blur-xl hover:border-white/20 transition-all">
              <div className="flex items-center gap-3 text-green-400">
                <DollarSign className="w-6 h-6" />
                <span className="font-bold text-sm uppercase tracking-wider text-white/80">Ganancia Hoy</span>
              </div>
              <div className="flex-1">
                <div className="text-3xl font-black text-white mb-1">{formatCurrency(metricas.hoy.ganancia)}</div>
                <div className="text-xs text-white/50">Realizado hoy</div>
              </div>
            </div>

            {/* Agenda */}
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 flex flex-col gap-4 backdrop-blur-xl hover:border-white/20 transition-all">
              <div className="flex items-center gap-3 text-blue-400">
                <Calendar className="w-6 h-6" />
                <span className="font-bold text-sm uppercase tracking-wider text-white/80">Citas Agendadas</span>
              </div>
              <div className="flex-1">
                <div className="text-3xl font-black text-white mb-1">{metricas.hoy.total_citas}</div>
                <div className="text-xs text-white/50">{metricas.hoy.pendientes} pendientes por atender</div>
              </div>
            </div>

            {/* Rating / Meta (Mock por ahora) */}
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 flex flex-col gap-4 backdrop-blur-xl hover:border-white/20 transition-all">
              <div className="flex items-center gap-3 text-yellow-400">
                <Star className="w-6 h-6" />
                <span className="font-bold text-sm uppercase tracking-wider text-white/80">Tu Calificación</span>
              </div>
              <div className="flex-1">
                <div className="text-3xl font-black text-white mb-1">4.9/5.0</div>
                <div className="text-xs text-white/50">Basado en últimas reseñas</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gold">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <strong className="block text-white text-sm">Próxima Cita</strong>
                <p className="text-white/50 text-xs m-0">En 25 minutos</p>
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gold">
                <Scissors className="w-6 h-6" />
              </div>
              <div>
                <strong className="block text-white text-sm">Servicio más pedido</strong>
                <p className="text-white/50 text-xs m-0">Corte Degradado</p>
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gold">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <strong className="block text-white text-sm">Meta Mensual</strong>
                <p className="text-white/50 text-xs m-0">85% completado</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-10 text-red-400">No se pudieron cargar las métricas.</div>
      )}

    </div>
  )
}

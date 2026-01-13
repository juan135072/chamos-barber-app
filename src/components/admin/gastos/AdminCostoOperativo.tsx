import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth, differenceInMinutes, parse } from 'date-fns'
import toast from 'react-hot-toast'

interface Gasto {
    monto: number
}

interface Horario {
    barbero_id: string
    hora_inicio: string
    hora_fin: string
    activo: boolean
}

interface Barbero {
    id: string
    nombre: string
    apellido: string
}

export default function AdminCostoOperativo() {
    const [loading, setLoading] = useState(true)
    const [totalGastos, setTotalGastos] = useState(0)
    const [horasTotalesMensuales, setHorasTotalesMensuales] = useState(0)
    const [costoPorHora, setCostoPorHora] = useState(0)
    const [barberos, setBarberos] = useState<Barbero[]>([])
    const [selectedBarberoId, setSelectedBarberoId] = useState<string>('')
    const [horasSimulacion, setHorasSimulacion] = useState(8)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const start = startOfMonth(new Date())
            const end = endOfMonth(new Date())

            // 1. Cargar Gastos del mes actual
            const { data: gastosData, error: gastosError } = await (supabase as any)
                .from('gastos')
                .select('monto')
                .gte('fecha', format(start, 'yyyy-MM-dd'))
                .lte('fecha', format(end, 'yyyy-MM-dd'))

            if (gastosError) throw gastosError
            const sumGastos = (gastosData as Gasto[])?.reduce((acc, g) => acc + Number(g.monto), 0) || 0
            setTotalGastos(sumGastos)

            // 2. Cargar Barberos
            const { data: barberosData, error: barberosError } = await (supabase as any)
                .from('barberos')
                .select('id, nombre, apellido')
                .eq('activo', true)

            if (barberosError) throw barberosError
            setBarberos(barberosData || [])
            if (barberosData?.length > 0) setSelectedBarberoId(barberosData[0].id)

            // 3. Cargar Horarios de Atención para calcular capacidad total
            const { data: horariosData, error: horariosError } = await (supabase as any)
                .from('horarios_atencion')
                .select('*')
                .eq('activo', true)

            if (horariosError) throw horariosError

            // Calcular horas totales a la semana
            let minutosSemanales = 0
            horariosData?.forEach((h: Horario) => {
                const inicio = parse(h.hora_inicio, 'HH:mm:ss', new Date())
                const fin = parse(h.hora_fin, 'HH:mm:ss', new Date())
                minutosSemanales += Math.abs(differenceInMinutes(fin, inicio))
            })

            const horasSemanales = minutosSemanales / 60
            const horasMensuales = horasSemanales * 4.34 // Promedio de semanas por mes
            setHorasTotalesMensuales(horasMensuales)

            const costoHora = horasMensuales > 0 ? sumGastos / horasMensuales : 0
            setCostoPorHora(costoHora)

        } catch (error) {
            console.error('Error loading operational cost data:', error)
            toast.error('Error al cargar datos de costos')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    const barberoSeleccionado = barberos.find(b => b.id === selectedBarberoId)
    const perdidaSimulada = costoPorHora * horasSimulacion

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#111] border border-white/5 p-6 rounded-xl">
                    <p className="text-gray-400 text-sm mb-1">Gastos del Mes</p>
                    <h3 className="text-2xl font-bold text-white">${totalGastos.toLocaleString()}</h3>
                    <p className="text-xs text-gray-500 mt-2">Basado en gastos registrados</p>
                </div>
                <div className="bg-[#111] border border-white/5 p-6 rounded-xl">
                    <p className="text-gray-400 text-sm mb-1">Capacidad Operativa</p>
                    <h3 className="text-2xl font-bold text-[#D4AF37]">{Math.round(horasTotalesMensuales)} hrs</h3>
                    <p className="text-xs text-gray-500 mt-2">Mensual (todos los barberos)</p>
                </div>
                <div className="bg-[#111] border-2 border-[#D4AF37]/30 p-6 rounded-xl">
                    <p className="text-[#D4AF37] text-sm mb-1 font-semibold">Costo por Hora Sillón</p>
                    <h3 className="text-2xl font-bold text-white">${costoPorHora.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                    <p className="text-xs text-gray-400 mt-2">Lo que cuesta mantener la barbería abierta por hora</p>
                </div>
            </div>

            <div className="bg-[#111] border border-white/5 p-8 rounded-xl">
                <h4 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <i className="fas fa-calculator text-[#D4AF37]"></i>
                    Simulador de Pérdida por Inactividad
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Seleccionar Barbero</label>
                            <select
                                value={selectedBarberoId}
                                onChange={(e) => setSelectedBarberoId(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                            >
                                {barberos.map(b => (
                                    <option key={b.id} value={b.id}>{b.nombre} {b.apellido}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Horas de Inactividad (Falta/Tardanza)</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="1"
                                    max="48"
                                    value={horasSimulacion}
                                    onChange={(e) => setHorasSimulacion(Number(e.target.value))}
                                    className="flex-1 accent-[#D4AF37]"
                                />
                                <span className="bg-black border border-white/10 px-4 py-1 rounded-md text-white font-mono w-16 text-center">
                                    {horasSimulacion}h
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-xl flex flex-col items-center justify-center text-center">
                        <i className="fas fa-exclamation-triangle text-red-500 text-3xl mb-4"></i>
                        <p className="text-gray-400 text-sm mb-2">Si <strong>{barberoSeleccionado?.nombre}</strong> falta <strong>{horasSimulacion} horas</strong></p>
                        <p className="text-white text-sm">La barbería pierde aproximadamente:</p>
                        <h2 className="text-4xl font-bold text-red-500 my-2">${perdidaSimulada.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
                        <p className="text-xs text-gray-500">Este monto representa el costo fijo que no se cubrió debido a la falta de producción en ese sillón.</p>
                    </div>
                </div>
            </div>

            <div className="bg-[#111] border border-white/5 p-6 rounded-xl">
                <h4 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">¿Cómo se calcula esto?</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-2 text-gray-500">
                        <p><strong className="text-gray-300">1. Gastos Totales:</strong> Suma de todos los egresos (arriendo, luz, agua, insumos, sueldos fijos) registrados en el mes actual.</p>
                        <p><strong className="text-gray-300">2. Capacidad Operativa:</strong> Suma de todas las horas que la barbería está abierta según el horario de atención de cada barbero.</p>
                    </div>
                    <div className="space-y-2 text-gray-500">
                        <p><strong className="text-gray-300">3. Costo por Hora:</strong> `Gastos / Capacidad Operativa`. Es el dinero que se "quema" cada hora que la barbería está funcionando, independientemente de si hay clientes o no.</p>
                        <p><strong className="text-gray-300">4. Punto de Equilibrio:</strong> Cada barbero debe generar al menos este monto por hora (en el ingreso que queda para la casa) solo para cubrir los gastos básicos.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

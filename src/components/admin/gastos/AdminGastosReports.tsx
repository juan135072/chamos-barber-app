import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function AdminGastosReports() {
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
    const [loading, setLoading] = useState(false)

    const fetchReportData = async () => {
        setLoading(true)
        try {
            const { data, error } = await (supabase as any)
                .from('gastos')
                .select(`
          *,
          categoria:gastos_categorias(nombre)
        `)
                .gte('fecha', startDate)
                .lte('fecha', endDate)
                .order('fecha', { ascending: true })

            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error fetching report:', error)
            toast.error('Error al generar datos del reporte')
            return []
        } finally {
            setLoading(false)
        }
    }

    const exportPDF = async () => {
        const data = await fetchReportData()
        if (data.length === 0) {
            toast('No hay datos para exportar en el rango seleccionado')
            return
        }

        const doc = new jsPDF()

        // Header
        doc.setFontSize(18)
        doc.setTextColor(212, 175, 55) // Gold
        doc.text('Chamos Barber - Reporte de Costos y Gastos', 14, 20)

        doc.setFontSize(10)
        doc.setTextColor(100)
        doc.text(`Período: ${startDate} al ${endDate}`, 14, 28)
        doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 33)

        // Table
        const tableData = data.map(item => [
            format(new Date(item.fecha), 'dd/MM/yyyy'),
            item.descripcion,
            item.categoria?.nombre || '-',
            item.tipo,
            `$${Number(item.monto).toLocaleString()}`
        ])

        const totalGastos = data.filter(d => d.tipo === 'GASTO').reduce((acc, curr) => acc + Number(curr.monto), 0)
        const totalCostos = data.filter(d => d.tipo === 'COSTO').reduce((acc, curr) => acc + Number(curr.monto), 0)

        autoTable(doc, {
            startY: 40,
            head: [['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [17, 17, 17], textColor: [212, 175, 55] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
        })

        // Totales
        const finalY = (doc as any).lastAutoTable.finalY + 10
        doc.setFontSize(12)
        doc.setTextColor(0)
        doc.text(`Total Gastos: $${totalGastos.toLocaleString()}`, 14, finalY)
        doc.text(`Total Costos: $${totalCostos.toLocaleString()}`, 14, finalY + 6)
        doc.text(`TOTAL GENERAL: $${(totalGastos + totalCostos).toLocaleString()}`, 14, finalY + 14)

        doc.save(`reporte_gastos_${startDate}_${endDate}.pdf`)
        toast.success('PDF generado exitosamente')
    }

    const exportExcel = async () => {
        const data = await fetchReportData()
        if (data.length === 0) {
            toast('No hay datos para exportar en el rango seleccionado')
            return
        }

        const excelData = data.map(item => ({
            Fecha: item.fecha,
            Descripción: item.descripcion,
            Categoría: item.categoria?.nombre || '-',
            Tipo: item.tipo,
            Monto: Number(item.monto),
            RegistradoPor: item.registrado_por
        }))

        const worksheet = XLSX.utils.json_to_sheet(excelData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Gastos')

        XLSX.writeFile(workbook, `reporte_gastos_${startDate}_${endDate}.xlsx`)
        toast.success('Excel generado exitosamente')
    }

    return (
        <div className="bg-[#111] p-6 rounded-xl border border-white/5 space-y-8">
            <div>
                <h3 className="text-xl font-semibold text-white mb-2">Generar Informes</h3>
                <p className="text-gray-400 text-sm">Selecciona un rango de fechas para exportar los movimientos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm text-gray-500 mb-2">Fecha Inicio</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#D4AF37]"
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-500 mb-2">Fecha Fin</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#D4AF37]"
                    />
                </div>
            </div>

            <div className="flex gap-4 pt-4">
                <button
                    onClick={exportPDF}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                    <i className="fas fa-file-pdf"></i>
                    Exportar PDF
                </button>
                <button
                    onClick={exportExcel}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                    <i className="fas fa-file-excel"></i>
                    Exportar Excel
                </button>
            </div>
        </div>
    )
}

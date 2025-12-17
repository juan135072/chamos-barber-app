/**
 * =====================================================
 * 📄 PDF GENERATOR - LIQUIDACIONES
 * =====================================================
 * Genera PDFs profesionales con branding Chamos Barber
 */

import jsPDF from 'jspdf'
import { Liquidacion, formatCLP, formatFecha } from './supabase-liquidaciones'

// Colores del branding Chamos Barber
const COLORS = {
  primary: '#D4AF37', // Oro
  dark: '#121212', // Negro
  darkGray: '#1E1E1E',
  lightGray: '#888888',
  white: '#FFFFFF',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6'
}

/**
 * Genera PDF de liquidación con diseño profesional
 */
export async function generarPDFLiquidacion(liquidacion: Liquidacion): Promise<void> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPosition = 20

  // ==================== HEADER ====================
  // Fondo negro en header
  doc.setFillColor(COLORS.dark)
  doc.rect(0, 0, pageWidth, 50, 'F')

  // Logo / Título con estilo
  doc.setFontSize(28)
  doc.setTextColor(COLORS.primary)
  doc.setFont('helvetica', 'bold')
  doc.text('CHAMOS BARBER', pageWidth / 2, 20, { align: 'center' })

  doc.setFontSize(12)
  doc.setTextColor(COLORS.lightGray)
  doc.setFont('helvetica', 'normal')
  doc.text('Barbería Premium', pageWidth / 2, 28, { align: 'center' })

  // Línea dorada decorativa
  doc.setDrawColor(COLORS.primary)
  doc.setLineWidth(1.5)
  doc.line(20, 35, pageWidth - 20, 35)

  // Subtítulo LIQUIDACIÓN
  doc.setFontSize(16)
  doc.setTextColor(COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.text('LIQUIDACIÓN DE COMISIONES', pageWidth / 2, 45, { align: 'center' })

  yPosition = 60

  // ==================== INFORMACIÓN DE LIQUIDACIÓN ====================
  // Box con fondo gris oscuro
  doc.setFillColor(COLORS.darkGray)
  doc.roundedRect(20, yPosition, pageWidth - 40, 35, 3, 3, 'F')

  doc.setFontSize(10)
  doc.setTextColor(COLORS.lightGray)
  doc.setFont('helvetica', 'normal')

  // Número de liquidación
  doc.text('Número de Liquidación:', 25, yPosition + 8)
  doc.setTextColor(COLORS.primary)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(liquidacion.numero_liquidacion, 75, yPosition + 8)

  // Fecha de emisión
  doc.setFontSize(10)
  doc.setTextColor(COLORS.lightGray)
  doc.setFont('helvetica', 'normal')
  doc.text('Fecha de Emisión:', 25, yPosition + 18)
  doc.setTextColor(COLORS.white)
  doc.text(formatFecha(liquidacion.created_at), 75, yPosition + 18)

  // Estado
  doc.setTextColor(COLORS.lightGray)
  doc.text('Estado:', 25, yPosition + 28)
  
  const estadoColor = liquidacion.estado === 'pagada' ? COLORS.green :
                      liquidacion.estado === 'pendiente' ? COLORS.blue :
                      COLORS.red
  doc.setTextColor(estadoColor)
  doc.setFont('helvetica', 'bold')
  doc.text(liquidacion.estado.toUpperCase(), 75, yPosition + 28)

  // Fecha de pago (si está pagada)
  if (liquidacion.estado === 'pagada' && liquidacion.fecha_pago) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.lightGray)
    doc.text('Fecha de Pago:', pageWidth / 2 + 10, yPosition + 18)
    doc.setTextColor(COLORS.white)
    doc.text(formatFecha(liquidacion.fecha_pago), pageWidth / 2 + 50, yPosition + 18)
  }

  yPosition += 45

  // ==================== INFORMACIÓN DEL BARBERO ====================
  doc.setFillColor(COLORS.primary)
  doc.setDrawColor(COLORS.primary)
  doc.roundedRect(20, yPosition, pageWidth - 40, 2, 1, 1, 'F')
  
  yPosition += 8

  doc.setFontSize(14)
  doc.setTextColor(COLORS.primary)
  doc.setFont('helvetica', 'bold')
  doc.text('BARBERO', 25, yPosition)

  yPosition += 8

  doc.setFontSize(11)
  doc.setTextColor(COLORS.white)
  doc.setFont('helvetica', 'bold')
  const nombreCompleto = `${liquidacion.barbero?.nombre || ''} ${liquidacion.barbero?.apellido || ''}`
  doc.text(nombreCompleto, 25, yPosition)

  yPosition += 7

  doc.setFontSize(10)
  doc.setTextColor(COLORS.lightGray)
  doc.setFont('helvetica', 'normal')
  doc.text(`Email: ${liquidacion.barbero?.email || 'N/A'}`, 25, yPosition)

  yPosition += 6

  doc.text(`Teléfono: ${liquidacion.barbero?.telefono || 'N/A'}`, 25, yPosition)

  yPosition += 15

  // ==================== PERÍODO DE LIQUIDACIÓN ====================
  doc.setFillColor(COLORS.primary)
  doc.roundedRect(20, yPosition, pageWidth - 40, 2, 1, 1, 'F')
  
  yPosition += 8

  doc.setFontSize(14)
  doc.setTextColor(COLORS.primary)
  doc.setFont('helvetica', 'bold')
  doc.text('PERÍODO', 25, yPosition)

  yPosition += 8

  doc.setFontSize(10)
  doc.setTextColor(COLORS.lightGray)
  doc.setFont('helvetica', 'normal')
  doc.text('Desde:', 25, yPosition)
  doc.setTextColor(COLORS.white)
  doc.text(formatFecha(liquidacion.fecha_inicio), 50, yPosition)

  yPosition += 7

  doc.setTextColor(COLORS.lightGray)
  doc.text('Hasta:', 25, yPosition)
  doc.setTextColor(COLORS.white)
  doc.text(formatFecha(liquidacion.fecha_fin), 50, yPosition)

  yPosition += 15

  // ==================== RESUMEN FINANCIERO ====================
  doc.setFillColor(COLORS.primary)
  doc.roundedRect(20, yPosition, pageWidth - 40, 2, 1, 1, 'F')
  
  yPosition += 8

  doc.setFontSize(14)
  doc.setTextColor(COLORS.primary)
  doc.setFont('helvetica', 'bold')
  doc.text('RESUMEN FINANCIERO', 25, yPosition)

  yPosition += 10

  // Box de resumen
  doc.setFillColor(COLORS.darkGray)
  doc.roundedRect(20, yPosition, pageWidth - 40, 45, 3, 3, 'F')

  yPosition += 10

  // Línea 1: Total ventas
  doc.setFontSize(11)
  doc.setTextColor(COLORS.lightGray)
  doc.setFont('helvetica', 'normal')
  doc.text('Total de Ventas:', 30, yPosition)
  
  doc.setTextColor(COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.text(liquidacion.total_ventas.toString(), pageWidth - 30, yPosition, { align: 'right' })

  yPosition += 8

  // Línea 2: Monto vendido
  doc.setTextColor(COLORS.lightGray)
  doc.setFont('helvetica', 'normal')
  doc.text('Monto Total Vendido:', 30, yPosition)
  
  doc.setTextColor(COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.text(formatCLP(liquidacion.total_vendido), pageWidth - 30, yPosition, { align: 'right' })

  yPosition += 8

  // Línea 3: Porcentaje de comisión
  doc.setTextColor(COLORS.lightGray)
  doc.setFont('helvetica', 'normal')
  doc.text('Porcentaje de Comisión:', 30, yPosition)
  
  doc.setTextColor(COLORS.primary)
  doc.setFont('helvetica', 'bold')
  doc.text(`${liquidacion.porcentaje_comision}%`, pageWidth - 30, yPosition, { align: 'right' })

  yPosition += 12

  // Línea divisoria
  doc.setDrawColor(COLORS.primary)
  doc.setLineWidth(0.5)
  doc.line(30, yPosition, pageWidth - 30, yPosition)

  yPosition += 8

  // Línea TOTAL: Comisión calculada
  doc.setFontSize(13)
  doc.setTextColor(COLORS.primary)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL A PAGAR:', 30, yPosition)
  
  doc.setFontSize(16)
  doc.setTextColor(COLORS.green)
  doc.text(formatCLP(liquidacion.total_comision), pageWidth - 30, yPosition, { align: 'right' })

  yPosition += 20

  // ==================== OBSERVACIONES ====================
  if (liquidacion.observaciones) {
    doc.setFillColor(COLORS.primary)
    doc.roundedRect(20, yPosition, pageWidth - 40, 2, 1, 1, 'F')
    
    yPosition += 8

    doc.setFontSize(14)
    doc.setTextColor(COLORS.primary)
    doc.setFont('helvetica', 'bold')
    doc.text('OBSERVACIONES', 25, yPosition)

    yPosition += 8

    doc.setFontSize(10)
    doc.setTextColor(COLORS.lightGray)
    doc.setFont('helvetica', 'normal')
    
    // Split text si es muy largo
    const observacionesLines = doc.splitTextToSize(liquidacion.observaciones, pageWidth - 50)
    doc.text(observacionesLines, 25, yPosition)
    
    yPosition += (observacionesLines.length * 5) + 10
  }

  // ==================== FOOTER ====================
  const footerY = pageHeight - 30

  // Línea dorada decorativa
  doc.setDrawColor(COLORS.primary)
  doc.setLineWidth(1)
  doc.line(20, footerY, pageWidth - 20, footerY)

  // Información de contacto
  doc.setFontSize(9)
  doc.setTextColor(COLORS.lightGray)
  doc.setFont('helvetica', 'normal')
  doc.text('Chamos Barber - Barbería Premium', pageWidth / 2, footerY + 8, { align: 'center' })
  doc.text('www.chamosbarber.com | contacto@chamosbarber.com', pageWidth / 2, footerY + 14, { align: 'center' })
  
  // Nota legal
  doc.setFontSize(8)
  doc.setTextColor(COLORS.lightGray)
  doc.text('Este documento es una liquidación de comisiones. No constituye un comprobante fiscal.', pageWidth / 2, footerY + 20, { align: 'center' })

  // ==================== MARCA DE AGUA (si está pendiente) ====================
  if (liquidacion.estado === 'pendiente') {
    doc.setFontSize(60)
    doc.setTextColor(200, 200, 200, 0.1)
    doc.setFont('helvetica', 'bold')
    doc.saveGraphicsState()
    doc.text('PENDIENTE', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45
    })
    doc.restoreGraphicsState()
  }

  // ==================== GUARDAR PDF ====================
  const fileName = `Liquidacion_${liquidacion.numero_liquidacion}_${nombreCompleto.replace(/\s+/g, '_')}.pdf`
  doc.save(fileName)
}

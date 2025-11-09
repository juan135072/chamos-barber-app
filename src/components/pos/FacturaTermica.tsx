import jsPDF from 'jspdf'

interface ItemFactura {
  servicio_id: string
  nombre: string
  precio: number
  cantidad: number
  subtotal: number
}

interface DatosFactura {
  id: string
  numero_factura: string
  cliente_nombre: string
  cliente_rut?: string
  tipo_documento: 'boleta' | 'factura'
  items: ItemFactura[]
  subtotal: number
  total: number
  metodo_pago: string
  monto_recibido?: number
  cambio?: number
  created_at: string
  barbero?: {
    nombre: string
    apellido: string
  }
}

// Configuración del ticket (papel térmico 80mm = 302px width en 203 DPI)
const TICKET_WIDTH = 80 // mm
const MARGIN = 5 // mm
const LINE_HEIGHT = 5 // mm

export class FacturaTermica {
  private pdf: jsPDF
  private yPos: number
  private readonly contentWidth: number

  constructor() {
    // Crear PDF con tamaño personalizado para ticket térmico 80mm
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [TICKET_WIDTH, 297] // Altura máxima A4
    })
    this.yPos = MARGIN
    this.contentWidth = TICKET_WIDTH - (MARGIN * 2)
  }

  private addText(text: string, size: number = 10, align: 'left' | 'center' | 'right' = 'left', bold: boolean = false) {
    this.pdf.setFontSize(size)
    
    const font = bold ? 'helvetica' : 'helvetica'
    const style = bold ? 'bold' : 'normal'
    this.pdf.setFont(font, style)

    let x = MARGIN
    if (align === 'center') {
      x = TICKET_WIDTH / 2
    } else if (align === 'right') {
      x = TICKET_WIDTH - MARGIN
    }

    this.pdf.text(text, x, this.yPos, { align })
    this.yPos += LINE_HEIGHT
  }

  private addLine() {
    this.pdf.setLineWidth(0.1)
    this.pdf.line(MARGIN, this.yPos, TICKET_WIDTH - MARGIN, this.yPos)
    this.yPos += LINE_HEIGHT / 2
  }

  private addSpace(multiplier: number = 1) {
    this.yPos += LINE_HEIGHT * multiplier
  }

  private addItemLine(descripcion: string, valor: string) {
    this.pdf.setFontSize(9)
    this.pdf.setFont('helvetica', 'normal')
    
    // Descripción a la izquierda
    this.pdf.text(descripcion, MARGIN, this.yPos)
    
    // Valor a la derecha
    this.pdf.text(valor, TICKET_WIDTH - MARGIN, this.yPos, { align: 'right' })
    
    this.yPos += LINE_HEIGHT
  }

  generarFactura(datos: DatosFactura): void {
    // HEADER - Logo/Nombre del negocio
    this.addText('CHAMOS BARBERÍA', 14, 'center', true)
    this.addText('Barbería Profesional', 9, 'center')
    this.addSpace(0.5)
    
    // Información del negocio
    this.addText('RIF: J-12345678-9', 8, 'center')
    this.addText('Telf: +58 412-XXX-XXXX', 8, 'center')
    this.addText('Dirección: Valencia, Carabobo', 8, 'center')
    this.addSpace()
    
    this.addLine()
    this.addSpace()

    // Tipo de documento
    const tipoDoc = datos.tipo_documento === 'factura' ? 'FACTURA' : 'BOLETA'
    this.addText(tipoDoc, 12, 'center', true)
    this.addText(`No. ${datos.numero_factura}`, 10, 'center', true)
    this.addSpace()

    // Fecha y hora
    const fecha = new Date(datos.created_at)
    const fechaStr = fecha.toLocaleDateString('es-VE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
    const horaStr = fecha.toLocaleTimeString('es-VE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    this.addText(`Fecha: ${fechaStr}`, 9, 'left')
    this.addText(`Hora: ${horaStr}`, 9, 'left')
    this.addSpace()

    this.addLine()
    this.addSpace()

    // Información del cliente
    this.addText('CLIENTE', 10, 'left', true)
    this.addText(datos.cliente_nombre, 9, 'left')
    if (datos.cliente_rut) {
      this.addText(`RUT: ${datos.cliente_rut}`, 9, 'left')
    }
    this.addSpace()

    // Barbero
    if (datos.barbero) {
      this.addText(`Atendido por: ${datos.barbero.nombre} ${datos.barbero.apellido}`, 9, 'left')
      this.addSpace()
    }

    this.addLine()
    this.addSpace()

    // Items/Servicios
    this.addText('SERVICIOS', 10, 'left', true)
    this.addSpace(0.5)

    datos.items.forEach((item) => {
      // Nombre del servicio
      this.pdf.setFontSize(9)
      this.pdf.setFont('helvetica', 'bold')
      this.pdf.text(item.nombre, MARGIN, this.yPos)
      this.yPos += LINE_HEIGHT

      // Cantidad x Precio = Subtotal
      const detalle = `${item.cantidad} x $${item.precio.toFixed(2)} = $${item.subtotal.toFixed(2)}`
      this.pdf.setFont('helvetica', 'normal')
      this.pdf.text(detalle, MARGIN + 2, this.yPos)
      this.yPos += LINE_HEIGHT
      this.addSpace(0.3)
    })

    this.addSpace()
    this.addLine()
    this.addSpace()

    // Totales
    if (datos.subtotal !== datos.total) {
      this.addItemLine('Subtotal:', `$${datos.subtotal.toFixed(2)}`)
    }
    
    this.pdf.setFontSize(11)
    this.pdf.setFont('helvetica', 'bold')
    this.addItemLine('TOTAL:', `$${datos.total.toFixed(2)}`)
    this.addSpace()

    // Método de pago
    const metodoPagoLabels: { [key: string]: string } = {
      efectivo: '💵 Efectivo',
      tarjeta: '💳 Tarjeta',
      transferencia: '📱 Transferencia',
      zelle: '💰 Zelle',
      binance: '₿ Binance'
    }
    
    this.addText(`Método de pago:`, 9, 'left')
    this.addText(metodoPagoLabels[datos.metodo_pago] || datos.metodo_pago, 10, 'left', true)

    // Monto recibido y cambio (solo para efectivo)
    if (datos.metodo_pago === 'efectivo' && datos.monto_recibido) {
      this.addSpace(0.5)
      this.addItemLine('Recibido:', `$${datos.monto_recibido.toFixed(2)}`)
      if (datos.cambio && datos.cambio > 0) {
        this.addItemLine('Cambio:', `$${datos.cambio.toFixed(2)}`)
      }
    }

    this.addSpace()
    this.addLine()
    this.addSpace()

    // Footer
    this.addText('¡Gracias por su preferencia!', 10, 'center', true)
    this.addText('Esperamos volver a verlo pronto', 8, 'center')
    this.addSpace()
    
    // Código QR o info adicional (opcional)
    this.addText('Síguenos en redes sociales:', 8, 'center')
    this.addText('@chamosbarberia', 9, 'center', true)
    this.addSpace(2)

    // Ya no intentamos ajustar el tamaño del PDF
    // El contenido ya está generado correctamente en this.pdf
  }

  descargar(nombreArchivo?: string): void {
    const nombre = nombreArchivo || `factura_${Date.now()}.pdf`
    this.pdf.save(nombre)
  }

  imprimir(): void {
    // Abrir diálogo de impresión
    window.open(this.pdf.output('bloburl'), '_blank')
  }

  obtenerBase64(): string {
    return this.pdf.output('datauristring')
  }

  obtenerBlob(): Blob {
    return this.pdf.output('blob')
  }
}

// Función helper para generar e imprimir factura
export async function generarEImprimirFactura(datos: DatosFactura, accion: 'imprimir' | 'descargar' | 'ambos' = 'imprimir') {
  try {
    const factura = new FacturaTermica()
    factura.generarFactura(datos)

    if (accion === 'imprimir' || accion === 'ambos') {
      factura.imprimir()
    }

    if (accion === 'descargar' || accion === 'ambos') {
      const nombreArchivo = `factura_${datos.numero_factura}.pdf`
      factura.descargar(nombreArchivo)
    }

    return true
  } catch (error) {
    console.error('Error generando factura:', error)
    return false
  }
}

// Función para obtener datos de factura desde Supabase
export async function obtenerDatosFactura(facturaId: string, supabase: any): Promise<DatosFactura | null> {
  try {
    const { data, error } = await supabase
      .from('facturas')
      .select(`
        id,
        numero_factura,
        cliente_nombre,
        cliente_rut,
        tipo_documento,
        items,
        subtotal,
        total,
        metodo_pago,
        monto_recibido,
        cambio,
        created_at,
        barbero:barberos!facturas_barbero_id_fkey (
          nombre,
          apellido
        )
      `)
      .eq('id', facturaId)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error obteniendo datos de factura:', error)
    return null
  }
}

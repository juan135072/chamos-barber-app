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
  private logoLoaded: boolean = false
  private logoData: string | null = null

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

  private async loadLogo(): Promise<void> {
    try {
      const response = await fetch('/chamos-logo.png')
      const blob = await response.blob()
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          this.logoData = reader.result as string
          this.logoLoaded = true
          resolve()
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Error loading logo:', error)
      this.logoLoaded = false
    }
  }

  private addLogo() {
    if (this.logoLoaded && this.logoData) {
      const logoWidth = 30 // mm
      const logoHeight = 15 // mm (ajustar según aspect ratio del logo)
      const xPos = (TICKET_WIDTH - logoWidth) / 2 // Centrar
      
      try {
        this.pdf.addImage(this.logoData, 'PNG', xPos, this.yPos, logoWidth, logoHeight)
        this.yPos += logoHeight + 3
      } catch (error) {
        console.error('Error adding logo to PDF:', error)
      }
    }
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

  private addLine(style: 'solid' | 'dashed' = 'solid') {
    this.pdf.setLineWidth(0.1)
    
    // Note: setLineDash not available in some jsPDF versions
    // if (style === 'dashed') {
    //   this.pdf.setLineDash([1, 1])
    // } else {
    //   this.pdf.setLineDash([])
    // }
    
    this.pdf.line(MARGIN, this.yPos, TICKET_WIDTH - MARGIN, this.yPos)
    // this.pdf.setLineDash([]) // Reset
    this.yPos += LINE_HEIGHT / 2
  }

  private addSpace(multiplier: number = 1) {
    this.yPos += LINE_HEIGHT * multiplier
  }

  private addItemLine(descripcion: string, valor: string, bold: boolean = false) {
    const fontSize = bold ? 10 : 9
    this.pdf.setFontSize(fontSize)
    this.pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    
    // Descripción a la izquierda
    this.pdf.text(descripcion, MARGIN, this.yPos)
    
    // Valor a la derecha
    this.pdf.text(valor, TICKET_WIDTH - MARGIN, this.yPos, { align: 'right' })
    
    this.yPos += LINE_HEIGHT
  }

  private addBox(text: string, size: number = 12, textSize: number = 10) {
    const boxHeight = size
    const boxWidth = this.contentWidth
    const xPos = MARGIN
    const yPos = this.yPos - 3 // Ajustar para centrar texto

    // Dibujar rectángulo
    this.pdf.setFillColor(212, 175, 55) // Color dorado
    this.pdf.rect(xPos, yPos, boxWidth, boxHeight, 'F')
    
    // Agregar texto centrado
    this.pdf.setTextColor(0, 0, 0) // Negro
    this.pdf.setFontSize(textSize)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.text(text, TICKET_WIDTH / 2, this.yPos + 2, { align: 'center' })
    
    // Reset color
    this.pdf.setTextColor(0, 0, 0)
    
    this.yPos += boxHeight + 3
  }

  async generarFactura(datos: DatosFactura): Promise<void> {
    // Cargar logo primero
    await this.loadLogo()

    // HEADER - Logo
    this.addLogo()
    
    // Nombre del negocio
    this.addText('CHAMOS BARBER', 14, 'center', true)
    this.addText('Barbería Profesional', 9, 'center')
    this.addSpace(0.5)
    
    // Información del negocio
    this.addText('Rancagua 759, San Fernando', 8, 'center')
    this.addText("O'Higgins, Chile", 8, 'center')
    this.addText('Tel: +56 9 XXXX XXXX', 8, 'center')
    this.addText('www.chamosbarber.com', 8, 'center')
    this.addSpace()
    
    this.addLine('dashed')
    this.addSpace()

    // Tipo de documento en caja dorada
    const tipoDoc = datos.tipo_documento === 'factura' ? 'FACTURA' : 'BOLETA'
    this.addBox(`${tipoDoc} N° ${datos.numero_factura}`, 10, 11)
    this.addSpace(0.5)

    // Fecha y hora en formato más compacto
    const fecha = new Date(datos.created_at)
    const fechaStr = fecha.toLocaleDateString('es-CL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
    const horaStr = fecha.toLocaleTimeString('es-CL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    
    this.pdf.setFontSize(9)
    this.pdf.setFont('helvetica', 'normal')
    this.pdf.text(`Fecha: ${fechaStr}  Hora: ${horaStr}`, TICKET_WIDTH / 2, this.yPos, { align: 'center' })
    this.yPos += LINE_HEIGHT
    this.addSpace(0.5)

    this.addLine('dashed')
    this.addSpace()

    // Información del cliente en formato compacto
    this.addText('CLIENTE', 10, 'left', true)
    this.addText(datos.cliente_nombre, 9, 'left')
    if (datos.cliente_rut) {
      this.addText(`RUT: ${datos.cliente_rut}`, 8, 'left')
    }
    this.addSpace(0.5)

    // Barbero
    if (datos.barbero) {
      this.addText(`Atendido por: ${datos.barbero.nombre} ${datos.barbero.apellido}`, 9, 'left')
      this.addSpace(0.5)
    }

    this.addLine('dashed')
    this.addSpace()

    // Items/Servicios con diseño mejorado
    this.pdf.setFontSize(10)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.text('CANT', MARGIN, this.yPos)
    this.pdf.text('DESCRIPCIÓN', MARGIN + 10, this.yPos)
    this.pdf.text('PRECIO', TICKET_WIDTH - MARGIN, this.yPos, { align: 'right' })
    this.yPos += LINE_HEIGHT
    
    this.addLine('solid')
    this.addSpace(0.3)

    datos.items.forEach((item) => {
      // Cantidad
      this.pdf.setFontSize(9)
      this.pdf.setFont('helvetica', 'normal')
      this.pdf.text(`${item.cantidad}x`, MARGIN, this.yPos)
      
      // Nombre del servicio
      this.pdf.setFont('helvetica', 'bold')
      this.pdf.text(item.nombre, MARGIN + 10, this.yPos)
      
      // Precio
      this.pdf.setFont('helvetica', 'normal')
      this.pdf.text(`$${item.subtotal.toLocaleString('es-CL')}`, TICKET_WIDTH - MARGIN, this.yPos, { align: 'right' })
      
      this.yPos += LINE_HEIGHT
      
      // Detalle de precio unitario
      if (item.cantidad > 1) {
        this.pdf.setFontSize(8)
        this.pdf.text(`  ($${item.precio.toLocaleString('es-CL')} c/u)`, MARGIN + 10, this.yPos)
        this.yPos += LINE_HEIGHT * 0.8
      }
      
      this.addSpace(0.2)
    })

    this.addSpace(0.3)
    this.addLine('solid')
    this.addSpace()

    // Totales con mejor formato
    if (datos.subtotal !== datos.total) {
      this.addItemLine('Subtotal:', `$${datos.subtotal.toLocaleString('es-CL')}`)
      this.addSpace(0.2)
    }
    
    // Total en caja destacada
    const totalBox = `TOTAL: $${datos.total.toLocaleString('es-CL')}`
    this.pdf.setFillColor(0, 0, 0)
    this.pdf.rect(MARGIN, this.yPos - 3, this.contentWidth, 8, 'F')
    this.pdf.setTextColor(255, 255, 255) // Blanco
    this.pdf.setFontSize(12)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.text(totalBox, TICKET_WIDTH / 2, this.yPos + 2, { align: 'center' })
    this.pdf.setTextColor(0, 0, 0) // Reset a negro
    this.yPos += 10
    this.addSpace()

    // Método de pago con iconos textuales (SIN EMOJIS - jsPDF no los soporta)
    const metodoPagoLabels: { [key: string]: string } = {
      efectivo: '[$] Efectivo',
      tarjeta: '[*] Tarjeta',
      transferencia: '[T] Transferencia',
      zelle: '[Z] Zelle',
      binance: '[B] Binance Pay'
    }
    
    this.pdf.setFontSize(9)
    this.pdf.setFont('helvetica', 'normal')
    this.pdf.text('Método de pago:', MARGIN, this.yPos)
    this.yPos += LINE_HEIGHT
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.text(metodoPagoLabels[datos.metodo_pago] || datos.metodo_pago, MARGIN, this.yPos)
    this.yPos += LINE_HEIGHT

    // Monto recibido y cambio (solo para efectivo)
    if (datos.metodo_pago === 'efectivo' && datos.monto_recibido) {
      this.addSpace(0.5)
      this.addItemLine('Recibido:', `$${datos.monto_recibido.toLocaleString('es-CL')}`)
      if (datos.cambio && datos.cambio > 0) {
        this.addItemLine('Cambio:', `$${datos.cambio.toLocaleString('es-CL')}`, true)
      }
    }

    this.addSpace()
    this.addLine('dashed')
    this.addSpace()

    // Footer mejorado
    this.addText('¡GRACIAS POR TU PREFERENCIA!', 11, 'center', true)
    this.addText('Esperamos verte pronto', 9, 'center')
    this.addSpace()
    
    // Redes sociales
    this.pdf.setFontSize(8)
    this.pdf.setFont('helvetica', 'normal')
    this.pdf.text('Síguenos:', TICKET_WIDTH / 2, this.yPos, { align: 'center' })
    this.yPos += LINE_HEIGHT * 0.8
    
    this.pdf.setFontSize(9)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.text('@chamosbarber', TICKET_WIDTH / 2, this.yPos, { align: 'center' })
    this.yPos += LINE_HEIGHT
    
    this.pdf.setFontSize(8)
    this.pdf.setFont('helvetica', 'normal')
    this.pdf.text('Instagram | Facebook | TikTok', TICKET_WIDTH / 2, this.yPos, { align: 'center' })
    
    this.addSpace(2)
  }

  descargar(nombreArchivo?: string): void {
    const nombre = nombreArchivo || `factura_${Date.now()}.pdf`
    this.pdf.save(nombre)
  }

  imprimir(): void {
    // Generar Blob URL del PDF
    const pdfBlob = this.pdf.output('blob')
    const pdfUrl = URL.createObjectURL(pdfBlob)
    
    // Abrir ventana con el PDF
    const printWindow = window.open(pdfUrl, '_blank')
    
    if (printWindow) {
      // Esperar a que la ventana cargue y activar impresión automática
      printWindow.onload = function() {
        setTimeout(function() {
          printWindow.print()
          
          // Intentar cerrar ventana después de imprimir
          printWindow.onafterprint = function() {
            setTimeout(function() {
              printWindow.close()
              URL.revokeObjectURL(pdfUrl)
            }, 500)
          }
        }, 1000)
      }
    } else {
      // Si el popup está bloqueado, mostrar alert
      alert('Por favor, permite ventanas emergentes para imprimir boletas.')
      URL.revokeObjectURL(pdfUrl)
    }
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
    await factura.generarFactura(datos)

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

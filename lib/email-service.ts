// Servicio de Email para Chamos Barber
// Usa la API de Resend (https://resend.com) - Simple y moderna

export interface EmailCredentials {
  email: string
  password: string
  nombre: string
  apellido: string
}

export class EmailService {
  private apiKey: string | undefined
  private fromEmail: string
  
  constructor() {
    this.apiKey = process.env.RESEND_API_KEY
    this.fromEmail = process.env.EMAIL_FROM || 'Chamos Barber <noreply@chamosbarber.com>'
  }

  /**
   * Envía email con credenciales de acceso a un nuevo barbero
   */
  async sendCredentials(credentials: EmailCredentials): Promise<boolean> {
    try {
      // Si no hay API key configurada, solo loggeamos (modo desarrollo)
      if (!this.apiKey) {
        console.log('⚠️ [Email] RESEND_API_KEY no configurada - Modo desarrollo')
        console.log('📧 [Email] Credenciales que se enviarían:')
        console.log('   - To:', credentials.email)
        console.log('   - Nombre:', credentials.nombre, credentials.apellido)
        console.log('   - Password:', credentials.password)
        console.log('   - Login URL: https://chamosbarber.com/login')
        return true // Retornar éxito en desarrollo
      }

      const htmlContent = this.generateCredentialsEmail(credentials)
      const textContent = this.generateCredentialsEmailText(credentials)

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: credentials.email,
          subject: '🔑 Bienvenido a Chamos Barber - Tus Credenciales de Acceso',
          html: htmlContent,
          text: textContent
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ [Email] Error sending email:', error)
        return false
      }

      const data = await response.json()
      console.log('✅ [Email] Email sent successfully:', data.id)
      return true
    } catch (error) {
      console.error('❌ [Email] Error in sendCredentials:', error)
      return false
    }
  }

  /**
   * Envía email de reset de contraseña
   */
  async sendPasswordReset(credentials: EmailCredentials): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.log('⚠️ [Email] RESEND_API_KEY no configurada - Modo desarrollo')
        console.log('📧 [Email] Reset password que se enviaría a:', credentials.email)
        console.log('   - Nueva contraseña:', credentials.password)
        return true
      }

      const htmlContent = this.generatePasswordResetEmail(credentials)
      const textContent = this.generatePasswordResetEmailText(credentials)

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: credentials.email,
          subject: '🔐 Chamos Barber - Tu contraseña ha sido reseteada',
          html: htmlContent,
          text: textContent
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ [Email] Error sending reset email:', error)
        return false
      }

      const data = await response.json()
      console.log('✅ [Email] Reset email sent successfully:', data.id)
      return true
    } catch (error) {
      console.error('❌ [Email] Error in sendPasswordReset:', error)
      return false
    }
  }

  /**
   * Genera el HTML del email de credenciales
   */
  private generateCredentialsEmail(creds: EmailCredentials): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a Chamos Barber</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Logo / Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #D4AF37; font-size: 32px; margin: 0;">Chamos Barber</h1>
      <p style="color: #999; font-size: 14px; margin: 10px 0 0 0;">Tu barbería de confianza</p>
    </div>

    <!-- Contenido Principal -->
    <div style="background-color: #2a2a2a; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
      <h2 style="color: #D4AF37; margin-top: 0;">¡Bienvenido al equipo, ${creds.nombre}! 🎉</h2>
      
      <p style="color: #ccc; line-height: 1.6;">
        Tu solicitud ha sido aprobada y ahora tienes acceso al panel de barberos de Chamos Barber.
      </p>

      <!-- Credenciales Box -->
      <div style="background-color: #1a1a1a; border: 2px solid #D4AF37; border-radius: 8px; padding: 20px; margin: 30px 0;">
        <h3 style="color: #D4AF37; margin-top: 0; font-size: 18px;">📧 Tus Credenciales de Acceso</h3>
        
        <div style="margin: 15px 0;">
          <p style="color: #999; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase;">Email</p>
          <p style="color: #fff; font-size: 16px; margin: 0; font-weight: bold;">${creds.email}</p>
        </div>

        <div style="margin: 15px 0;">
          <p style="color: #999; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase;">Contraseña</p>
          <p style="color: #D4AF37; font-size: 18px; margin: 0; font-family: 'Courier New', monospace; font-weight: bold; letter-spacing: 1px;">
            ${creds.password}
          </p>
        </div>
      </div>

      <!-- Botón de Acción -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://chamosbarber.com/login" 
           style="display: inline-block; background-color: #D4AF37; color: #000; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
          🔓 Iniciar Sesión Ahora
        </a>
      </div>

      <!-- Información Adicional -->
      <div style="background-color: rgba(212, 175, 55, 0.1); border-left: 3px solid #D4AF37; padding: 15px; margin: 20px 0;">
        <p style="color: #D4AF37; margin: 0 0 10px 0; font-weight: bold;">⚠️ Importante:</p>
        <ul style="color: #ccc; margin: 0; padding-left: 20px; line-height: 1.6;">
          <li>Guarda esta contraseña en un lugar seguro</li>
          <li>Se recomienda cambiar tu contraseña después del primer inicio de sesión</li>
          <li>Nunca compartas tus credenciales con nadie</li>
        </ul>
      </div>

      <!-- Panel Info -->
      <h3 style="color: #D4AF37; margin: 30px 0 15px 0;">🎯 ¿Qué puedes hacer en tu panel?</h3>
      <ul style="color: #ccc; line-height: 1.8; padding-left: 20px;">
        <li>Ver tu calendario de citas</li>
        <li>Gestionar tu perfil profesional</li>
        <li>Consultar tus comisiones</li>
        <li>Actualizar tu disponibilidad</li>
      </ul>
    </div>

    <!-- Footer -->
    <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
      <p style="margin: 5px 0;">
        Chamos Barber<br>
        Rancagua 759, San Fernando, O'Higgins, Chile<br>
        <a href="mailto:contacto@chamosbarber.com" style="color: #D4AF37; text-decoration: none;">contacto@chamosbarber.com</a>
      </p>
      <p style="margin: 15px 0 5px 0;">
        <a href="https://chamosbarber.com" style="color: #D4AF37; text-decoration: none;">chamosbarber.com</a>
      </p>
    </div>
  </div>
</body>
</html>
    `
  }

  /**
   * Genera el texto plano del email de credenciales
   */
  private generateCredentialsEmailText(creds: EmailCredentials): string {
    return `
CHAMOS BARBER
Tu barbería de confianza

¡Bienvenido al equipo, ${creds.nombre}!

Tu solicitud ha sido aprobada y ahora tienes acceso al panel de barberos.

TUS CREDENCIALES DE ACCESO:
━━━━━━━━━━━━━━━━━━━━━━━━━
Email: ${creds.email}
Contraseña: ${creds.password}

🔓 Iniciar Sesión: https://chamosbarber.com/login

⚠️ IMPORTANTE:
• Guarda esta contraseña en un lugar seguro
• Se recomienda cambiar tu contraseña después del primer inicio de sesión
• Nunca compartas tus credenciales con nadie

¿QUÉ PUEDES HACER EN TU PANEL?
• Ver tu calendario de citas
• Gestionar tu perfil profesional
• Consultar tus comisiones
• Actualizar tu disponibilidad

━━━━━━━━━━━━━━━━━━━━━━━━━
Chamos Barber
Rancagua 759, San Fernando, O'Higgins, Chile
contacto@chamosbarber.com
https://chamosbarber.com
    `
  }

  /**
   * Genera HTML para email de reset de contraseña
   */
  private generatePasswordResetEmail(creds: EmailCredentials): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contraseña Reseteada - Chamos Barber</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #D4AF37; font-size: 32px; margin: 0;">Chamos Barber</h1>
    </div>

    <div style="background-color: #2a2a2a; border-radius: 10px; padding: 30px;">
      <h2 style="color: #D4AF37; margin-top: 0;">🔐 Tu contraseña ha sido reseteada</h2>
      
      <p style="color: #ccc; line-height: 1.6;">
        Hola ${creds.nombre},
      </p>
      
      <p style="color: #ccc; line-height: 1.6;">
        El administrador ha reseteado tu contraseña. Aquí están tus nuevas credenciales:
      </p>

      <div style="background-color: #1a1a1a; border: 2px solid #D4AF37; border-radius: 8px; padding: 20px; margin: 30px 0;">
        <div style="margin: 15px 0;">
          <p style="color: #999; font-size: 12px; margin: 0 0 5px 0;">EMAIL</p>
          <p style="color: #fff; font-size: 16px; margin: 0; font-weight: bold;">${creds.email}</p>
        </div>

        <div style="margin: 15px 0;">
          <p style="color: #999; font-size: 12px; margin: 0 0 5px 0;">NUEVA CONTRASEÑA</p>
          <p style="color: #D4AF37; font-size: 18px; margin: 0; font-family: 'Courier New', monospace; font-weight: bold;">
            ${creds.password}
          </p>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://chamosbarber.com/login" 
           style="display: inline-block; background-color: #D4AF37; color: #000; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold;">
          Iniciar Sesión
        </a>
      </div>

      <div style="background-color: rgba(234, 179, 8, 0.1); border-left: 3px solid #eab308; padding: 15px;">
        <p style="color: #eab308; margin: 0; font-weight: bold;">⚠️ Por seguridad, te recomendamos cambiar esta contraseña desde tu panel.</p>
      </div>
    </div>

    <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
      <p>Chamos Barber | Rancagua 759, San Fernando, Chile</p>
    </div>
  </div>
</body>
</html>
    `
  }

  /**
   * Genera texto plano para reset de contraseña
   */
  private generatePasswordResetEmailText(creds: EmailCredentials): string {
    return `
CHAMOS BARBER

🔐 Tu contraseña ha sido reseteada

Hola ${creds.nombre},

El administrador ha reseteado tu contraseña. Aquí están tus nuevas credenciales:

Email: ${creds.email}
Nueva Contraseña: ${creds.password}

Iniciar Sesión: https://chamosbarber.com/login

⚠️ Por seguridad, te recomendamos cambiar esta contraseña desde tu panel.

━━━━━━━━━━━━━━━━━━━━━━━━━
Chamos Barber
Rancagua 759, San Fernando, Chile
contacto@chamosbarber.com
    `
  }
}

// Exportar instancia singleton
export const emailService = new EmailService()

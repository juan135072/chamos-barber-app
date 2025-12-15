import React from 'react'
import Head from 'next/head'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const PoliticasPrivacidad: React.FC = () => {
  return (
    <>
      <Head>
        <title>Políticas de Privacidad - Chamos Barber</title>
        <meta name="description" content="Políticas de Privacidad de Chamos Barber - Conoce cómo protegemos tu información personal" />
        <meta name="robots" content="index, follow" />
      </Head>

      <Navbar />

      <div className="legal-page">
        <div className="container">
          <div className="legal-content">
            <h1>Políticas de Privacidad</h1>
            <p className="last-updated">Última actualización: Diciembre 2024</p>

            <section>
              <h2>1. Información que Recopilamos</h2>
              <p>
                En Chamos Barber, valoramos tu privacidad y nos comprometemos a proteger tu información personal. 
                Recopilamos la siguiente información cuando utilizas nuestros servicios:
              </p>
              <ul>
                <li><strong>Información de contacto:</strong> Nombre completo, número de teléfono, correo electrónico</li>
                <li><strong>Información de reservas:</strong> Fecha y hora de citas, servicios solicitados, barbero preferido</li>
                <li><strong>Información de cuenta:</strong> Credenciales de acceso, preferencias de usuario</li>
                <li><strong>Información técnica:</strong> Dirección IP, tipo de navegador, páginas visitadas</li>
              </ul>
            </section>

            <section>
              <h2>2. Cómo Utilizamos tu Información</h2>
              <p>Utilizamos la información recopilada para los siguientes propósitos:</p>
              <ul>
                <li>Gestionar y confirmar tus reservas de servicios de barbería</li>
                <li>Enviarte recordatorios de citas y notificaciones importantes</li>
                <li>Mejorar nuestros servicios y la experiencia del usuario</li>
                <li>Comunicarnos contigo sobre promociones y novedades (con tu consentimiento)</li>
                <li>Mantener la seguridad y prevenir fraudes</li>
                <li>Cumplir con nuestras obligaciones legales</li>
              </ul>
            </section>

            <section>
              <h2>3. Protección de Datos</h2>
              <p>
                Implementamos medidas de seguridad técnicas y organizativas para proteger tu información personal:
              </p>
              <ul>
                <li>Encriptación SSL/TLS para todas las transmisiones de datos</li>
                <li>Almacenamiento seguro en servidores protegidos</li>
                <li>Acceso restringido solo a personal autorizado</li>
                <li>Políticas de contraseñas robustas</li>
                <li>Monitoreo continuo de seguridad</li>
              </ul>
            </section>

            <section>
              <h2>4. Compartir Información</h2>
              <p>
                No vendemos, alquilamos ni compartimos tu información personal con terceros para fines comerciales. 
                Solo compartimos información cuando:
              </p>
              <ul>
                <li>Es necesario para procesar tu reserva (ej: con el barbero asignado)</li>
                <li>Tenemos tu consentimiento explícito</li>
                <li>Es requerido por ley o por autoridades competentes</li>
                <li>Es necesario para proteger nuestros derechos legales</li>
              </ul>
            </section>

            <section>
              <h2>5. Cookies y Tecnologías Similares</h2>
              <p>
                Utilizamos cookies y tecnologías similares para mejorar tu experiencia en nuestro sitio web:
              </p>
              <ul>
                <li><strong>Cookies esenciales:</strong> Necesarias para el funcionamiento básico del sitio</li>
                <li><strong>Cookies de rendimiento:</strong> Nos ayudan a entender cómo usas nuestro sitio</li>
                <li><strong>Cookies de funcionalidad:</strong> Recuerdan tus preferencias</li>
              </ul>
              <p>
                Puedes controlar y gestionar las cookies a través de la configuración de tu navegador. 
                Ten en cuenta que deshabilitar ciertas cookies puede afectar la funcionalidad del sitio.
              </p>
            </section>

            <section>
              <h2>6. Tus Derechos</h2>
              <p>Tienes los siguientes derechos respecto a tu información personal:</p>
              <ul>
                <li><strong>Acceso:</strong> Solicitar una copia de la información que tenemos sobre ti</li>
                <li><strong>Rectificación:</strong> Corregir información inexacta o incompleta</li>
                <li><strong>Eliminación:</strong> Solicitar la eliminación de tu información personal</li>
                <li><strong>Portabilidad:</strong> Recibir tus datos en un formato estructurado y de uso común</li>
                <li><strong>Oposición:</strong> Oponerte al procesamiento de tu información personal</li>
                <li><strong>Limitación:</strong> Solicitar la limitación del procesamiento de tus datos</li>
              </ul>
              <p>
                Para ejercer cualquiera de estos derechos, contáctanos en: 
                <a href="mailto:contacto@chamosbarber.com"> contacto@chamosbarber.com</a>
              </p>
            </section>

            <section>
              <h2>7. Retención de Datos</h2>
              <p>
                Conservamos tu información personal solo durante el tiempo necesario para cumplir con los 
                fines para los que fue recopilada, incluyendo:
              </p>
              <ul>
                <li>Datos de reservas: Se conservan durante 2 años después de tu última visita</li>
                <li>Información de cuenta: Mientras tu cuenta esté activa o según sea necesario para prestarte servicios</li>
                <li>Datos de comunicaciones: Según sea requerido por obligaciones legales (generalmente 3-5 años)</li>
              </ul>
            </section>

            <section>
              <h2>8. Privacidad de Menores</h2>
              <p>
                Nuestros servicios están dirigidos a personas mayores de 18 años. No recopilamos 
                intencionalmente información de menores de edad sin el consentimiento de sus padres o tutores.
              </p>
            </section>

            <section>
              <h2>9. Enlaces a Terceros</h2>
              <p>
                Nuestro sitio web puede contener enlaces a sitios de terceros (ej: redes sociales). 
                No somos responsables de las prácticas de privacidad de estos sitios externos. 
                Te recomendamos revisar sus políticas de privacidad.
              </p>
            </section>

            <section>
              <h2>10. Transferencias Internacionales</h2>
              <p>
                Tu información puede ser transferida y almacenada en servidores ubicados fuera de tu país de residencia. 
                Tomamos las medidas apropiadas para garantizar que tu información personal reciba un nivel 
                adecuado de protección en las jurisdicciones en las que la procesamos.
              </p>
            </section>

            <section>
              <h2>11. Cambios a esta Política</h2>
              <p>
                Nos reservamos el derecho de actualizar esta Política de Privacidad en cualquier momento. 
                Los cambios significativos serán notificados a través de:
              </p>
              <ul>
                <li>Aviso destacado en nuestro sitio web</li>
                <li>Correo electrónico (si tienes una cuenta con nosotros)</li>
                <li>Notificación en la aplicación</li>
              </ul>
              <p>
                Te recomendamos revisar esta política periódicamente para mantenerte informado sobre 
                cómo protegemos tu información.
              </p>
            </section>

            <section>
              <h2>12. Contacto</h2>
              <p>Si tienes preguntas, comentarios o inquietudes sobre esta Política de Privacidad, contáctanos:</p>
              <div className="contact-info">
                <p><strong>Chamos Barber</strong></p>
                <p><i className="fas fa-envelope"></i> Email: <a href="mailto:contacto@chamosbarber.com">contacto@chamosbarber.com</a></p>
                <p><i className="fas fa-phone"></i> Teléfono: +56 9 8358 8553</p>
                <p><i className="fas fa-map-marker-alt"></i> Dirección: Rancagua 759, San Fernando, O'Higgins, Chile</p>
              </div>
            </section>

            <section className="consent-section">
              <h2>Consentimiento</h2>
              <p>
                Al utilizar nuestro sitio web y servicios, aceptas esta Política de Privacidad y 
                el procesamiento de tu información personal según lo descrito en este documento.
              </p>
            </section>
          </div>
        </div>
      </div>

      <Footer />

      <style jsx>{`
        .legal-page {
          min-height: 100vh;
          padding: 100px 0 50px;
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        }

        .legal-content {
          max-width: 900px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 50px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
        }

        h1 {
          color: #d4af37;
          font-size: 2.5rem;
          margin-bottom: 10px;
          text-align: center;
          font-weight: 700;
        }

        .last-updated {
          text-align: center;
          color: #999;
          font-size: 0.9rem;
          margin-bottom: 40px;
          font-style: italic;
        }

        section {
          margin-bottom: 40px;
        }

        h2 {
          color: #d4af37;
          font-size: 1.8rem;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid rgba(212, 175, 55, 0.3);
        }

        p {
          color: #e0e0e0;
          line-height: 1.8;
          margin-bottom: 15px;
          font-size: 1rem;
        }

        ul {
          color: #e0e0e0;
          line-height: 1.8;
          margin-left: 20px;
          margin-bottom: 15px;
        }

        li {
          margin-bottom: 10px;
        }

        strong {
          color: #d4af37;
          font-weight: 600;
        }

        a {
          color: #d4af37;
          text-decoration: none;
          transition: color 0.3s ease;
        }

        a:hover {
          color: #f0c952;
          text-decoration: underline;
        }

        .contact-info {
          background: rgba(212, 175, 55, 0.1);
          border-left: 4px solid #d4af37;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }

        .contact-info p {
          margin-bottom: 10px;
        }

        .contact-info i {
          color: #d4af37;
          margin-right: 10px;
          width: 20px;
        }

        .consent-section {
          background: linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%);
          border: 2px solid rgba(212, 175, 55, 0.3);
          padding: 30px;
          border-radius: 12px;
          text-align: center;
        }

        .consent-section h2 {
          border-bottom: none;
          margin-bottom: 20px;
        }

        @media (max-width: 768px) {
          .legal-page {
            padding: 80px 0 30px;
          }

          .legal-content {
            padding: 30px 20px;
            border-radius: 10px;
          }

          h1 {
            font-size: 2rem;
          }

          h2 {
            font-size: 1.5rem;
          }

          p, ul {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </>
  )
}

export default PoliticasPrivacidad

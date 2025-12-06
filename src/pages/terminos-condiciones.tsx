import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const TerminosCondiciones: React.FC = () => {
  return (
    <>
      <Head>
        <title>Términos y Condiciones - Chamos Barber</title>
        <meta name="description" content="Términos y Condiciones de uso de los servicios de Chamos Barber" />
        <meta name="robots" content="index, follow" />
      </Head>

      <Navbar />

      <div className="legal-page">
        <div className="container">
          <div className="legal-content">
            <h1>Términos y Condiciones</h1>
            <p className="last-updated">Última actualización: Diciembre 2024</p>

            <section>
              <h2>1. Aceptación de los Términos</h2>
              <p>
                Al acceder y utilizar el sitio web de Chamos Barber y nuestros servicios de reserva en línea, 
                aceptas quedar vinculado por estos Términos y Condiciones. Si no estás de acuerdo con alguna 
                parte de estos términos, no debes utilizar nuestros servicios.
              </p>
            </section>

            <section>
              <h2>2. Descripción del Servicio</h2>
              <p>
                Chamos Barber ofrece servicios de barbería profesional y un sistema de reservas en línea que permite:
              </p>
              <ul>
                <li>Reservar citas con nuestros barberos profesionales</li>
                <li>Consultar y gestionar tus reservas</li>
                <li>Acceder a información sobre nuestros servicios y precios</li>
                <li>Conocer a nuestro equipo de barberos</li>
              </ul>
            </section>

            <section>
              <h2>3. Registro y Cuenta de Usuario</h2>
              <p>Para utilizar nuestro sistema de reservas, debes:</p>
              <ul>
                <li>Proporcionar información precisa, actual y completa</li>
                <li>Mantener la seguridad de tu contraseña y cuenta</li>
                <li>Notificarnos inmediatamente de cualquier uso no autorizado</li>
                <li>Ser mayor de 18 años o tener el consentimiento de un padre o tutor</li>
              </ul>
              <p>
                Nos reservamos el derecho de suspender o cancelar tu cuenta si la información 
                proporcionada es inexacta, falsa o incompleta.
              </p>
            </section>

            <section>
              <h2>4. Política de Reservas</h2>
              <h3>4.1 Confirmación de Citas</h3>
              <p>
                Todas las reservas están sujetas a disponibilidad. Recibirás una confirmación por correo 
                electrónico y/o mensaje de texto una vez que tu reserva sea confirmada.
              </p>
              
              <h3>4.2 Modificación de Citas</h3>
              <p>
                Puedes modificar o cancelar tu cita hasta <strong>2 horas antes</strong> de la hora programada 
                sin cargo alguno a través de:
              </p>
              <ul>
                <li>Tu cuenta en el sitio web</li>
                <li>Contactándonos directamente</li>
              </ul>

              <h3>4.3 Política de Cancelación</h3>
              <ul>
                <li><strong>Cancelación con más de 2 horas de anticipación:</strong> Sin cargo</li>
                <li><strong>Cancelación con menos de 2 horas:</strong> Puede aplicarse un cargo del 50% del servicio</li>
                <li><strong>No presentarse (No-show):</strong> Se cobrará el 100% del servicio reservado</li>
              </ul>

              <h3>4.4 Llegadas Tardías</h3>
              <p>
                Si llegas más de 15 minutos tarde, tu cita puede ser cancelada y considerada como "no-show". 
                Haremos nuestro mejor esfuerzo para acomodarte si hay disponibilidad.
              </p>
            </section>

            <section>
              <h2>5. Precios y Pagos</h2>
              <ul>
                <li>Los precios están sujetos a cambios sin previo aviso</li>
                <li>Los precios mostrados en el sitio web son válidos al momento de la reserva</li>
                <li>Aceptamos efectivo, tarjetas de crédito/débito y transferencias</li>
                <li>Todos los precios incluyen IVA cuando corresponda</li>
                <li>Algunas promociones pueden tener términos específicos</li>
              </ul>
            </section>

            <section>
              <h2>6. Normas de Conducta</h2>
              <p>Al utilizar nuestros servicios, te comprometes a:</p>
              <ul>
                <li>Tratar a nuestro personal y otros clientes con respeto</li>
                <li>Mantener un comportamiento apropiado en nuestras instalaciones</li>
                <li>No usar nuestros servicios para fines ilegales</li>
                <li>No intentar dañar o interferir con el funcionamiento del sitio web</li>
              </ul>
              <p>
                Nos reservamos el derecho de rechazar el servicio a cualquier persona por 
                comportamiento inapropiado o violación de estos términos.
              </p>
            </section>

            <section>
              <h2>7. Propiedad Intelectual</h2>
              <p>
                Todo el contenido del sitio web de Chamos Barber, incluyendo:
              </p>
              <ul>
                <li>Texto, gráficos, logos, imágenes</li>
                <li>Fotografías y videos</li>
                <li>Código fuente y diseño</li>
                <li>Marcas registradas y nombres comerciales</li>
              </ul>
              <p>
                Es propiedad de Chamos Barber o sus licenciantes y está protegido por 
                las leyes de propiedad intelectual. No puedes usar, copiar o distribuir 
                ningún contenido sin nuestro permiso expreso por escrito.
              </p>
            </section>

            <section>
              <h2>8. Garantías y Responsabilidades</h2>
              <h3>8.1 Servicios Profesionales</h3>
              <p>
                Nos esforzamos por proporcionar servicios de barbería de la más alta calidad. 
                Sin embargo, los resultados pueden variar según:
              </p>
              <ul>
                <li>Tipo de cabello y condición</li>
                <li>Expectativas personales</li>
                <li>Comunicación durante la consulta</li>
              </ul>

              <h3>8.2 Limitación de Responsabilidad</h3>
              <p>
                Chamos Barber no será responsable por:
              </p>
              <ul>
                <li>Daños indirectos, incidentales o consecuentes</li>
                <li>Pérdida de beneficios o oportunidades</li>
                <li>Interrupciones en el servicio del sitio web</li>
                <li>Errores o inexactitudes en el contenido</li>
              </ul>
            </section>

            <section>
              <h2>9. Privacidad y Protección de Datos</h2>
              <p>
                El uso de tu información personal está regido por nuestra 
                <Link href="/politicas-privacidad"> Política de Privacidad</Link>. 
                Al utilizar nuestros servicios, aceptas la recopilación y uso de 
                información según lo descrito en dicha política.
              </p>
            </section>

            <section>
              <h2>10. Comunicaciones</h2>
              <p>
                Al registrarte en nuestro servicio, aceptas recibir:
              </p>
              <ul>
                <li>Confirmaciones de reservas</li>
                <li>Recordatorios de citas</li>
                <li>Actualizaciones importantes del servicio</li>
                <li>Promociones y ofertas especiales (puedes darte de baja en cualquier momento)</li>
              </ul>
            </section>

            <section>
              <h2>11. Salud y Seguridad</h2>
              <p>
                Para garantizar un ambiente seguro:
              </p>
              <ul>
                <li>Debes informarnos de cualquier alergia o condición médica relevante</li>
                <li>Cumplimos con todos los protocolos de higiene y desinfección</li>
                <li>Utilizamos herramientas profesionales esterilizadas</li>
                <li>Nos reservamos el derecho de rechazar servicio si detectamos condiciones de salud que requieran atención médica</li>
              </ul>
            </section>

            <section>
              <h2>12. Modificaciones del Servicio</h2>
              <p>
                Nos reservamos el derecho de:
              </p>
              <ul>
                <li>Modificar o descontinuar cualquier parte del servicio</li>
                <li>Cambiar horarios de atención</li>
                <li>Actualizar la lista de servicios y precios</li>
                <li>Modificar estos Términos y Condiciones</li>
              </ul>
              <p>
                Los cambios significativos serán comunicados con anticipación razonable.
              </p>
            </section>

            <section>
              <h2>13. Resolución de Disputas</h2>
              <p>
                En caso de cualquier disputa relacionada con nuestros servicios:
              </p>
              <ul>
                <li>Intenta primero resolverlo contactándonos directamente</li>
                <li>Si no se puede resolver, se someterá a mediación</li>
                <li>Como último recurso, se aplicará la jurisdicción de los tribunales competentes en Chile</li>
              </ul>
            </section>

            <section>
              <h2>14. Ley Aplicable</h2>
              <p>
                Estos Términos y Condiciones se rigen por las leyes de Chile, 
                sin considerar conflictos de leyes.
              </p>
            </section>

            <section>
              <h2>15. Divisibilidad</h2>
              <p>
                Si alguna disposición de estos términos se considera inválida o inaplicable, 
                las disposiciones restantes continuarán en pleno vigor y efecto.
              </p>
            </section>

            <section>
              <h2>16. Contacto</h2>
              <p>Para preguntas sobre estos Términos y Condiciones, contáctanos:</p>
              <div className="contact-info">
                <p><strong>Chamos Barber</strong></p>
                <p><i className="fas fa-envelope"></i> Email: <a href="mailto:info@chamosbarber.com">info@chamosbarber.com</a></p>
                <p><i className="fas fa-phone"></i> Teléfono: +56 9 8358 8553</p>
                <p><i className="fas fa-map-marker-alt"></i> Dirección: San Fernando, Chile</p>
              </div>
            </section>

            <section className="acceptance-section">
              <h2>Aceptación</h2>
              <p>
                Al utilizar nuestros servicios y sitio web, confirmas que has leído, entendido 
                y aceptado estos Términos y Condiciones en su totalidad.
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

        h3 {
          color: #f0c952;
          font-size: 1.4rem;
          margin-top: 25px;
          margin-bottom: 10px;
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

        .acceptance-section {
          background: linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%);
          border: 2px solid rgba(212, 175, 55, 0.3);
          padding: 30px;
          border-radius: 12px;
          text-align: center;
        }

        .acceptance-section h2 {
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

          h3 {
            font-size: 1.2rem;
          }

          p, ul {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </>
  )
}

export default TerminosCondiciones

/**
 * Página de Reservas Moderna con BookingWizard
 * Ruta: /reservar-nuevo
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import BookingWizard from '../components/booking/BookingWizard';

const ReservarNuevoPage: React.FC = () => {
  const router = useRouter();
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleBookingComplete = (data: any) => {
    console.log('Booking completed:', data);
    setShowSuccessModal(true);
    
    // Redirect after 3 seconds
    setTimeout(() => {
      router.push('/');
    }, 3000);
  };

  const handleCancel = () => {
    if (confirm('¿Estás seguro que deseas cancelar la reserva?')) {
      router.push('/');
    }
  };

  return (
    <Layout
      title="Reservar Cita - Chamos Barber"
      description="Reserva tu cita en línea de forma rápida y sencilla. Sistema moderno de reservas en 5 pasos."
    >
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
        padding: '4rem 0 3rem',
        color: 'white',
        textAlign: 'center'
      }}>
        <div className="container">
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            marginBottom: '1rem'
          }}>
            Reserva tu Cita en Línea
          </h1>
          <p style={{
            fontSize: '1.125rem',
            opacity: '0.9',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Proceso simple y rápido en 5 pasos. Selecciona tu servicio, barbero preferido y confirma tu cita.
          </p>
        </div>
      </section>

      {/* Booking Wizard */}
      <section style={{
        padding: '3rem 0',
        background: '#f9fafb',
        minHeight: '600px'
      }}>
        <div className="container">
          <BookingWizard
            onComplete={handleBookingComplete}
            onCancel={handleCancel}
          />
        </div>
      </section>

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '3rem',
            maxWidth: '500px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: '40px'
            }}>
              ✓
            </div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '1rem'
            }}>
              ¡Reserva Exitosa!
            </h2>
            <p style={{
              color: '#6b7280',
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '1.5rem'
            }}>
              Tu cita ha sido registrada exitosamente. Te contactaremos por WhatsApp 
              para confirmar todos los detalles.
            </p>
            <p style={{
              fontSize: '14px',
              color: '#9ca3af'
            }}>
              Redirigiendo a inicio en unos segundos...
            </p>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <section style={{ padding: '3rem 0' }}>
        <div className="container">
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            ¿Por qué reservar con nosotros?
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem'
          }}>
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Rápido y Fácil
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Reserva en menos de 2 minutos con nuestro sistema intuitivo
              </p>
            </div>

            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Confirmación Inmediata
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Recibe confirmación por WhatsApp al instante
              </p>
            </div>

            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Flexible
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Cancela o reprograma fácilmente si lo necesitas
              </p>
            </div>

            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💎</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Calidad Garantizada
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Barberos expertos con años de experiencia
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{ padding: '3rem 0', background: '#f9fafb' }}>
        <div className="container">
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            Preguntas Frecuentes
          </h2>

          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <details style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '1rem',
              cursor: 'pointer'
            }}>
              <summary style={{ fontWeight: '600', fontSize: '1.125rem' }}>
                ¿Puedo cancelar o reprogramar mi cita?
              </summary>
              <p style={{ marginTop: '1rem', color: '#6b7280', lineHeight: '1.6' }}>
                Sí, puedes cancelar o reprogramar tu cita con al menos 2 horas de anticipación. 
                Contáctanos por WhatsApp para hacer cambios.
              </p>
            </details>

            <details style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '1rem',
              cursor: 'pointer'
            }}>
              <summary style={{ fontWeight: '600', fontSize: '1.125rem' }}>
                ¿Cómo sé que mi reserva fue confirmada?
              </summary>
              <p style={{ marginTop: '1rem', color: '#6b7280', lineHeight: '1.6' }}>
                Recibirás un mensaje de confirmación por WhatsApp inmediatamente después de reservar. 
                También te recordaremos 24 horas antes de tu cita.
              </p>
            </details>

            <details style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '1rem',
              cursor: 'pointer'
            }}>
              <summary style={{ fontWeight: '600', fontSize: '1.125rem' }}>
                ¿Qué pasa si llego tarde?
              </summary>
              <p style={{ marginTop: '1rem', color: '#6b7280', lineHeight: '1.6' }}>
                Entendemos que pueden surgir imprevistos. Si llegas con más de 15 minutos de retraso, 
                es posible que tengamos que reprogramar tu cita.
              </p>
            </details>

            <details style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '12px',
              cursor: 'pointer'
            }}>
              <summary style={{ fontWeight: '600', fontSize: '1.125rem' }}>
                ¿Aceptan pagos con tarjeta?
              </summary>
              <p style={{ marginTop: '1rem', color: '#6b7280', lineHeight: '1.6' }}>
                Sí, aceptamos efectivo, tarjetas de crédito/débito y transferencias. 
                El pago se realiza después del servicio.
              </p>
            </details>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ReservarNuevoPage;

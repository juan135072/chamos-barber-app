import React from 'react'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import Layout from '../components/Layout'
import { chamosSupabase } from '../../lib/supabase-helpers'

interface Service {
    id: string
    nombre: string
    descripcion: string
    precio: number
    duracion_minutos: number
    categoria: string
    activo: boolean
}

interface ServiciosPageProps {
    servicios: Service[]
}

const ServiciosPage: React.FC<ServiciosPageProps> = ({ servicios }) => {
    return (
        <Layout
            title="Nuestros Servicios - Chamos Barber"
            description="Explora nuestra lista de servicios premium en San Fernando. Cortes, barba, tratamientos faciales y más."
        >
            <header className="page-header">
                <div className="container" style={{ position: 'relative', zIndex: 2 }}>
                    <h1 className="page-title">Cortes y Estilo Premium</h1>
                    <p className="page-subtitle">Personalizamos tu look con las mejores técnicas del mercado.</p>
                </div>
            </header>

            <section className="services-page" style={{ padding: '4rem 0', minHeight: '60vh' }}>
                <div className="container">
                    {servicios.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem' }}>
                            <i className="fas fa-scissors" style={{ fontSize: '3rem', color: 'var(--accent-color)', marginBottom: '1rem', opacity: 0.5 }}></i>
                            <h3>Estamos actualizando nuestro catálogo</h3>
                            <p>Vuelve pronto para ver nuestros servicios renovados.</p>
                        </div>
                    ) : (
                        <div className="services-grid">
                            {servicios.map((servicio) => (
                                <div key={servicio.id} className="service-card" style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div className="service-icon">
                                        <i className={getServiceIcon(servicio.categoria, servicio.nombre)}></i>
                                    </div>
                                    <h3>{servicio.nombre}</h3>
                                    <p style={{ marginBottom: '1.5rem', opacity: 0.8, fontSize: '0.95rem', flexGrow: 1 }}>
                                        {servicio.descripcion || 'Servicio profesional con la calidad garantizada de Chamos Barber.'}
                                    </p>

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '1rem 0',
                                        borderTop: '1px solid var(--border-color)',
                                        marginTop: 'auto'
                                    }}>
                                        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                                            ${servicio.precio.toLocaleString('es-CL')}
                                        </span>
                                        <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                                            <i className="far fa-clock" style={{ marginRight: '5px' }}></i>
                                            {servicio.duracion_minutos} min
                                        </span>
                                    </div>

                                    <Link
                                        href={`/reservar?servicio=${servicio.id}`}
                                        className="btn btn-primary"
                                        style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
                                    >
                                        Reservar Ahora
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="cta" style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '5rem 0',
                textAlign: 'center',
                borderTop: '1px solid var(--border-color)'
            }}>
                <div className="container">
                    <h2 className="section-title">¿Listo para un cambio de look?</h2>
                    <p style={{ fontSize: '1.1rem', marginBottom: '2.5rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto 2.5rem' }}>
                        Nuestro equipo de artistas está listo para transformar tu imagen. ¡No dejes para mañana el estilo que puedes lucir hoy!
                    </p>
                    <Link href="/reservar" className="btn btn-primary" style={{ padding: '15px 45px', fontSize: '1.1rem' }}>
                        <i className="fas fa-calendar-check" style={{ marginRight: '10px' }}></i>
                        Agendar mi hora
                    </Link>
                </div>
            </section>

            <style jsx>{`
        .page-header {
          position: relative;
          background: linear-gradient(rgba(18, 18, 18, 0.85), rgba(18, 18, 18, 0.85)),
                      url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80') center/cover;
          padding: 10rem 0 6rem;
        }
        
        .service-card {
           background-color: var(--bg-secondary);
           height: 100%;
        }
        
        @media (max-width: 768px) {
          .page-header {
            padding: 8rem 0 4rem;
          }
        }
      `}</style>
        </Layout>
    )
}

function getServiceIcon(category?: string, name?: string) {
    const cat = category?.toLowerCase() || ''
    const nom = name?.toLowerCase() || ''

    if (cat.includes('corte') || nom.includes('corte')) return 'fas fa-cut'
    if (cat.includes('barba') || nom.includes('barba')) return 'fas fa-user-tie'
    if (cat.includes('facial') || cat.includes('tratamiento') || nom.includes('facial')) return 'fas fa-spa'
    if (cat.includes('combo') || cat.includes('premium') || nom.includes('premium')) return 'fas fa-crown'
    if (nom.includes('cejas') || nom.includes('perfilado')) return 'fas fa-eye'
    if (nom.includes('niño') || nom.includes('infantil')) return 'fas fa-child'

    return 'fas fa-scissors'
}

export const getServerSideProps: GetServerSideProps = async () => {
    try {
        const servicios = await chamosSupabase.getServicios(true)
        return {
            props: {
                servicios: JSON.parse(JSON.stringify(servicios || []))
            }
        }
    } catch (error) {
        console.error('Error fetching services:', error)
        return {
            props: {
                servicios: []
            }
        }
    }
}

export default ServiciosPage

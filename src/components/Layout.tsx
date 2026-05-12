import React from 'react'
import Head from 'next/head'
import Navbar from './Navbar'
import Footer from './Footer'
import { useTenant } from '@/context/TenantContext'

interface LayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  transparentNav?: boolean
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title,
  description,
  transparentNav = false
}) => {
  const { tenant } = useTenant()

  const defaultTitle = tenant?.nombre ? `${tenant.nombre} - Panel y Reservas` : 'Chamos Barber - Barbería en San Fernando, Chile'
  const defaultDesc = tenant?.descripcion || 'La mejor experiencia de barbería. Cortes profesionales, afeitado premium y atención personalizada.'

  const pageTitle = title || defaultTitle
  const pageDesc = description || defaultDesc
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta name="keywords" content="barbería, San Fernando, Chile, corte de cabello, afeitado, estilo, barber, barbería San Fernando" />
        <meta name="author" content={tenant?.nombre || 'Chamos Barber'} />
        
        {/* Open Graph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="es_ES" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
      </Head>
      
      <Navbar transparent={transparentNav} />
      <main>{children}</main>
      <Footer />
    </>
  )
}

export default Layout
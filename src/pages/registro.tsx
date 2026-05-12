import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function RegistroSaaS() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // Paso 1: Datos del Comercio
  const [nombreComercio, setNombreComercio] = useState('')
  const [slug, setSlug] = useState('')
  const [colorPrimario, setColorPrimario] = useState('#D4AF37')
  
  // Paso 2: Datos del Admin
  const [nombreAdmin, setNombreAdmin] = useState('')
  const [apellidoAdmin, setApellidoAdmin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Autogenerar slug basado en el nombre del comercio si el usuario no lo ha tocado
  const handleNombreComercioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setNombreComercio(val)
    if (!slug || slug === generarSlug(val.slice(0, -1))) {
      setSlug(generarSlug(val))
    }
  }

  const generarSlug = (text: string) => {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           // Reemplazar espacios por -
      .replace(/[^\w\-]+/g, '')       // Eliminar caracteres no alfanuméricos
      .replace(/\-\-+/g, '-')         // Reemplazar múltiples - por uno solo
      .replace(/^-+/, '')             // Eliminar - al principio
      .replace(/-+$/, '')             // Eliminar - al final
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nombreComercio || !slug || !nombreAdmin || !email || !password) {
      toast.error('Por favor completa todos los campos obligatorios.')
      return
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)
    const toastId = toast.loading('Creando tu barbería virtual...')

    try {
      const response = await fetch('/api/onboarding/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreComercio,
          slug,
          colorPrimario,
          nombreAdmin,
          apellidoAdmin,
          email,
          password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar el comercio')
      }

      toast.success('¡Registro exitoso! Redirigiendo a tu nuevo panel...', { id: toastId })
      
      // Esperar un poco para que el usuario lea el mensaje
      setTimeout(() => {
        // Redirigir al login usando su nuevo subdominio si estamos en producción, 
        // o a /chamos-acceso en local
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isLocalhost) {
          router.push(`/chamos-acceso?slug=${data.slug}`)
        } else {
          // En producción, mandarlo a su subdominio
          const protocol = window.location.protocol;
          // asumiendo que el dominio base es chamosbarber.com
          const rootDomain = window.location.host.replace('www.', ''); 
          window.location.href = `${protocol}//${data.slug}.${rootDomain}/chamos-acceso`
        }
      }, 2000)

    } catch (error: any) {
      toast.error(error.message, { id: toastId })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-[#0F172A] to-[#1E293B]">
      <Head>
        <title>Registra tu Barbería | Chamos Barber SaaS</title>
      </Head>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          Lleva tu barbería al siguiente nivel
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Obtén tu propio sistema de reservas y punto de venta en minutos.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-[#1E293B]/80 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/10 relative overflow-hidden">
          
          {/* Elementos decorativos */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none"></div>

          <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
            
            {/* --- SECCIÓN 1: EL NEGOCIO --- */}
            <div>
              <h3 className="text-lg font-medium leading-6 text-white border-b border-white/10 pb-2 mb-4">
                <i className="fas fa-store text-[#D4AF37] mr-2"></i> Datos de tu Barbería
              </h3>
              
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="nombreComercio" className="block text-sm font-medium text-gray-300">
                    Nombre de la Barbería
                  </label>
                  <div className="mt-1">
                    <input
                      id="nombreComercio"
                      name="nombreComercio"
                      type="text"
                      required
                      value={nombreComercio}
                      onChange={handleNombreComercioChange}
                      className="appearance-none block w-full px-3 py-2.5 border border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm bg-[#0F172A] text-white transition-colors"
                      placeholder="Ej. The Gentleman Barbershop"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="slug" className="block text-sm font-medium text-gray-300">
                    Dirección web (Subdominio)
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      name="slug"
                      id="slug"
                      required
                      value={slug}
                      onChange={(e) => setSlug(generarSlug(e.target.value))}
                      className="flex-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] block w-full min-w-0 rounded-none rounded-l-md sm:text-sm border-gray-600 px-3 py-2.5 bg-[#0F172A] text-white transition-colors"
                      placeholder="the-gentleman"
                    />
                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-600 bg-[#1E293B] text-gray-400 sm:text-sm font-mono">
                      .chamosbarber.com
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="color" className="block text-sm font-medium text-gray-300">
                    Color de tu marca (Opcional)
                  </label>
                  <div className="mt-1 flex items-center space-x-3">
                    <input
                      type="color"
                      name="color"
                      id="color"
                      value={colorPrimario}
                      onChange={(e) => setColorPrimario(e.target.value)}
                      className="h-10 w-20 rounded border border-gray-600 cursor-pointer bg-transparent"
                    />
                    <span className="text-sm text-gray-400 font-mono">{colorPrimario}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* --- SECCIÓN 2: EL ADMINISTRADOR --- */}
            <div className="pt-4">
              <h3 className="text-lg font-medium leading-6 text-white border-b border-white/10 pb-2 mb-4">
                <i className="fas fa-user-shield text-[#D4AF37] mr-2"></i> Cuenta del Administrador
              </h3>
              
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-gray-300">
                    Nombre
                  </label>
                  <div className="mt-1">
                    <input
                      id="nombre"
                      type="text"
                      required
                      value={nombreAdmin}
                      onChange={(e) => setNombreAdmin(e.target.value)}
                      className="appearance-none block w-full px-3 py-2.5 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm bg-[#0F172A] text-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="apellido" className="block text-sm font-medium text-gray-300">
                    Apellido
                  </label>
                  <div className="mt-1">
                    <input
                      id="apellido"
                      type="text"
                      value={apellidoAdmin}
                      onChange={(e) => setApellidoAdmin(e.target.value)}
                      className="appearance-none block w-full px-3 py-2.5 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm bg-[#0F172A] text-white"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                    Correo Electrónico
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2.5 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm bg-[#0F172A] text-white"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                    Contraseña
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2.5 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm bg-[#0F172A] text-white"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Mínimo 6 caracteres.</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-medium text-black bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] hover:from-[#C5A017] hover:to-[#E4D59B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] focus:ring-offset-[#0F172A] transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i> Creando plataforma...</>
                ) : (
                  'Crear mi Barbería Virtual'
                )}
              </button>
            </div>
            
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-400 relative z-10">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/chamos-acceso" className="font-medium text-[#D4AF37] hover:text-[#F3E5AB] transition-colors">
              Inicia sesión aquí
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

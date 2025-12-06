/** @type {import('next').NextConfig} */

// Log para verificar variables de entorno durante el build
console.log('🔍 [BUILD] Verificando variables de entorno:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurado' : '❌ NO configurado')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ NO configurado')

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Configuración para imágenes externas
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'api.chamosbarber.com',
      },
    ],
  },
  
  // Variables de entorno
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'chamos-barber-secret-key',
  },
  
  // Configuración para VPS
  trailingSlash: false,
  // output: 'standalone', // Comentado para permitir carga correcta de CSS
  
  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Redirects para mantener compatibilidad con URLs antiguas
  async redirects() {
    return [
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
      {
        source: '/equipo.html',
        destination: '/equipo',
        permanent: true,
      },
      {
        source: '/reservar.html',
        destination: '/reservar',
        permanent: true,
      },
      {
        source: '/consultar-citas.html',
        destination: '/consultar-citas',
        permanent: true,
      },
      {
        source: '/barbero.html',
        destination: '/barbero',
        permanent: true,
      },
      {
        source: '/admin.html',
        destination: '/admin',
        permanent: true,
      },
      {
        source: '/login.html',
        destination: '/login',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
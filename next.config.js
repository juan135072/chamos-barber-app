/** @type {import('next').NextConfig} */

// Log para verificar variables de entorno durante el build
console.log('🔍 [BUILD] Verificando variables de entorno:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurado' : '❌ NO configurado')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ NO configurado')

// 🔒 VALIDACIÓN DE SEGURIDAD: NEXTAUTH_SECRET en producción
if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  console.warn('⚠️ [SECURITY WARNING] NEXTAUTH_SECRET no está configurado en producción')
  console.warn('⚠️ Se usará un valor por defecto (NO RECOMENDADO para producción)')
}

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
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  
  // Variables de entorno
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'chamos-barber-secret-key-development-only',
  },
  
  // Configuración para VPS
  trailingSlash: false,
  // output: 'standalone', // Comentado para permitir carga correcta de CSS
  
  // 🔒 Headers de seguridad mejorados
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevenir clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevenir MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // XSS Protection (legacy pero útil)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions Policy (deshabilitar funciones no usadas)
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://kit.fontawesome.com https://static.cloudflareinsights.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://ka-f.fontawesome.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://ka-f.fontawesome.com data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://supabase.chamosbarber.com wss://supabase.chamosbarber.com",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
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

import { NextRequest, NextResponse } from 'next/server'

function extractSlug(hostname: string): string {
  const cleanHost = hostname.split(':')[0]
  if (cleanHost === 'localhost' || cleanHost === '127.0.0.1') {
    return process.env.NEXT_PUBLIC_TENANT_SLUG || 'chamos'
  }
  const parts = cleanHost.split('.')
  if (parts.length > 2) {
    const sub = parts[0]
    return sub === 'www' ? '' : sub
  }
  return ''
}

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const slug = extractSlug(hostname)
  const response = NextResponse.next()
  response.headers.set('x-tenant-slug', slug)
  if (slug) {
    response.cookies.set('tenant-slug', slug, {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  } else {
    response.cookies.delete('tenant-slug')
  }
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|images|fonts|api/tenant).*)',
  ],
}

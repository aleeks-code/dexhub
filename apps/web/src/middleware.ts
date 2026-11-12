import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/changelog') ||
    pathname.startsWith('/cookie-policy') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/manifest') ||
    pathname.endsWith('.webmanifest') ||
    pathname.endsWith('.json') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/apple-icon')
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const sessionToken = request.cookies.get('better-auth.session_token')
  if (!sessionToken) {
    const host =
      request.headers.get('x-forwarded-host') ||
      request.headers.get('host') ||
      process.env['DOMAIN'] ||
      'dexhub.it'

    const isLocal = host.includes('localhost') || host.includes('127.0.0.1')
    const proto = isLocal
      ? 'http'
      : process.env.NODE_ENV === 'production'
      ? 'https'
      : request.headers.get('x-forwarded-proto')?.includes('https')
      ? 'https'
      : 'http'

    const origin = `${proto}://${host}`
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|webmanifest)$).*)',
  ],
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  if (path === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (path.startsWith('/auth')) {
    return NextResponse.next()
  }
  
  // Auth check handled client-side via
  // onAuthStateChanged in each page
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

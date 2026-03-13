import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return NextResponse.next();

  const hasToken = Boolean(request.cookies.get('admin_token')?.value);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!hasToken && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (hasToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api).*)']
};

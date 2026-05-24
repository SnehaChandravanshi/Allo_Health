import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the 'allo_logged_in' cookie is present
  const isLoggedIn = request.cookies.has('allo_logged_in');

  // Check if current path is the login page
  const isLoginPage = pathname === '/login';

  // If the user is NOT logged in and trying to access a protected page, redirect to /login
  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If the user IS logged in and trying to access the login page, redirect to the dashboard (root /)
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Config matcher to specify paths where the Proxy applies
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - any file with an extension (e.g. .png, .jpg, .svg)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|[^?]*\\.[^?]*$).*)',
  ],
};

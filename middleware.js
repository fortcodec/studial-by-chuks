// middleware.js - Next.js Supabase Authentication Middleware
// Checks user session on server side before page renders and redirects unauthenticated visitors to /login.

export async function middleware(request) {
  // Try to use NextResponse if environment provides Next.js server runtime
  let NextResponse;
  try {
    const nextServer = await import('next/server');
    NextResponse = nextServer.NextResponse;
  } catch {
    // In standalone or client-bundled environment, allow request to pass through
    return;
  }

  const { pathname } = request.nextUrl;

  // 1. Define public routes that do not require authentication
  const publicRoutes = ['/landing', '/login', '/onboarding', '/update-password', '/'];

  // Check if current route is public or a static asset
  const isPublicRoute = publicRoutes.some((route) =>
    route === '/' ? pathname === '/' : pathname.startsWith(route)
  );

  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.');

  if (isPublicRoute || isStaticAsset) {
    return NextResponse.next();
  }

  // 2. Check Supabase session via cookie tokens
  let hasSession = false;

  try {
    // Check standard Supabase auth cookie tokens (sb-*-auth-token, supabase-auth-token)
    const cookies = request.cookies;
    const allCookies = cookies.getAll ? cookies.getAll() : [];
    hasSession = allCookies.some((cookie) =>
      cookie.name.includes('auth-token') || cookie.name.includes('sb-')
    );
  } catch (err) {
    console.error('[Middleware] Cookie parsing error:', err);
  }

  // 3. Strict redirection if no active session is found
  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, public assets
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

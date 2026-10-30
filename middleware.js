import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  // Wrap entire middleware in try/catch to guarantee zero 500 crashes
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      'https://zhyvyxvfuiccknrxvrtj.supabase.co';

    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      'sb_publishable_2L7mLcyDw_2f46RF1ivpkQ_de2Er5FB';

    // Edge-compatible Supabase Server Client
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const { pathname } = request.nextUrl;

    // 1. Explicit list of public routes that must never trigger a redirect loop
    const publicRoutes = ['/landing', '/login', '/onboarding', '/update-password', '/'];
    const isPublicRoute = publicRoutes.some((route) =>
      route === '/' ? pathname === '/' : pathname.startsWith(route)
    );

    // If already on a public route, let request pass cleanly
    if (isPublicRoute) {
      return response;
    }

    // 2. Safely retrieve user session
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // 3. Safe Redirect: Only redirect if attempting to access protected paths without a session
    if (error || !user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  } catch (err) {
    // If any error occurs in the edge runtime, fail open to avoid 500 MIDDLEWARE_INVOCATION_FAILED
    console.error('[Middleware Error Caught]:', err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

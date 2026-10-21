import { NextResponse, type NextRequest } from 'next/server'

/**
 * Cheap gate: redirects to /login when there is no Supabase auth cookie.
 * No network call here (that made every click wait on a Supabase round trip).
 * Real authorisation is enforced by Row Level Security and by the app shell,
 * which verifies the session before rendering anything.
 */
export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (path.startsWith('/app')) {
    const hasSession = request.cookies.getAll().some(c => /^sb-.+-auth-token/.test(c.name))
    if (!hasSession) {
      const login = request.nextUrl.clone()
      login.pathname = '/login'
      login.search = `?next=${encodeURIComponent(path)}`
      return NextResponse.redirect(login)
    }
  }
  return NextResponse.next({ request })
}

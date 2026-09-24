import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

async function resolveIdentity(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
) {
  const [{ data: teamUser }, { data: contact }] = await Promise.all([
    supabase
      .from('team_users')
      .select('id, is_active')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('client_contacts')
      .select('id')
      .eq('portal_user_id', userId)
      .eq('has_portal_access', true)
      .maybeSingle(),
  ])

  return {
    isTeam: teamUser?.is_active === true,
    isPortal: Boolean(contact),
  }
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const identity = user ? await resolveIdentity(supabase, user.id) : { isTeam: false, isPortal: false }

  if (pathname.startsWith('/app') && !pathname.startsWith('/app/login')) {
    if (!user) {
      return NextResponse.redirect(new URL('/app/login', request.url))
    }
    if (!identity.isTeam) {
      if (identity.isPortal) {
        return NextResponse.redirect(new URL('/portal/projects', request.url))
      }
      return NextResponse.redirect(new URL('/app/login', request.url))
    }
  }

  if (pathname === '/app/login' && user) {
    if (identity.isTeam) {
      return NextResponse.redirect(new URL('/app/dashboard', request.url))
    }
    if (identity.isPortal) {
      return NextResponse.redirect(new URL('/portal/projects', request.url))
    }
  }

  if (
    pathname.startsWith('/portal') &&
    !pathname.startsWith('/portal/login')
  ) {
    if (!user) {
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }
    if (!identity.isPortal) {
      if (identity.isTeam) {
        return NextResponse.redirect(new URL('/app/dashboard', request.url))
      }
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }
  }

  if (pathname === '/portal/login' && user) {
    if (identity.isPortal) {
      return NextResponse.redirect(new URL('/portal/projects', request.url))
    }
    if (identity.isTeam) {
      return NextResponse.redirect(new URL('/app/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/core/env";

const SESSION_COOKIE = "baihoc_session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthPath = pathname.startsWith("/auth");
  const hasFileExtension = /\.[^/]+$/.test(pathname);
  const isAsset =
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/public") ||
    pathname === "/favicon.ico" ||
    hasFileExtension;

  if (isAsset) return NextResponse.next();

  const session = await verifySession(req);
  if (isAuthPath) return handleAuthPath(req, session);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

async function verifySession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(env.SESSION_SECRET),
    );
    return verified.payload as Record<string, unknown>;
  } catch {
    const res = NextResponse.next();
    res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }
}

function handleAuthPath(
  req: NextRequest,
  session: Record<string, unknown> | NextResponse | null,
) {
  if (session instanceof NextResponse) return session;
  const profileCompleted = Boolean(session?.profileCompleted);
  if (session && profileCompleted) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (session && !profileCompleted) {
    if (!req.nextUrl.pathname.startsWith("/auth/profile-complete")) {
      return NextResponse.redirect(new URL(`/auth/profile-complete`, req.url));
    }
  }
  return NextResponse.next();
}

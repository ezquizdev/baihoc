import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/core/env";

const SESSION_COOKIE = "baihoc_session";

export async function middleware(req: NextRequest) {
  const session = await verifySession(req);
  return handleAuthPath(req, session);
}

export const config = {
  matcher: ["/auth/:path*"],
};

async function verifySession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(env.SESSION_SECRET),
      { algorithms: ["HS256"] },
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
    const role = String(session.role ?? "");
    const destination = role === "staff" ? "/staff/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(destination, req.url));
  }
  if (session && !profileCompleted) {
    if (!req.nextUrl.pathname.startsWith("/auth/profile-complete")) {
      return NextResponse.redirect(new URL(`/auth/profile-complete`, req.url));
    }
  }
  return NextResponse.next();
}

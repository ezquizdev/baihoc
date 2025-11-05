import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "baihoc_session";
const PROTECTED_PREFIXES = ["/profile", "/dashboard", "/quizzes"];

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

  if (isAsset) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let payload: Record<string, unknown> | null = null;
  if (token) {
    try {
      const verified = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.SESSION_SECRET),
      );
      payload = verified.payload as Record<string, unknown>;
    } catch {
      const res = NextResponse.redirect(new URL(`/auth/login?next=${pathname}`, req.url));
      res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
      return res;
    }
  }

  const isProtected =
    pathname === "/" ||
    PROTECTED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    );

  const profileCompleted = Boolean(payload?.profileCompleted);

  if (isAuthPath) {
    if (payload && profileCompleted) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (payload && !profileCompleted) {
      if (!pathname.startsWith("/auth/profile-complete")) {
        return NextResponse.redirect(new URL(`/auth/profile-complete`, req.url));
      }
    }
    return NextResponse.next();
  }

  if (!payload) {
    return NextResponse.redirect(new URL(`/auth/login?next=${pathname}`, req.url));
  }

  if (!profileCompleted && !pathname.startsWith("/auth/profile-complete")) {
    return NextResponse.redirect(new URL(`/auth/profile-complete`, req.url));
  }

  if (!isProtected) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

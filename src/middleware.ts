import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "baihoc_session";
const PROTECTED_PREFIXES = ["/profile", "/dashboard", "/quizzes"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    // prevent showing auth pages when already logged in
    if (pathname.startsWith("/auth")) {
      const token = req.cookies.get(SESSION_COOKIE)?.value;
      if (token) {
        try {
          await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
          return NextResponse.redirect(new URL("/dashboard", req.url));
        } catch {
          // fall through to let auth pages render
        }
      }
    }
    return NextResponse.next();
  }
  const protectedPath =
    pathname === "/" ||
    PROTECTED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    );
  if (!protectedPath) {
    return NextResponse.next();
  }
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL(`/auth/login?next=${pathname}`, req.url));
  }
  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL(`/auth/login?next=${pathname}`, req.url));
    res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

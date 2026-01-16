import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const session = request.cookies.get("session");
    const { pathname } = request.nextUrl;

    // Check for session existence ONLY (as requested for local environment)
    // We are deliberately skipping cryptographic signature verification here to simplify
    // local deployment and minimize potential "invalid signature" blocking issues.
    const isAuthenticated = !!session;

    const isPublicPath =
        pathname === "/login" ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.includes(".");

    // If session exists and user is on login page, redirect to dashboard
    if (isAuthenticated && pathname === "/login") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // If no session and user is accessing protected route, redirect to login
    if (!isAuthenticated && !isPublicPath) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

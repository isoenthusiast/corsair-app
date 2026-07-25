import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const authMiddleware = NextAuth(authConfig).auth;

export default authMiddleware(async (req) => {
    const { pathname } = req.nextUrl;
    const user = req.auth?.user as { id?: string; role?: string; name?: string } | undefined;
    const isLoggedIn = !!user;
    const role = user?.role;

    // On login page, redirect logged-in users to their home
    if (pathname === "/") {
        if (isLoggedIn) {
            const home = role === "Admin" ? "/admin" : role === "Teacher" ? "/class" : role === "Parent" ? "/captain" : "/map";
            return NextResponse.redirect(new URL(home, req.url));
        }
    }

    // Role-based route protection
    if (pathname.startsWith("/captain") && role !== "Parent" && role !== "Admin") {
        return NextResponse.redirect(new URL(role === "Teacher" ? "/class" : "/map", req.url));
    }
    if (pathname.startsWith("/admin") && role !== "Admin") {
        return NextResponse.redirect(new URL(role === "Teacher" ? "/class" : role === "Parent" ? "/captain" : "/map", req.url));
    }
    if (pathname.startsWith("/class") && role !== "Teacher" && role !== "Admin") {
        return NextResponse.redirect(new URL(role === "Parent" ? "/captain" : "/map", req.url));
    }
    if ((pathname.startsWith("/map") || pathname.startsWith("/voyage") || pathname.startsWith("/profile") || pathname.startsWith("/tavern") || pathname.startsWith("/ship")) && (role === "Teacher" || role === "Parent")) {
        return NextResponse.redirect(new URL(role === "Teacher" ? "/class" : "/captain", req.url));
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};

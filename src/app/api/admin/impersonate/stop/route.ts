import { auth, signOut } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
    // Sign out clears the impersonation JWT, then redirect to home for normal login
    await signOut({ redirect: false });
    return NextResponse.redirect(new URL("/", process.env.AUTH_URL || "http://localhost:3200"));
}

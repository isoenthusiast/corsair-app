import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const form = await request.formData();
    const userId = form.get("userId") as string;

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.role === "Admin") {
        return NextResponse.json({ error: "Cannot impersonate this user" }, { status: 400 });
    }

    // Create signed impersonation token (valid for 60 seconds)
    const expiry = Date.now() + 60000;
    const sig = crypto
        .createHmac("sha256", process.env.AUTH_SECRET!)
        .update(`${userId}.${expiry}`)
        .digest("hex");
    const token = `${userId}.${expiry}.${sig}`;

    // Redirect to login page with impersonate token, clearing auth cookie along the way
    const url = new URL(`/?impersonate=${token}`, request.url);
    const response = NextResponse.redirect(url);

    // Clear the NextAuth session cookie so middleware doesn't redirect away from /
    response.cookies.set("authjs.session-token", "", { maxAge: 0, path: "/" });

    return response;
}

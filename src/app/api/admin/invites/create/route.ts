import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import crypto from "crypto";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");
    const form = await request.formData();
    const role = form.get("role") as string;
    const expiryDays = parseInt(form.get("expiryDays") as string) || 7;

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    await prisma.inviteLink.create({
        data: { token, createdBy: session.user.id!, role: role as any, expiresAt },
    });

    redirect("/admin/invites");
}

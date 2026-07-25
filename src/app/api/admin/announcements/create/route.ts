import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");
    const form = await request.formData();
    const title = form.get("title") as string;
    const body = form.get("body") as string;
    const targetRole = (form.get("targetRole") as string) || null;
    const expiresAt = (form.get("expiresAt") as string) ? new Date(form.get("expiresAt") as string) : null;

    await prisma.systemAnnouncement.create({ data: { adminId: session.user.id!, title, body, targetRole, expiresAt } });
    redirect("/admin/announcements");
}

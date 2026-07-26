import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

// POST /api/class/[id]/announcements — teacher creates an announcement
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || (session.user.role !== "Teacher" && session.user.role !== "Admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id: classId } = await params;
    const form = await request.formData();

    const title = form.get("title") as string;
    const body = form.get("body") as string;

    if (!title || !body) return NextResponse.json({ error: "Missing title or body" }, { status: 400 });

    await prisma.announcement.create({
        data: { classId, teacherId: session.user.id, title, body },
    });

    redirect(`/class/${classId}`);
}

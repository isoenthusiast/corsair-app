import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role === "Student") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { status, title, description, priority, scope, classId, voyageId } = body;

    const data: any = {};
    if (status) {
        if (!["Backlog", "InProgress", "Done", "Archive"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }
        data.status = status;
        if (status === "Archive") data.archivedAt = new Date();
    }
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description || null;
    if (priority !== undefined) {
        if (!["Low", "Medium", "High"].includes(priority)) {
            return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
        }
        data.priority = priority;
    }
    if (scope !== undefined) {
        if (!["Class", "Trial", "Admin"].includes(scope)) {
            return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
        }
        data.scope = scope;
    }
    if (classId !== undefined) data.classId = classId || null;
    if (voyageId !== undefined) data.voyageId = voyageId || null;

    try {
        const card = await prisma.kanbanCard.update({ where: { id }, data });
        return NextResponse.json({ card });
    } catch (e: any) {
        if (e?.code === "P2025") {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }
        throw e;
    }
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

// POST /api/class/[id]/assignments — teacher creates an assignment
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || (session.user.role !== "Teacher" && session.user.role !== "Admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id: classId } = await params;
    const form = await request.formData();

    const voyageId = form.get("voyageId") as string;
    const studentId = form.get("studentId") as string || null;
    const dueDateStr = form.get("dueDate") as string;

    if (!voyageId) return NextResponse.json({ error: "Missing voyageId" }, { status: 400 });

    await prisma.assignment.create({
        data: {
            classId,
            voyageId,
            teacherId: session.user.id,
            studentId: studentId,
            dueDate: dueDateStr ? new Date(dueDateStr) : null,
        },
    });

    // Auto-create Kanban card
    await prisma.kanbanCard.create({
        data: {
            type: "Assignment",
            scope: "Class",
            status: "Backlog",
            title: `Assignment: ${classId}`,
            description: `Assigned voyage ${voyageId}${studentId ? ` to student ${studentId}` : " to class"}`,
            priority: "Medium",
            sourceTable: "Assignment",
            classId,
            voyageId,
            creatorId: session.user.id,
        },
    });

    redirect(`/class/${classId}`);
}

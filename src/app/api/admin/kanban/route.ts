import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role === "Student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const isAdmin = session.user.role === "Admin";
    const isTeacher = session.user.role === "Teacher";
    const isParent = session.user.role === "Parent";

    const where: any = {};

    if (isTeacher) {
        // Teacher sees Class/Trial cards for their classes, plus cards assigned to their students
        const classTeachers = await prisma.classTeacher.findMany({ where: { teacherId: session.user.id }, select: { classId: true } });
        const classIds = classTeachers.map(ct => ct.classId);
        const studentClasses = await prisma.studentClass.findMany({ where: { classId: { in: classIds } }, select: { studentId: true } });
        const studentIds = studentClasses.map(sc => sc.studentId);

        // Get voyageIds assigned to teacher's classes
        const assignments = await prisma.assignment.findMany({ where: { classId: { in: classIds } }, select: { voyageId: true } });
        const voyageIds = [...new Set(assignments.map(a => a.voyageId))];

        where.OR = [
            { scope: "Class", classId: { in: classIds } },
            { scope: "Trial", voyageId: { in: voyageIds } },
            { assigneeId: { in: studentIds } },
        ];
    } else if (isParent) {
        // Parent sees Class/Trial cards for children's classes, plus cards assigned to their children
        const links = await prisma.studentParent.findMany({ where: { parentId: session.user.id }, select: { studentId: true } });
        const studentIds = links.map(l => l.studentId);
        const studentClasses = await prisma.studentClass.findMany({ where: { studentId: { in: studentIds } }, select: { classId: true } });
        const classIds = studentClasses.map(sc => sc.classId);

        const assignments = await prisma.assignment.findMany({ where: { classId: { in: classIds } }, select: { voyageId: true } });
        const voyageIds = [...new Set(assignments.map(a => a.voyageId))];

        where.OR = [
            { scope: "Class", classId: { in: classIds } },
            { scope: "Trial", voyageId: { in: voyageIds } },
            { assigneeId: { in: studentIds } },
        ];
    }
    // Admin: no where clause = all cards, including Admin-scoped

    const cards = await prisma.kanbanCard.findMany({
        where,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: { assignee: { select: { id: true, name: true } }, creator: { select: { id: true, name: true } } },
    });

    // Auto-archive: cards in Done for >30 days with no archivedAt
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toArchive = cards.filter(c => c.status === "Done" && !c.archivedAt && new Date(c.createdAt) < thirtyDaysAgo);
    if (toArchive.length > 0) {
        await prisma.kanbanCard.updateMany({
            where: { id: { in: toArchive.map(c => c.id) } },
            data: { status: "Archive", archivedAt: new Date() },
        });
    }

    return NextResponse.json({ cards });
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role === "Student") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { title, description, priority, type, scope, classId, voyageId, assigneeId } = await request.json();
    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

    const card = await prisma.kanbanCard.create({
        data: {
            type: type || "Task",
            scope: scope || "Admin",
            title,
            description: description || null,
            priority: priority || "Medium",
            classId: classId || null,
            voyageId: voyageId || null,
            assigneeId: assigneeId || null,
            creatorId: session.user.id!,
        },
        include: { assignee: { select: { id: true, name: true } }, creator: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ card }, { status: 201 });
}

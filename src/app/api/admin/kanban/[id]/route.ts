import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role === "Student") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { id } = await params;
    const { status } = await request.json();

    if (!["Backlog", "InProgress", "Done", "Archive"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const data: any = { status };
    if (status === "Archive") data.archivedAt = new Date();

    const card = await prisma.kanbanCard.update({ where: { id }, data });
    return NextResponse.json({ card });
}

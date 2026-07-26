import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// POST /api/trials/flag — student flags a trial for review
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = session.user.id;
        const { trialId, reason } = await request.json();
        if (!trialId) return NextResponse.json({ error: "Missing trialId" }, { status: 400 });

        const trial = await prisma.trial.findUnique({ where: { id: trialId }, include: { voyage: true } });
        if (!trial) return NextResponse.json({ error: "Trial not found" }, { status: 404 });

        // Increment flag count on trial
        await prisma.trial.update({ where: { id: trialId }, data: { flagCount: { increment: 1 } } });

        // Auto-create Kanban card for admin review
        await prisma.kanbanCard.create({
            data: {
                type: "FlaggedTrial",
                scope: "Trial",
                status: "Backlog",
                title: `Flagged: ${trial.question.slice(0, 80)}`,
                description: `Flagged by student. Reason: ${reason || "Not specified"}. Voyage: ${trial.voyage.title}`,
                priority: "Medium",
                sourceTable: "Trial",
                sourceId: trialId,
                voyageId: trial.voyageId,
                creatorId: userId,
            },
        });

        return NextResponse.json({ success: true, flagCount: trial.flagCount + 1 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

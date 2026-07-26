import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/admin/trials/[id]/versions — list version history
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const versions = await prisma.trialVersion.findMany({
        where: { trialId: id },
        orderBy: { versionNumber: "desc" },
    });
    const trial = await prisma.trial.findUnique({ where: { id }, select: { question: true, answer: true, explanation: true, hint: true, points: true } });
    return NextResponse.json({ versions, current: trial });
}

// POST /api/admin/trials/[id]/rollback — rollback to a specific version
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const { versionId } = await request.json();
    if (!versionId) return NextResponse.json({ error: "Missing versionId" }, { status: 400 });

    const version = await prisma.trialVersion.findUnique({ where: { id: versionId } });
    if (!version || version.trialId !== id) return NextResponse.json({ error: "Version not found" }, { status: 404 });

    // Save current state as a new version before rollback
    const currentTrial = await prisma.trial.findUnique({ where: { id } });
    if (!currentTrial) return NextResponse.json({ error: "Trial not found" }, { status: 404 });

    const maxVer = await prisma.trialVersion.aggregate({ where: { trialId: id }, _max: { versionNumber: true } });
    const nextVer = (maxVer._max.versionNumber || 0) + 1;

    await prisma.trialVersion.create({
        data: {
            trialId: id,
            versionNumber: nextVer,
            question: currentTrial.question,
            options: currentTrial.options as any,
            answer: currentTrial.answer,
            explanation: currentTrial.explanation,
            hint: currentTrial.hint,
            points: currentTrial.points,
            editedBy: session.user.id,
        },
    });

    // Rollback to selected version
    await prisma.trial.update({
        where: { id },
        data: {
            question: version.question,
            options: version.options as any,
            answer: version.answer,
            explanation: version.explanation,
            hint: version.hint,
            points: version.points,
        },
    });

    return NextResponse.json({ success: true, restoredFromVersion: version.versionNumber });
}

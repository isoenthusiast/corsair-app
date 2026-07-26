import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id: trialId, type, question, options: optionsRaw, answer, explanation, hint, points, difficulty } = body;

    if (!trialId || !question) {
        return NextResponse.json({ error: "trialId and question required" }, { status: 400 });
    }

    const oldTrial = await prisma.trial.findUnique({ where: { id: trialId } });
    if (!oldTrial) {
        return NextResponse.json({ error: "Trial not found" }, { status: 404 });
    }

    const versionCount = await prisma.trialVersion.count({ where: { trialId } });

    // Save version before updating
    await prisma.trialVersion.create({
        data: {
            trialId,
            versionNumber: versionCount + 1,
            question: oldTrial.question,
            options: oldTrial.options as any,
            answer: oldTrial.answer,
            explanation: oldTrial.explanation,
            hint: oldTrial.hint,
            points: oldTrial.points,
            editedBy: session.user.id,
        },
    });

    let options = undefined;
    if (optionsRaw) {
        try { options = typeof optionsRaw === "string" ? JSON.parse(optionsRaw) : optionsRaw; } catch { options = optionsRaw; }
    }

    const trial = await prisma.trial.update({
        where: { id: trialId },
        data: {
            type: type as any,
            question,
            options,
            answer: answer || oldTrial.answer,
            explanation: explanation || oldTrial.explanation,
            hint: hint || oldTrial.hint,
            points: points || oldTrial.points,
            difficulty: difficulty || oldTrial.difficulty,
        },
    });

    return NextResponse.json({ trial });
}

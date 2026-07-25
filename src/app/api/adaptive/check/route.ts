import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * After each trial attempt, check if the student's performance warrants
 * a difficulty adjustment for their current voyage.
 * 
 * Logic: If last 3 attempts on this voyage were all 3-skull correct,
 * increase difficulty by 0.5 (max 5). If last 5 attempts were all 1-skull,
 * decrease by 0.5 (min 1).
 */
export async function POST(request: NextRequest) {
    try {
        const { userId, voyageId } = await request.json();
        if (!userId || !voyageId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

        const recentAttempts = await prisma.trialAttempt.findMany({
            where: { userId, trial: { voyageId } },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { skulls: true },
        });

        if (recentAttempts.length < 3) {
            return NextResponse.json({ adjusted: false, reason: "Not enough data" });
        }

        const voyage = await prisma.voyage.findUnique({ where: { id: voyageId }, select: { difficulty: true } });
        if (!voyage) return NextResponse.json({ adjusted: false });

        const last3 = recentAttempts.slice(0, 3);
        const allPerfect = last3.every(a => a.skulls === 3);
        const allWeak = recentAttempts.every(a => a.skulls === 1);

        let newDifficulty = voyage.difficulty;

        if (allPerfect && voyage.difficulty < 5) {
            newDifficulty = Math.min(5, voyage.difficulty + 0.5);
            await prisma.voyage.update({ where: { id: voyageId }, data: { difficulty: newDifficulty } });
            return NextResponse.json({ adjusted: true, oldDifficulty: voyage.difficulty, newDifficulty, reason: "Consistent excellence — raising the challenge!" });
        }

        if (allWeak && recentAttempts.length >= 5 && voyage.difficulty > 1) {
            newDifficulty = Math.max(1, voyage.difficulty - 0.5);
            await prisma.voyage.update({ where: { id: voyageId }, data: { difficulty: newDifficulty } });
            return NextResponse.json({ adjusted: true, oldDifficulty: voyage.difficulty, newDifficulty, reason: "Rough seas — lowering difficulty temporarily." });
        }

        return NextResponse.json({ adjusted: false, currentDifficulty: voyage.difficulty });
    } catch (err: any) {
        console.error("Adaptive check failed:", err.message);
        return NextResponse.json({ adjusted: false, error: err.message });
    }
}

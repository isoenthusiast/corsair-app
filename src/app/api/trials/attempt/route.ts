import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = session.user.id;
        const { trialId, answer, correct, timeSpent, skulls, hintsUsed } = await request.json();
        if (!trialId) return NextResponse.json({ error: "Missing trialId" }, { status: 400 });

        await prisma.trialAttempt.create({ data: { trialId, userId, answer: answer || "", correct: correct ?? false, timeSpent: timeSpent || null, skulls: skulls || (correct ? 1 : 0), hintsUsed: hintsUsed || 0 } });

        const trial = await prisma.trial.findUnique({ where: { id: trialId }, select: { points: true, voyageId: true } });
        const pts = (trial?.points || 10) * (skulls || 1);
        const crowns = Math.floor(pts / 2);

        await prisma.pointTransaction.create({ data: { userId, points: pts, reason: "trial_complete", sourceId: trialId } });
        if (crowns > 0) {
            await prisma.crownTransaction.create({ data: { userId, amount: crowns, reason: "trial_reward", sourceId: trialId } });
            await prisma.user.update({ where: { id: userId }, data: { crowns: { increment: crowns } } });
        }

        if (trial?.voyageId) {
            const prog = await prisma.userVoyageProgress.findUnique({ where: { userId_voyageId: { userId, voyageId: trial.voyageId } } });
            if (prog) {
                await prisma.userVoyageProgress.update({ where: { id: prog.id }, data: { trialsCompleted: { increment: 1 }, skulls: { increment: skulls || 0 }, status: "InProgress" } });
            } else {
                await prisma.userVoyageProgress.create({ data: { userId, voyageId: trial.voyageId, status: "InProgress", trialsCompleted: 1, skulls: skulls || 0 } });
            }
        }

        // Streak
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const streak = await prisma.streak.findUnique({ where: { userId } });
        if (streak) {
            const last = streak.lastActivityDate ? new Date(streak.lastActivityDate) : null;
            const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
            let ns = streak.currentStreak;
            if (!last || last < yesterday) ns = 1;
            else if (last >= yesterday && last < today) ns = streak.currentStreak + 1;
            await prisma.streak.update({ where: { userId }, data: { currentStreak: ns, longestStreak: Math.max(streak.longestStreak, ns), lastActivityDate: new Date() } });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

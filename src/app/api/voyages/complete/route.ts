import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { voyageId, userId } = await request.json();
        if (!voyageId || !userId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

        const voyage = await prisma.voyage.findUnique({ where: { id: voyageId }, include: { trials: true } });
        if (!voyage) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const prog = await prisma.userVoyageProgress.findUnique({ where: { userId_voyageId: { userId, voyageId } } });
        if (prog) {
            await prisma.userVoyageProgress.update({ where: { id: prog.id }, data: { status: "Completed", completedAt: new Date() } });
            const bonus = voyage.difficulty * 50 + (voyage.captainGauntlet ? 100 : 0);
            const crowns = Math.floor(bonus / 2);
            await prisma.pointTransaction.create({ data: { userId, points: bonus, reason: voyage.captainGauntlet ? "gauntlet_conquered" : "voyage_complete", sourceId: voyageId } });
            if (crowns > 0) { await prisma.crownTransaction.create({ data: { userId, amount: crowns, reason: "voyage_bonus", sourceId: voyageId } }); await prisma.user.update({ where: { id: userId }, data: { crowns: { increment: crowns } } }); }
        }

        // Unlock next voyage
        const next = await prisma.voyage.findFirst({ where: { seaId: voyage.seaId, requiredVoyageId: voyageId } });
        if (next) {
            await prisma.userVoyageProgress.upsert({ where: { userId_voyageId: { userId, voyageId: next.id } }, update: { status: "Available" }, create: { userId, voyageId: next.id, status: "Available" } });
        }

        // Achievement checks
        const done = await prisma.userVoyageProgress.count({ where: { userId, status: { in: ["Completed", "Mastered"] } } });
        if (done >= 1) await prisma.userAchievement.upsert({ where: { userId_achievementId: { userId, achievementId: "first-steps" } }, update: {}, create: { userId, achievementId: "first-steps" } });
        if (done >= 10) await prisma.userAchievement.upsert({ where: { userId_achievementId: { userId, achievementId: "getting-started" } }, update: {}, create: { userId, achievementId: "getting-started" } });

        return NextResponse.json({ success: true, nextVoyageId: next?.id || null });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getEconomySettings } from "@/lib/economy";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = session.user.id;
        const { voyageId } = await request.json();
        if (!voyageId) return NextResponse.json({ error: "Missing voyageId" }, { status: 400 });

        const voyage = await prisma.voyage.findUnique({ where: { id: voyageId }, include: { trials: true } });
        if (!voyage) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const economy = await getEconomySettings();
        const prog = await prisma.userVoyageProgress.findUnique({ where: { userId_voyageId: { userId, voyageId } } });
        if (prog) {
            // ── Ship upgrade effects ──
            const userUpgrades = await prisma.userShipUpgrade.findMany({
                where: { userId },
                include: { upgrade: true },
            });
            let xpMultiplier = 1.0;
            let crownMultiplier = 1.0;
            for (const uu of userUpgrades) {
                const eff = (uu.upgrade.effects || {}) as Record<string, number>;
                if (eff.xpMultiplier) xpMultiplier += eff.xpMultiplier - 1;
                if (eff.crownMultiplier) crownMultiplier += eff.crownMultiplier - 1;
            }

            // ── Fortune Wind ──
            const user = await prisma.user.findUnique({ where: { id: userId }, select: { hasFortuneWind: true } });
            const fortuneMult = user?.hasFortuneWind ? 2 : 1;
            if (user?.hasFortuneWind) {
                await prisma.user.update({ where: { id: userId }, data: { hasFortuneWind: false } });
            }

            await prisma.userVoyageProgress.update({ where: { id: prog.id }, data: { status: "Completed", completedAt: new Date() } });
            const baseBonus = voyage.difficulty * 50 + (voyage.captainGauntlet ? 100 : 0);
            const bonus = Math.floor(baseBonus * xpMultiplier);
            const crowns = Math.floor(bonus * economy.crownRate * crownMultiplier * fortuneMult);
            await prisma.pointTransaction.create({ data: { userId, points: bonus, reason: voyage.captainGauntlet ? "gauntlet_conquered" : "voyage_complete", sourceId: voyageId, multiplier: xpMultiplier } });
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

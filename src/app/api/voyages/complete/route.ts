import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getEconomySettings } from "@/lib/economy";
import { handleCourageChallenge, handleBossFight, handleRegularIsland, getSkipRewards } from "@/lib/islandGame";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = session.user.id;
        const { voyageId, islandId } = await request.json();
        if (!voyageId) return NextResponse.json({ error: "Missing voyageId" }, { status: 400 });

        const voyage = await prisma.voyage.findUnique({
            where: { id: voyageId },
            include: { islands: { orderBy: { sortOrder: "asc" } } },
        });
        if (!voyage) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const economy = await getEconomySettings();

        // ── Check if this is a Courage Challenge (Island 0) completion ──
        if (islandId) {
            const island = voyage.islands.find(i => i.id === islandId);
            if (island?.type === "courage_challenge") {
                const cc = await handleCourageChallenge(userId, voyageId, islandId);
                if (cc.skipped) {
                    // Award 50% skip rewards
                    const rewards = getSkipRewards(voyage.difficulty, voyage.captainGauntlet, economy.crownRate);
                    if (rewards.xp > 0) {
                        await prisma.pointTransaction.create({ data: { userId, points: rewards.xp, reason: "courage_challenge_skip", sourceId: voyageId } });
                    }
                    if (rewards.crowns > 0) {
                        await prisma.crownTransaction.create({ data: { userId, amount: rewards.crowns, reason: "courage_challenge_skip", sourceId: voyageId } });
                        await prisma.user.update({ where: { id: userId }, data: { crowns: { increment: rewards.crowns } } });
                    }
                    return NextResponse.json({ skipped: true, score: cc.score, rewards });
                }
                // Failed CC — student plays through islands
                return NextResponse.json({ skipped: false, score: cc.score });
            }

            if (island?.type === "boss_fight") {
                const bf = await handleBossFight(userId, voyageId, islandId);
                if (bf.passed) {
                    // Award full completion bonus
                    const bonus = voyage.difficulty * 50 + (voyage.captainGauntlet ? 100 : 0);
                    const crowns = Math.floor(bonus * economy.crownRate);
                    await prisma.pointTransaction.create({ data: { userId, points: bonus, reason: "boss_fight_victory", sourceId: voyageId } });
                    if (crowns > 0) {
                        await prisma.crownTransaction.create({ data: { userId, amount: crowns, reason: "boss_fight_victory", sourceId: voyageId } });
                        await prisma.user.update({ where: { id: userId }, data: { crowns: { increment: crowns } } });
                    }
                    return NextResponse.json({ passed: true, score: bf.score, bonus, crowns });
                }
                return NextResponse.json({ passed: false, score: bf.score, retry: true });
            }

            if (island?.type === "regular") {
                const ri = await handleRegularIsland(userId, voyageId, islandId);
                return NextResponse.json({ passed: ri.passed, score: ri.score });
            }
        }

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

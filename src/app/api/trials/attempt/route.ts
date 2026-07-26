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
        const { trialId, answer, correct, timeSpent, skulls, hintsUsed, stormPassUsed } = await request.json();
        if (!trialId) return NextResponse.json({ error: "Missing trialId" }, { status: 400 });

        const isStormPass = stormPassUsed === true;

        // Record the attempt
        await prisma.trialAttempt.create({
            data: {
                trialId, userId,
                answer: answer || (isStormPass ? "[Storm Pass]" : ""),
                correct: isStormPass ? false : (correct ?? false),
                timeSpent: timeSpent || null,
                skulls: isStormPass ? 0 : (skulls || (correct ? 1 : 0)),
                hintsUsed: hintsUsed || 0,
            },
        });

        const trial = await prisma.trial.findUnique({
            where: { id: trialId },
            select: { points: true, voyageId: true, voyage: { select: { captainGauntlet: true } } },
        });
        const economy = await getEconomySettings();

        // ── Ship upgrade effects ──
        const userUpgrades = await prisma.userShipUpgrade.findMany({
            where: { userId },
            include: { upgrade: true },
        });
        let xpMultiplier = 1.0;
        let skullBonus = 0;
        let crownMultiplier = 1.0;
        let hintPenaltyReduction = 0;
        for (const uu of userUpgrades) {
            const eff = (uu.upgrade.effects || {}) as Record<string, number>;
            if (eff.xpMultiplier) xpMultiplier += eff.xpMultiplier - 1;
            if (eff.skullBonus) skullBonus += eff.skullBonus;
            if (eff.crownMultiplier) crownMultiplier += eff.crownMultiplier - 1;
            if (eff.hintPenaltyReduction) hintPenaltyReduction += eff.hintPenaltyReduction;
        }

        // ── Captain's Gauntlet ──
        const isGauntlet = trial?.voyage?.captainGauntlet === true;
        const gauntletMult = isGauntlet ? 2 : 1;

        // ── Rewards ──
        const effectiveSkulls = isStormPass ? 0 : Math.min(3, (skulls || 1) + skullBonus);
        const baseXP = (trial?.points || 10) * effectiveSkulls;
        const pts = Math.floor(baseXP * xpMultiplier * gauntletMult);

        // ── Fortune Wind ──
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { hasFortuneWind: true } });
        const fortuneMult = user?.hasFortuneWind ? 2 : 1;
        if (user?.hasFortuneWind) {
            await prisma.user.update({ where: { id: userId }, data: { hasFortuneWind: false } });
        }

        const crowns = Math.floor(pts * economy.crownRate * crownMultiplier * fortuneMult);

        if (!isStormPass && pts > 0) {
            await prisma.pointTransaction.create({ data: { userId, points: pts, reason: isGauntlet ? "gauntlet_trial" : "trial_complete", sourceId: trialId, multiplier: xpMultiplier * gauntletMult } });
        }
        if (crowns > 0) {
            await prisma.crownTransaction.create({ data: { userId, amount: crowns, reason: isGauntlet ? "gauntlet_reward" : "trial_reward", sourceId: trialId } });
            await prisma.user.update({ where: { id: userId }, data: { crowns: { increment: crowns } } });
        }

        // ── Progress ──
        if (trial?.voyageId) {
            const prog = await prisma.userVoyageProgress.findUnique({ where: { userId_voyageId: { userId, voyageId: trial.voyageId } } });
            if (prog) {
                await prisma.userVoyageProgress.update({
                    where: { id: prog.id },
                    data: { trialsCompleted: { increment: 1 }, skulls: { increment: isStormPass ? 0 : (skulls || 0) }, status: "InProgress" },
                });
            } else {
                await prisma.userVoyageProgress.create({
                    data: { userId, voyageId: trial.voyageId, status: "InProgress", trialsCompleted: 1, skulls: isStormPass ? 0 : (skulls || 0) },
                });
            }
        }

        // ── Streak (with Anchor Charm freeze protection) ──
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const streak = await prisma.streak.findUnique({ where: { userId } });
        if (streak) {
            const frozen = streak.streakFrozenUntil && new Date(streak.streakFrozenUntil) > new Date();
            if (!frozen) {
                const last = streak.lastActivityDate ? new Date(streak.lastActivityDate) : null;
                const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
                let ns = streak.currentStreak;
                if (!last || last < yesterday) ns = 1;
                else if (last >= yesterday && last < today) ns = streak.currentStreak + 1;
                await prisma.streak.update({
                    where: { userId },
                    data: { currentStreak: ns, longestStreak: Math.max(streak.longestStreak, ns), lastActivityDate: new Date() },
                });
            } else {
                // Still update lastActivityDate even when frozen
                await prisma.streak.update({ where: { userId }, data: { lastActivityDate: new Date() } });
            }
        }

        return NextResponse.json({ success: true, pts, crowns, stormPassUsed: isStormPass, fortuneWindUsed: fortuneMult > 1 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

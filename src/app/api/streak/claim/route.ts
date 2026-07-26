import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CHEST_TIERS: Record<number, { type: string; crowns: number; charm?: string; charmQty?: number }> = {
    3: { type: "Bronze Chest", crowns: 10 },
    5: { type: "Silver Chest", crowns: 50, charm: "whisper_scroll", charmQty: 1 },
    7: { type: "Gold Chest", crowns: 100, charm: "storm_pass", charmQty: 1 },
    14: { type: "Emerald Chest", crowns: 200, charm: "fortune_wind", charmQty: 1 },
    30: { type: "Diamond Chest", crowns: 500, charm: "anchor_charm", charmQty: 1 },
};

export async function POST(_request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = session.user.id;
        const streak = await prisma.streak.findUnique({ where: { userId } });
        const currentDay = streak?.currentStreak || 0;
        if (currentDay < 1) return NextResponse.json({ error: "No active streak" }, { status: 400 });

        // Find the highest eligible tier ≤ currentDay
        const eligibleDays = Object.keys(CHEST_TIERS).map(Number).filter(d => d <= currentDay).sort((a, b) => b - a);
        let reward: { type: string; crowns: number; charm?: string; charmQty?: number } | null = null;
        let streakDay = 0;

        for (const day of eligibleDays) {
            const already = await prisma.dailyChestClaim.findUnique({ where: { userId_streakDay: { userId, streakDay: day } } });
            if (!already) {
                reward = CHEST_TIERS[day];
                streakDay = day;
                break;
            }
        }

        if (!reward) return NextResponse.json({ error: "All chests already claimed for current streak" }, { status: 400 });

        // Award rewards
        await prisma.user.update({ where: { id: userId }, data: { crowns: { increment: reward.crowns } } });
        await prisma.crownTransaction.create({ data: { userId, amount: reward.crowns, reason: "streak_chest", sourceId: `day-${streakDay}` } });

        if (reward.charm) {
            await prisma.seaCharm.upsert({
                where: { userId_type: { userId, type: reward.charm as any } },
                update: { quantity: { increment: reward.charmQty || 1 } },
                create: { userId, type: reward.charm as any, quantity: reward.charmQty || 1 },
            });
        }

        // Record claim
        await prisma.dailyChestClaim.create({
            data: {
                userId,
                streakDay,
                chestType: reward.type,
                rewardSummary: `${reward.crowns} crowns${reward.charm ? ` + ${reward.charmQty}x ${reward.charm}` : ""}`,
            },
        });

        return NextResponse.json({ success: true, reward });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

// GET — check claimable chests
export async function GET(_request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = session.user.id;
        const streak = await prisma.streak.findUnique({ where: { userId } });
        const currentDay = streak?.currentStreak || 0;
        const claims = await prisma.dailyChestClaim.findMany({ where: { userId }, select: { streakDay: true, chestType: true, claimedAt: true } });
        const claimedDays = new Set(claims.map(c => c.streakDay));

        const available = Object.entries(CHEST_TIERS)
            .filter(([day]) => Number(day) <= currentDay && !claimedDays.has(Number(day)))
            .map(([day, reward]) => ({ day: Number(day), ...reward }));

        return NextResponse.json({ currentDay, claims, available });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

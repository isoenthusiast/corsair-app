import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// POST /api/charms/use — consume a sea charm
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = session.user.id;
        const { charmType } = await request.json();
        if (!charmType) return NextResponse.json({ error: "Missing charmType" }, { status: 400 });

        // Verify user owns at least 1 of this charm
        const charm = await prisma.seaCharm.findUnique({ where: { userId_type: { userId, type: charmType } } });
        if (!charm || charm.quantity < 1) {
            return NextResponse.json({ error: "Not enough charms" }, { status: 400 });
        }

        // Deduct charm
        await prisma.seaCharm.update({ where: { id: charm.id }, data: { quantity: { decrement: 1 } } });

        // Apply charm-specific effect
        if (charmType === "fortune_wind") {
            await prisma.user.update({ where: { id: userId }, data: { hasFortuneWind: true } });
        } else if (charmType === "anchor_charm") {
            const freezeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await prisma.streak.upsert({
                where: { userId },
                update: { streakFrozenUntil: freezeUntil },
                create: { userId, currentStreak: 0, longestStreak: 0, streakFrozenUntil: freezeUntil },
            });
        }
        // whisper_scroll and storm_pass are consumed client-side (sent as flags in trial attempt)

        return NextResponse.json({ success: true, remaining: charm.quantity - 1 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

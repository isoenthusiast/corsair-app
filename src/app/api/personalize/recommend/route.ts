import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Recommend the next voyage for a student based on:
 * 1. Incomplete voyages only
 * 2. Prioritize the sea with the least progress
 * 3. Match or slightly exceed current difficulty
 */
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = session.user.id;

        // Get all voyages with progress
        const seas = await prisma.sea.findMany({
            orderBy: { sortOrder: "asc" },
            include: {
                voyages: {
                    orderBy: { sortOrder: "asc" },
                    include: {
                        progress: { where: { userId } },
                    },
                },
            },
        });

        // Calculate per-sea completion
        const seaStats = seas.map(sea => {
            const total = sea.voyages.length;
            const completed = sea.voyages.filter(v =>
                v.progress[0]?.status === "Completed" || v.progress[0]?.status === "Mastered"
            ).length;
            return { sea, total, completed, pct: total > 0 ? completed / total : 0 };
        });

        // Find sea with least progress
        seaStats.sort((a, b) => a.pct - b.pct);
        const targetSea = seaStats[0];

        // Find first incomplete voyage in that sea (respecting lock chain)
        const recentAttempts = await prisma.trialAttempt.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: { skulls: true },
        });
        const avgSkulls = recentAttempts.length > 0
            ? recentAttempts.reduce((s, a) => s + a.skulls, 0) / recentAttempts.length
            : 2;

        const recommendedDifficulty = Math.max(1, Math.min(5, Math.round(avgSkulls + 0.5)));

        const nextVoyage = targetSea.sea.voyages.find(v => {
            const p = v.progress[0];
            return !p || (p.status !== "Completed" && p.status !== "Mastered" && p.status !== "Locked");
        });

        return NextResponse.json({
            recommended: nextVoyage ? {
                id: nextVoyage.id,
                title: nextVoyage.title,
                seaName: targetSea.sea.name,
                seaIcon: targetSea.sea.icon,
                difficulty: nextVoyage.difficulty,
                recommendedDifficulty,
                reason: nextVoyage.difficulty <= recommendedDifficulty
                    ? `Ready to conquer the ${targetSea.sea.name}!`
                    : `A worthy challenge in the ${targetSea.sea.name}!`,
            } : null,
            seaProgress: seaStats.map(s => ({
                name: s.sea.name,
                icon: s.sea.icon,
                completed: s.completed,
                total: s.total,
                pct: Math.round(s.pct * 100),
            })),
        });
    } catch (err: any) {
        console.error("Personalization failed:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

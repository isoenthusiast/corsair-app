import { prisma } from "@/lib/prisma";

/**
 * Calculate the score percentage for an island based on completed trials.
 * For exam islands (courage_challenge, boss_fight): correct answers / total trials
 * Returns percentage (0-100).
 */
export async function getIslandScore(userId: string, islandId: string): Promise<number> {
    const island = await prisma.island.findUnique({
        where: { id: islandId },
        include: { trials: { select: { id: true } } },
    });
    if (!island || island.trials.length === 0) return 0;

    const attempts = await prisma.trialAttempt.findMany({
        where: { userId, trialId: { in: island.trials.map(t => t.id) } },
        select: { correct: true },
    });

    if (attempts.length === 0) return 0;
    const correct = attempts.filter(a => a.correct).length;
    return Math.round((correct / island.trials.length) * 100);
}

/**
 * Get the current island the student should be on in a voyage.
 * Checks island progress sequentially to find the first uncompleted island.
 */
export async function getCurrentIsland(userId: string, voyageId: string) {
    const islands = await prisma.island.findMany({
        where: { voyageId },
        orderBy: { sortOrder: "asc" },
        include: { trials: true },
    });

    for (const island of islands) {
        const prog = await prisma.userIslandProgress.findUnique({
            where: { userId_islandId: { userId, islandId: island.id } },
        });
        if (!prog || prog.status !== "Completed") {
            return { island, islands, progress: prog };
        }
    }

    // All islands completed
    return { island: null, islands, progress: null };
}

/**
 * Handle Courage Challenge outcome (Island 0).
 * Returns { skipped: true } if student passed and skipped the voyage,
 * or { skipped: false } if they need to play through.
 */
export async function handleCourageChallenge(userId: string, voyageId: string, islandId: string) {
    const score = await getIslandScore(userId, islandId);
    const passed = score >= 80;

    if (passed) {
        // Mark voyage as completed (skipped)
        await prisma.userVoyageProgress.upsert({
            where: { userId_voyageId: { userId, voyageId } },
            update: { status: "Completed", completedAt: new Date() },
            create: { userId, voyageId, status: "Completed", completedAt: new Date() },
        });

        // Award 50% rewards
        return { skipped: true, score, passed };
    }

    // Unlock Island 1
    const island1 = await prisma.island.findFirst({
        where: { voyageId, sortOrder: 1 },
    });
    if (island1) {
        await prisma.userIslandProgress.upsert({
            where: { userId_islandId: { userId, islandId: island1.id } },
            update: { status: "Available" },
            create: { userId, islandId: island1.id, status: "Available" },
        });
    }

    return { skipped: false, score, passed };
}

/**
 * Handle regular island completion (Islands 1-11).
 * Pass threshold: ≥60%. On pass: unlock next island. On fail: retry same island.
 */
export async function handleRegularIsland(userId: string, voyageId: string, islandId: string) {
    const score = await getIslandScore(userId, islandId);
    const passed = score >= 60;

    if (passed) {
        const islands = await prisma.island.findMany({
            where: { voyageId }, orderBy: { sortOrder: "asc" },
        });
        const currentIdx = islands.findIndex(i => i.id === islandId);
        const nextIsland = islands[currentIdx + 1];
        if (nextIsland) {
            await prisma.userIslandProgress.upsert({
                where: { userId_islandId: { userId, islandId: nextIsland.id } },
                update: { status: "Available" },
                create: { userId, islandId: nextIsland.id, status: "Available" },
            });
        }
    }

    return { passed, score };
}

/**
 * Handle Boss Fight outcome (Island 12).
 * On pass: mark voyage Mastered, unlock next voyage.
 * On fail: reset islands 1-11, increment attemptCount, return { retry: true }.
 */
export async function handleBossFight(userId: string, voyageId: string, islandId: string) {
    const score = await getIslandScore(userId, islandId);
    const passed = score >= 80;

    if (passed) {
        await prisma.userVoyageProgress.upsert({
            where: { userId_voyageId: { userId, voyageId } },
            update: { status: "Mastered", completedAt: new Date() },
            create: { userId, voyageId, status: "Mastered", completedAt: new Date() },
        });

        // Unlock next voyage
        const voyage = await prisma.voyage.findUnique({ where: { id: voyageId } });
        if (voyage) {
            const next = await prisma.voyage.findFirst({
                where: { seaId: voyage.seaId, requiredVoyageId: voyageId },
            });
            if (next) {
                await prisma.userVoyageProgress.upsert({
                    where: { userId_voyageId: { userId, voyageId: next.id } },
                    update: { status: "Available" },
                    create: { userId, voyageId: next.id, status: "Available" },
                });
            }
        }

        return { passed: true, score };
    }

    // FAIL — reset islands 1-11
    const islands = await prisma.island.findMany({
        where: { voyageId, sortOrder: { gte: 1, lte: 11 } },
    });

    for (const island of islands) {
        // Increment attempt count and reset status
        await prisma.userIslandProgress.upsert({
            where: { userId_islandId: { userId, islandId: island.id } },
            update: { status: "Locked", trialsCompleted: 0, skulls: 0, attemptCount: { increment: 1 } },
            create: { userId, islandId: island.id, status: "Locked", attemptCount: 1 },
        });
    }

    // Unlock Island 1 again
    const island1 = islands.find(i => i.sortOrder === 1);
    if (island1) {
        await prisma.userIslandProgress.update({
            where: { userId_islandId: { userId, islandId: island1.id } },
            data: { status: "Available" },
        });
    }

    return { passed: false, score, retry: true };
}

/**
 * Calculate reduced rewards for Courage Challenge skip (50%).
 */
export function getSkipRewards(voyageDifficulty: number, isGauntlet: boolean, crownRate: number) {
    const fullXP = voyageDifficulty * 50 + (isGauntlet ? 100 : 0);
    return {
        xp: Math.floor(fullXP * 0.5),
        crowns: Math.floor(fullXP * crownRate * 0.5),
    };
}

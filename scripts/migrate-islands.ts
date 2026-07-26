/**
 * Island System Migration — v4.0.0
 * Run once: npx tsx scripts/migrate-islands.ts
 *
 * For each existing voyage:
 * 1. Creates 13 islands (0=Courage Challenge, 1-11=Monthly, 12=Boss Fight)
 * 2. Cleans up orphaned trials (lost voyage FK during schema push)
 * Note: Admin must re-generate trials via AI after migration.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const ISLAND_TEMPLATES = [
    "🏁 Courage Challenge",
    "Island 1: Setting Sail",
    "Island 2: Charting Waters",
    "Island 3: Hidden Coves",
    "Island 4: Stormy Seas",
    "Island 5: Treasure Maps",
    "Island 6: Pirate Code",
    "Island 7: Cannon Fire",
    "Island 8: Ghost Ships",
    "Island 9: Mermaid Lagoon",
    "Island 10: Kraken's Grasp",
    "Island 11: Davy Jones' Locker",
    "👑 Boss Fight",
] as const;

async function main() {
    console.log("🏝️  Island System Migration — v4.0.0\n");

    // ── Clean up orphaned trials (lost voyage FK during column drop/re-add) ──
    const orphanCount = await prisma.trial.count({ where: { islandId: null, voyageId: null } });
    if (orphanCount > 0) {
        console.log(`  🧹 Cleaning ${orphanCount} orphaned trials (lost voyage reference during schema push)...`);
        await prisma.trialAttempt.deleteMany({ where: { trial: { islandId: null, voyageId: null } } });
        await prisma.trialVersion.deleteMany({ where: { trial: { islandId: null, voyageId: null } } });
        await prisma.trial.deleteMany({ where: { islandId: null, voyageId: null } });
        console.log(`  ✅ Orphaned trials cleaned`);
    }

    const voyages = await prisma.voyage.findMany();
    console.log(`\nFound ${voyages.length} voyages\n`);

    let created = 0;
    for (const voyage of voyages) {
        console.log(`  📦 Voyage: "${voyage.title}"`);

        // Check if islands already exist
        const existing = await prisma.island.findFirst({ where: { voyageId: voyage.id } });
        if (existing) {
            console.log(`    ⏭️  Islands already exist, skipping`);
            continue;
        }

        // Create 13 islands
        for (let i = 0; i < ISLAND_TEMPLATES.length; i++) {
            await prisma.island.create({
                data: {
                    voyageId: voyage.id,
                    title: ISLAND_TEMPLATES[i],
                    type: i === 0 ? "courage_challenge" : i === 12 ? "boss_fight" : "regular",
                    sortOrder: i,
                    description: i === 0
                        ? `Entry exam for "${voyage.title}" — 10 questions, 80% to skip`
                        : i === 12
                            ? `Exit exam for "${voyage.title}" — prove your mastery!`
                            : `Monthly unit ${i} of "${voyage.title}"`,
                },
            });
        }
        created += ISLAND_TEMPLATES.length;
        console.log(`    ✅ Created islands 0-12`);
    }

    console.log(`\n🎉 Migration complete! ${voyages.length} voyages → ${created} islands`);
    if (orphanCount > 0) {
        console.log(`\n⚠️  ${orphanCount} trials were cleaned. Use AI generation to re-create trials for each island.`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

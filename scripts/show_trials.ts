import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: "postgresql://postgres:postgres@localhost:5432/gamified_learning" });
const prisma = new PrismaClient({ adapter });

async function main() {
    const count = await prisma.trial.count();
    console.log(`Total trials in DB: ${count}\n`);

    const trials = await prisma.trial.findMany({
        include: { voyage: { select: { title: true, sea: { select: { name: true } } } } },
        take: 8,
    });

    for (const t of trials) {
        console.log(`${t.voyage.sea.name} → ${t.voyage.title}`);
        console.log(`  [${t.type}] ${t.question.slice(0, 80)}...`);
        console.log(`  Answer: ${t.answer} | Points: ${t.points} | Hint: ${t.hint?.slice(0, 40) || "none"}`);
        console.log();
    }

    // Show distribution by type
    const byType = await prisma.trial.groupBy({ by: ["type"], _count: true });
    console.log("By type:", byType.map(t => `${t.type}: ${t._count}`).join(", "));

    await prisma.$disconnect();
}

main();

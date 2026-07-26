import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import VoyageCurriculumClient from "./VoyageCurriculumClient";

export default async function AdminVoyagesPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");

    const seas = await prisma.sea.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
            voyages: {
                orderBy: { sortOrder: "asc" },
                select: {
                    id: true, title: true, difficulty: true, lifecycle: true, captainGauntlet: true,
                    _count: { select: { islands: true } },
                    islands: { select: { id: true, _count: { select: { trials: true } } } },
                },
            },
        },
    });

    // Transform: add prep count (islands with ≥1 trial)
    const seaData = seas.map(sea => ({
        ...sea,
        voyages: sea.voyages.map(v => ({
            id: v.id,
            title: v.title,
            difficulty: v.difficulty,
            lifecycle: v.lifecycle,
            captainGauntlet: v.captainGauntlet,
            islandCount: v._count.islands,
            preppedIslands: v.islands.filter(i => i._count.trials > 0).length,
            totalTrials: v.islands.reduce((s, i) => s + i._count.trials, 0),
        })),
    }));

    return <VoyageCurriculumClient seas={JSON.parse(JSON.stringify(seaData))} />;
}

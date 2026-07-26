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
                select: { id: true, title: true, difficulty: true, lifecycle: true, captainGauntlet: true, _count: { select: { trials: true } } },
            },
        },
    });

    return <VoyageCurriculumClient seas={JSON.parse(JSON.stringify(seas))} />;
}

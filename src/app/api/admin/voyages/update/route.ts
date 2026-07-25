import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
    const form = await request.formData();
    const voyageId = form.get("voyageId") as string;
    const title = form.get("title") as string;
    const status = form.get("status") as string;
    const difficulty = parseInt(form.get("difficulty") as string) || 1;
    const estimatedMinutes = form.get("estimatedMinutes") as string;
    const description = form.get("description") as string;
    const objectives = form.get("objectives") as string;
    const captainGauntlet = form.get("captainGauntlet") === "on";

    await prisma.voyage.update({ where: { id: voyageId }, data: { title, status, difficulty, estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : null, description, objectives, captainGauntlet } });
    redirect(`/admin/voyages/${voyageId}`);
}

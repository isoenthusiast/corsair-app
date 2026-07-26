import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { voyageId, title, lifecycle, difficulty, estimatedMinutes, description, objectives, captainGauntlet, tags, skills } = body;

    if (!voyageId) {
        return NextResponse.json({ error: "voyageId required" }, { status: 400 });
    }

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (lifecycle !== undefined) data.lifecycle = lifecycle;
    if (difficulty !== undefined) data.difficulty = difficulty;
    if (estimatedMinutes !== undefined) data.estimatedMinutes = estimatedMinutes ? parseInt(String(estimatedMinutes)) : null;
    if (description !== undefined) data.description = description || null;
    if (objectives !== undefined) data.objectives = objectives || null;
    if (captainGauntlet !== undefined) data.captainGauntlet = captainGauntlet;
    if (tags !== undefined) data.tags = tags;
    if (skills !== undefined) data.skills = skills;

    const voyage = await prisma.voyage.update({ where: { id: voyageId }, data });

    return NextResponse.json({ voyage });
}

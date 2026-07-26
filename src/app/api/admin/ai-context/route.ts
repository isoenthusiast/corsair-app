import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const appFeature = searchParams.get("appFeature");
    const voyageId = searchParams.get("voyageId");
    const seaId = searchParams.get("seaId");

    const where: any = {};
    if (appFeature) where.appFeature = appFeature;
    if (voyageId) where.voyageId = voyageId;
    if (seaId) where.seaId = seaId;

    const contexts = await prisma.aIContext.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ contexts });
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { content, appFeature, voyageId, seaId, isFinal } = await request.json();

    if (!content || !appFeature) {
        return NextResponse.json({ error: "content and appFeature required" }, { status: 400 });
    }

    if (!["trials", "voyages", "seas", "kanban", "announcements"].includes(appFeature)) {
        return NextResponse.json({ error: "Invalid appFeature" }, { status: 400 });
    }

    const context = await prisma.aIContext.create({
        data: {
            userId: session.user.id,
            content,
            appFeature,
            voyageId: voyageId || null,
            seaId: seaId || null,
            isFinal: isFinal || false,
        },
    });

    return NextResponse.json({ context }, { status: 201 });
}

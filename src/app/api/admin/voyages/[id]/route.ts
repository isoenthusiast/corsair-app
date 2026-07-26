import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const voyage = await prisma.voyage.findUnique({
        where: { id },
        include: {
            sea: { select: { id: true, name: true, icon: true } },
            trials: {
                orderBy: { createdAt: "asc" },
                include: {
                    _count: { select: { attempts: true, versions: true } },
                },
            },
        },
    });

    if (!voyage) {
        return NextResponse.json({ error: "Voyage not found" }, { status: 404 });
    }

    return NextResponse.json({ voyage });
}

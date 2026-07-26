import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultEconomy } from "@/lib/economy";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(_request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.economySettings.deleteMany();
    await prisma.economySettings.create({ data: getDefaultEconomy() });
    redirect("/admin/economy");
}

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = session.user.id;
        const form = await request.formData();
        const upgradeId = form.get("upgradeId") as string;
        const cost = parseInt(form.get("cost") as string);

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.crowns < cost) return NextResponse.json({ error: "Not enough crowns" }, { status: 400 });

        const existing = await prisma.userShipUpgrade.findUnique({ where: { userId_upgradeId: { userId, upgradeId } } });
        if (existing) return NextResponse.json({ error: "Already owned" }, { status: 400 });

        await prisma.user.update({ where: { id: userId }, data: { crowns: { decrement: cost } } });
        await prisma.crownTransaction.create({ data: { userId, amount: -cost, reason: "ship_upgrade", sourceId: upgradeId } });
        await prisma.userShipUpgrade.create({ data: { userId, upgradeId } });
    } catch (e) { console.error(e); }
    redirect("/ship");
}

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getEconomySettings } from "@/lib/economy";
import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = session.user.id;
        const form = await request.formData();
        const itemType = form.get("itemType") as string;
        const economy = await getEconomySettings();
        const prices = economy.shopPrices as Record<string, number>;
        const trueCost = prices[itemType];
        if (!trueCost) return NextResponse.json({ error: "Unknown item" }, { status: 400 });

        const cost = parseInt(form.get("cost") as string);
        if (cost !== trueCost) return NextResponse.json({ error: "Price mismatch" }, { status: 400 });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.crowns < cost) return NextResponse.json({ error: "Not enough crowns" }, { status: 400 });

        await prisma.user.update({ where: { id: userId }, data: { crowns: { decrement: cost } } });
        await prisma.crownTransaction.create({ data: { userId, amount: -cost, reason: "shop_purchase", sourceId: itemType } });
        await prisma.seaCharm.upsert({ where: { userId_type: { userId, type: itemType as any } }, update: { quantity: { increment: 1 } }, create: { userId, type: itemType as any, quantity: 1 } });
    } catch (e) { console.error(e); }
    redirect("/tavern");
}

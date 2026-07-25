import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
    try {
        const form = await request.formData();
        const userId = form.get("userId") as string;
        const itemType = form.get("itemType") as string;
        const cost = parseInt(form.get("cost") as string);

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.crowns < cost) return NextResponse.json({ error: "Not enough crowns" }, { status: 400 });

        await prisma.user.update({ where: { id: userId }, data: { crowns: { decrement: cost } } });
        await prisma.crownTransaction.create({ data: { userId, amount: -cost, reason: "shop_purchase", sourceId: itemType } });
        await prisma.seaCharm.upsert({ where: { userId_type: { userId, type: itemType as any } }, update: { quantity: { increment: 1 } }, create: { userId, type: itemType as any, quantity: 1 } });
    } catch (e) { console.error(e); }
    redirect("/tavern");
}

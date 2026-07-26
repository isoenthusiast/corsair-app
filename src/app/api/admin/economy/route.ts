import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultEconomy } from "@/lib/economy";
import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

function parsePositiveNumber(v: string): number | null {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const form = await request.formData();
    const path = request.nextUrl.pathname;
    if (path.endsWith("/reset")) {
        await prisma.economySettings.deleteMany();
        await prisma.economySettings.create({ data: getDefaultEconomy() });
        redirect("/admin/economy");
    }

    const setting = form.get("setting") as string;
    const value = form.get("value") as string;

    const current = await prisma.economySettings.findFirst();
    const cfg = current || await prisma.economySettings.create({ data: getDefaultEconomy() });

    if (setting === "crownRate") {
        const n = parsePositiveNumber(value);
        if (n === null || n > 2) {
            return NextResponse.json({ error: "Invalid crown rate" }, { status: 400 });
        }
        await prisma.economySettings.update({ where: { id: cfg.id }, data: { crownRate: n } });
    } else if (setting.startsWith("shop_")) {
        const item = setting.replace("shop_", "");
        const prices = (cfg.shopPrices as Record<string, number>);
        const n = parsePositiveNumber(value);
        if (n === null || !(item in prices)) {
            return NextResponse.json({ error: "Invalid shop item" }, { status: 400 });
        }
        prices[item] = n;
        await prisma.economySettings.update({ where: { id: cfg.id }, data: { shopPrices: prices } });
    } else if (setting.startsWith("upgrade_")) {
        const idx = Number(setting.replace("upgrade_", ""));
        const costs = cfg.upgradeCosts as number[];
        const n = parsePositiveNumber(value);
        if (n === null || !Number.isInteger(idx) || idx < 0 || idx >= costs.length) {
            return NextResponse.json({ error: "Invalid upgrade index" }, { status: 400 });
        }
        costs[idx] = n;
        await prisma.economySettings.update({ where: { id: cfg.id }, data: { upgradeCosts: costs } });
    } else if (setting.startsWith("rank_")) {
        const idx = Number(setting.replace("rank_", ""));
        const rankXP = cfg.rankXP as number[];
        const n = parsePositiveNumber(value);
        if (n === null || !Number.isInteger(idx) || idx < 0 || idx >= rankXP.length) {
            return NextResponse.json({ error: "Invalid rank index" }, { status: 400 });
        }
        rankXP[idx] = n;
        await prisma.economySettings.update({ where: { id: cfg.id }, data: { rankXP } });
    } else {
        return NextResponse.json({ error: "Unknown setting" }, { status: 400 });
    }

    redirect("/admin/economy");
}

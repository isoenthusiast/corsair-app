import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
    const form = await request.formData();
    const userId = form.get("userId") as string;
    const name = form.get("name") as string;
    const username = form.get("username") as string;
    const role = form.get("role") as string;
    const status = form.get("status") as string;
    const age = form.get("age") as string;
    const crowns = parseInt(form.get("crowns") as string) || 0;
    const bio = form.get("bio") as string;

    const oldUser = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.user.update({ where: { id: userId }, data: { name, username, role: role as any, status, age: age ? parseInt(age) : null, crowns, bio } });

    if (oldUser && oldUser.crowns !== crowns) {
        await prisma.crownTransaction.create({ data: { userId, amount: crowns - oldUser.crowns, reason: "admin_adjustment" } });
    }

    redirect("/admin/users");
}

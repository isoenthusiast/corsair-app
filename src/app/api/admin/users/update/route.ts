import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    if (!oldUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Prevent an admin from demoting themselves
    if (userId === session.user.id && role !== "Admin") {
        return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
    }

    // Prevent demoting the only remaining admin
    if (oldUser.role === "Admin" && role !== "Admin") {
        const adminCount = await prisma.user.count({ where: { role: "Admin", status: "Active", deletedAt: null } });
        if (adminCount <= 1) {
            return NextResponse.json({ error: "Cannot demote the last active admin" }, { status: 400 });
        }
    }

    await prisma.user.update({ where: { id: userId }, data: { name, username, role: role as any, status, age: age ? parseInt(age) : null, crowns, bio } });

    if (oldUser && oldUser.crowns !== crowns) {
        await prisma.crownTransaction.create({ data: { userId, amount: crowns - oldUser.crowns, reason: "admin_adjustment" } });
    }

    await logAudit(session.user.id, "user_update", userId, `Updated user "${name}": role=${role}, status=${status}`);

    redirect("/admin/users");
}

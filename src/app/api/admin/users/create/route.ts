import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
    const form = await request.formData();
    const name = form.get("name") as string;
    const username = form.get("username") as string;
    const password = form.get("password") as string;
    const role = form.get("role") as string;
    const status = form.get("status") as string;
    const age = form.get("age") as string;
    const crowns = parseInt(form.get("crowns") as string) || 0;
    const bio = form.get("bio") as string;

    if (!password || password.length < 6) {
        redirect("/admin/users/new?error=password_too_short");
    }

    // Check for duplicate username
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
        redirect("/admin/users/new?error=duplicate_username");
    }

    const hash = await bcrypt.hash(password, 10);

    const session = await auth();

    const newUser = await prisma.user.create({
        data: {
            name,
            username,
            passwordHash: hash,
            role: role as any,
            status,
            age: age ? parseInt(age) : null,
            crowns,
            bio: bio || null,
            pirateRank: "Deckhand",
        },
    });

    if (session?.user) {
        await logAudit(session.user.id, "user_create", newUser.id, `Created user "${name}" (${username}) as ${role}`);
    }

    redirect("/admin/users");
}

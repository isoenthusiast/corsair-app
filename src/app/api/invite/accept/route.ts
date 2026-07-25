import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
    const form = await request.formData();
    const token = form.get("token") as string;
    const name = form.get("name") as string;
    const username = form.get("username") as string;
    const password = form.get("password") as string;

    const invite = await prisma.inviteLink.findUnique({ where: { token } });
    if (!invite || invite.usedById || new Date(invite.expiresAt) < new Date()) {
        redirect("/invite/" + token + "?error=expired");
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, username, passwordHash: hash, role: invite.role } });
    await prisma.inviteLink.update({ where: { id: invite.id }, data: { usedById: user.id } });
    await prisma.streak.create({ data: { userId: user.id } });
    for (const ct of ["whisper_scroll", "storm_pass", "fortune_wind", "anchor_charm"] as const) {
        await prisma.seaCharm.create({ data: { userId: user.id, type: ct, quantity: ct === "whisper_scroll" ? 3 : 1 } });
    }
    redirect("/?invited=1");
}

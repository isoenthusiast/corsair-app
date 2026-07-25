import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
    const form = await request.formData();
    const userId = form.get("userId") as string;
    const newPass = "pirate" + Math.random().toString(36).slice(2, 8);
    const hash = await bcrypt.hash(newPass, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash, mustChangePassword: true } });
    redirect(`/admin/users/${userId}?reset=ok&temp=${newPass}`);
}

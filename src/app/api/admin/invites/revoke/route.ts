import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");
    const form = await request.formData();
    const id = form.get("id") as string;
    if (id) {
        const invite = await prisma.inviteLink.findUnique({ where: { id } });
        if (invite && !invite.usedById) {
            await prisma.inviteLink.delete({ where: { id } });
        }
    }
    redirect("/admin/invites");
}

import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
    const form = await request.formData();
    const userId = form.get("userId") as string;
    await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date(), status: "Inactive" } });
    redirect("/admin/users");
}

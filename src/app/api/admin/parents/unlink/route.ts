import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
    const form = await request.formData();
    const linkId = form.get("linkId") as string;
    if (linkId) await prisma.studentParent.delete({ where: { id: linkId } });
    redirect("/admin/parents");
}

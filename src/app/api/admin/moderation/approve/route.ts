import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
    const form = await request.formData();
    const trialId = form.get("trialId") as string;
    if (trialId) await prisma.trial.update({ where: { id: trialId }, data: { flagCount: 0 } });
    redirect("/admin/moderation");
}

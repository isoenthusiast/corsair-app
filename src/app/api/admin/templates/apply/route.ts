import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
    const form = await request.formData();
    const bundleId = form.get("bundleId") as string;
    const classId = form.get("classId") as string;
    if (bundleId && classId) {
        const items = await prisma.voyageBundleItem.findMany({ where: { bundleId }, orderBy: { sortOrder: "asc" } });
        const teacher = await prisma.classTeacher.findFirst({ where: { classId } });
        for (let i = 0; i < items.length; i++) {
            const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + (i + 1) * 7);
            await prisma.assignment.create({ data: { voyageId: items[i].voyageId, classId, teacherId: teacher?.teacherId || "", dueDate } });
        }
    }
    redirect("/admin/templates");
}

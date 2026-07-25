import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
    const form = await request.formData();
    const studentId = form.get("studentId") as string;
    const parentId = form.get("parentId") as string;
    if (studentId && parentId) {
        const count = await prisma.studentParent.count({ where: { studentId } });
        if (count < 2) {
            await prisma.studentParent.create({ data: { studentId, parentId } });
        }
    }
    redirect("/admin/parents");
}

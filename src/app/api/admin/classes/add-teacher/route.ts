import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
    const form = await request.formData();
    const classId = form.get("classId") as string;
    const teacherId = form.get("teacherId") as string;
    if (classId && teacherId) {
        await prisma.classTeacher.create({ data: { classId, teacherId } });
    }
    redirect(`/admin/classes/${classId}`);
}

import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
    const form = await request.formData();
    const classId = form.get("classId") as string;
    const studentId = form.get("studentId") as string;
    if (classId && studentId) {
        await prisma.studentClass.create({ data: { classId, studentId } });
    }
    redirect(`/admin/classes/${classId}`);
}

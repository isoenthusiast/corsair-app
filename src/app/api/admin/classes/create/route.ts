import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
    const form = await request.formData();
    const name = form.get("name") as string;
    const teacherIds = form.getAll("teacherIds") as string[];
    if (name) {
        const cls = await prisma.class.create({ data: { name } });
        for (const tid of teacherIds) {
            await prisma.classTeacher.create({ data: { classId: cls.id, teacherId: tid } });
        }
    }
    redirect("/admin/classes");
}

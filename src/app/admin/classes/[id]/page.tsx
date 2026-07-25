import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ClassDetailAdminPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");
    const { id } = await params;

    const classData = await prisma.class.findUnique({ where: { id }, include: { teachers: { include: { teacher: true } }, students: { include: { student: true } }, _count: { select: { assignments: true, announcements: true } } } });
    if (!classData) return <div className="min-h-screen treasure-map flex items-center justify-center"><p className="text-amber-600">Class not found</p></div>;

    const availableStudents = await prisma.user.findMany({ where: { role: "Student", deletedAt: null, studentClasses: { none: { classId: id } } }, orderBy: { name: "asc" } });
    const availableTeachers = await prisma.user.findMany({ where: { role: "Teacher", deletedAt: null, taughtClasses: { none: { classId: id } } }, orderBy: { name: "asc" } });

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/admin/classes" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Classes</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>{classData.name}</h1>
                    <div className="w-20" />
                </div>
            </header>
            <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                <div className="sea-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>👥 Teachers</h2>
                        <span className="text-sm text-amber-600">{classData.teachers.length} assigned</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {classData.teachers.map(ct => <span key={ct.id} className="px-3 py-1 rounded-full bg-amber-900/30 text-amber-400 text-sm">{ct.teacher.name}</span>)}
                    </div>
                    {availableTeachers.length > 0 && (
                        <form action="/api/admin/classes/add-teacher" method="POST" className="flex gap-2">
                            <input type="hidden" name="classId" value={id} />
                            <select name="teacherId" className="px-3 py-1 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm">
                                <option value="">Add teacher...</option>
                                {availableTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <button className="btn-pirate text-xs">Add</button>
                        </form>
                    )}
                </div>

                <div className="sea-card p-6">
                    <h2 className="text-lg mb-4" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>🧑‍🎓 Students ({classData.students.length})</h2>
                    <div className="space-y-1 mb-3">
                        {classData.students.map(sc => <div key={sc.id} className="flex items-center justify-between p-2 rounded-lg bg-abyssal/50 text-sm"><span>{sc.student.name}</span><span className="text-xs text-amber-600">{sc.student.pirateRank}</span></div>)}
                    </div>
                    {availableStudents.length > 0 && (
                        <form action="/api/admin/classes/enroll" method="POST" className="flex gap-2">
                            <input type="hidden" name="classId" value={id} />
                            <select name="studentId" className="px-3 py-1 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm flex-1">
                                <option value="">Enroll student...</option>
                                {availableStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <button className="btn-pirate text-xs">Enroll</button>
                        </form>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="sea-card p-4"><div className="text-2xl font-bold" style={{ color: "#F7C948" }}>{classData._count.assignments}</div><div className="text-xs text-amber-600">Assignments</div></div>
                    <div className="sea-card p-4"><div className="text-2xl font-bold" style={{ color: "#F7C948" }}>{classData._count.announcements}</div><div className="text-xs text-amber-600">Announcements</div></div>
                </div>
            </main>
        </div>
    );
}

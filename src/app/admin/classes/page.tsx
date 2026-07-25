import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminClassesPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");
    const classes = await prisma.class.findMany({ include: { teachers: { include: { teacher: true } }, _count: { select: { students: true } } } });

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/admin" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Admiral</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>🏫 Manage Classes</h1>
                    <Link href="/admin/classes/new" className="btn-pirate text-sm">+ New Class</Link>
                </div>
            </header>
            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="space-y-4">
                    {classes.map(c => (
                        <div key={c.id} className="sea-card p-6">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>{c.name}</h2>
                                <span className="text-sm text-amber-600">{c._count.students} students</span>
                            </div>
                            <div className="text-sm text-amber-600 mb-2">Teachers: {c.teachers.map(ct => ct.teacher.name).join(", ") || "None"}</div>
                            <Link href={`/admin/classes/${c.id}`} className="text-amber-400 text-sm hover:text-amber-200">Manage →</Link>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

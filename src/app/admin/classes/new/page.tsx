import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function NewClassPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");
    const teachers = await prisma.user.findMany({ where: { role: "Teacher", deletedAt: null } });

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/admin/classes" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Classes</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>🏫 Create Class</h1>
                    <div className="w-20" />
                </div>
            </header>
            <main className="max-w-2xl mx-auto px-4 py-8">
                <div className="sea-card p-6">
                    <form action="/api/admin/classes/create" method="POST" className="space-y-4">
                        <div><label className="block text-sm text-amber-600 mb-1">Class Name</label><input name="name" placeholder="e.g., Pirate Academy 102" required className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white" /></div>
                        <div><label className="block text-sm text-amber-600 mb-1">Teacher(s)</label>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                {teachers.map(t => <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" name="teacherIds" value={t.id} className="accent-amber-600" />{t.name}</label>)}
                            </div>
                        </div>
                        <button className="btn-pirate">Create Class</button>
                    </form>
                </div>
            </main>
        </div>
    );
}

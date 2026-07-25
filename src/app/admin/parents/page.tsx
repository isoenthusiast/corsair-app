import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ParentLinkingPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");

    const students = await prisma.user.findMany({ where: { role: "Student", deletedAt: null }, include: { parentLinks: { include: { parent: true } } }, orderBy: { name: "asc" } });
    const parents = await prisma.user.findMany({ where: { role: "Parent", deletedAt: null }, orderBy: { name: "asc" } });

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/admin" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Admiral</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>👨‍👩‍👦 Parent Linking</h1>
                    <div className="w-20" />
                </div>
            </header>
            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="space-y-4">
                    {students.map(s => {
                        const linked = s.parentLinks;
                        const canAdd = linked.length < 2;
                        return (
                            <div key={s.id} className="sea-card p-6">
                                <div className="flex items-center gap-4 mb-3">
                                    <span className="text-xl">🏴</span>
                                    <div className="flex-1">
                                        <h3 className="font-bold">{s.name}</h3>
                                        <p className="text-xs text-amber-600">{s.pirateRank} · 🪙 {s.crowns}</p>
                                    </div>
                                    <span className="text-sm text-amber-600">{linked.length}/2 parents</span>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {linked.map(l => (
                                        <form key={l.id} action="/api/admin/parents/unlink" method="POST" className="inline">
                                            <input type="hidden" name="linkId" value={l.id} />
                                            <input type="hidden" name="studentId" value={s.id} />
                                            <button className="px-3 py-1 rounded-full bg-amber-900/30 text-amber-400 text-xs hover:bg-red-900/30 hover:text-red-400 transition">
                                                {l.parent.name} ✕
                                            </button>
                                        </form>
                                    ))}
                                    {linked.length === 0 && <span className="text-xs text-amber-800">No parents linked</span>}
                                </div>
                                {canAdd ? (
                                    <form action="/api/admin/parents/link" method="POST" className="flex gap-2">
                                        <input type="hidden" name="studentId" value={s.id} />
                                        <select name="parentId" className="px-3 py-1 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm">
                                            <option value="">Select parent...</option>
                                            {parents.filter(p => !linked.some(l => l.parentId === p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <button className="btn-pirate text-xs">Link</button>
                                    </form>
                                ) : (
                                    <span className="text-xs text-amber-800" title="Maximum 2 parents reached">🔒 Max parents reached</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}

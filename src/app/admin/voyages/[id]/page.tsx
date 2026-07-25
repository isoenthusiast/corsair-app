import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import GenerateTrialsButton from "@/components/GenerateTrialsButton";

export default async function VoyageEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");
    const { id } = await params;

    const voyage = await prisma.voyage.findUnique({ where: { id }, include: { sea: true, trials: { orderBy: { createdAt: "asc" } }, _count: { select: { trials: true } } } });
    if (!voyage) return <div className="min-h-screen treasure-map flex items-center justify-center"><p className="text-amber-600">Voyage not found</p></div>;

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/admin/voyages" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Curriculum</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>{voyage.sea.icon} {voyage.title}</h1>
                    <div className="w-20" />
                </div>
            </header>
            <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Metadata form */}
                <div className="sea-card p-6">
                    <h2 className="text-lg mb-4" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>📋 Details</h2>
                    <form action="/api/admin/voyages/update" method="POST" className="space-y-3">
                        <input type="hidden" name="voyageId" value={voyage.id} />
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-xs text-amber-600 mb-1">Title</label><input name="title" defaultValue={voyage.title} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" /></div>
                            <div><label className="block text-xs text-amber-600 mb-1">Status</label><select name="status" defaultValue={voyage.status || "Draft"} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm">{["Draft", "Published", "Deprecated"].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            <div><label className="block text-xs text-amber-600 mb-1">Difficulty (1-5)</label><input name="difficulty" type="number" min="1" max="5" defaultValue={voyage.difficulty} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" /></div>
                            <div><label className="block text-xs text-amber-600 mb-1">Est. Minutes</label><input name="estimatedMinutes" type="number" defaultValue={voyage.estimatedMinutes || ""} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" /></div>
                            <div className="col-span-2"><label className="block text-xs text-amber-600 mb-1">Description</label><textarea name="description" defaultValue={voyage.description || ""} rows={2} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" /></div>
                            <div className="col-span-2"><label className="block text-xs text-amber-600 mb-1">Learning Objectives</label><input name="objectives" defaultValue={voyage.objectives || ""} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" /></div>
                        </div>
                        <div className="flex gap-2 items-center">
                            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" name="captainGauntlet" defaultChecked={voyage.captainGauntlet} className="accent-amber-600" />Captain's Gauntlet ⚔️</label>
                        </div>
                        <button className="btn-pirate text-sm">Save Details</button>
                    </form>
                </div>

                {/* Trials list */}
                <div className="sea-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>⚔️ Trials ({voyage._count.trials})</h2>
                    </div>
                    <div className="space-y-2">
                        {voyage.trials.map((t, i) => (
                            <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-abyssal/50 text-sm">
                                <span className="text-xs text-amber-600 w-6">#{i + 1}</span>
                                <span className="px-2 py-0.5 rounded-full text-xs bg-amber-900/30 text-amber-400">{t.type}</span>
                                <span className="flex-1 truncate">{t.question.slice(0, 80)}...</span>
                                <span className="text-xs text-amber-600">{t.points} XP</span>
                                <Link href={`/admin/voyages/${voyage.id}/trials/${t.id}`} className="text-amber-400 text-xs hover:text-amber-200">Edit</Link>
                            </div>
                        ))}
                    </div>
                    <GenerateTrialsButton voyageId={voyage.id} />
                </div>
            </main>
        </div>
    );
}

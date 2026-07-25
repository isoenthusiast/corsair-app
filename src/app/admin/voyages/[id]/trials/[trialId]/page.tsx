import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function TrialEditorPage({ params }: { params: Promise<{ id: string; trialId: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");
    const { id: voyageId, trialId } = await params;

    const trial = await prisma.trial.findUnique({ where: { id: trialId }, include: { voyage: { include: { sea: true } }, versions: { orderBy: { versionNumber: "desc" }, take: 10 } } });
    if (!trial) return <div className="min-h-screen treasure-map flex items-center justify-center"><p className="text-amber-600">Trial not found</p></div>;

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href={`/admin/voyages/${voyageId}`} className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Voyage</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>Edit Trial</h1>
                    <div className="w-20" />
                </div>
            </header>
            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 sea-card p-6">
                        <form action="/api/admin/trials/update" method="POST" className="space-y-3">
                            <input type="hidden" name="trialId" value={trial.id} />
                            <input type="hidden" name="voyageId" value={voyageId} />
                            <div><label className="block text-xs text-amber-600 mb-1">Type</label><select name="type" defaultValue={trial.type} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm">{["multi_choice", "fill_blank", "puzzle", "open_ended"].map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</select></div>
                            <div><label className="block text-xs text-amber-600 mb-1">Question</label><textarea name="question" defaultValue={trial.question} rows={3} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" /></div>
                            {trial.type === "multi_choice" && <div><label className="block text-xs text-amber-600 mb-1">Options (JSON array)</label><input name="options" defaultValue={trial.options ? JSON.stringify(trial.options) : ""} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" /></div>}
                            <div><label className="block text-xs text-amber-600 mb-1">Answer</label><input name="answer" defaultValue={trial.answer} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" /></div>
                            <div><label className="block text-xs text-amber-600 mb-1">Explanation</label><input name="explanation" defaultValue={trial.explanation || ""} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" /></div>
                            <div><label className="block text-xs text-amber-600 mb-1">Hint</label><input name="hint" defaultValue={trial.hint || ""} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" /></div>
                            <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs text-amber-600 mb-1">Points</label><input name="points" type="number" defaultValue={trial.points} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" /></div><div><label className="block text-xs text-amber-600 mb-1">Difficulty</label><input name="difficulty" type="number" min="1" max="5" defaultValue={trial.difficulty} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" /></div></div>
                            <button className="btn-pirate text-sm">Save Trial</button>
                        </form>
                    </div>
                    <div className="space-y-6">
                        <div className="sea-card p-4"><h3 className="text-sm font-bold mb-2" style={{ color: "#F7C948" }}>👁️ Preview</h3><div className="trial-scroll p-4 text-sm"><p className="font-medium mb-2">{trial.question}</p>{trial.type === "multi_choice" && trial.options && <div className="space-y-1">{(trial.options as string[]).map((o: string) => <div key={o} className="px-3 py-1 rounded bg-amber-100 text-amber-900 text-xs">{o}</div>)}</div>}<p className="mt-2 text-xs text-amber-700">Answer: <strong>{trial.answer}</strong></p></div></div>
                        <div className="sea-card p-4"><h3 className="text-sm font-bold mb-2" style={{ color: "#F7C948" }}>📜 Versions ({trial.versions.length})</h3><div className="space-y-1 max-h-48 overflow-y-auto">{trial.versions.map(v => <div key={v.id} className="text-xs p-2 rounded bg-abyssal/50"><span className="text-amber-400">v{v.versionNumber}</span> <span className="text-amber-600">{new Date(v.editedAt).toLocaleDateString()}</span></div>)}{trial.versions.length === 0 && <p className="text-xs text-amber-800">No previous versions</p>}</div></div>
                    </div>
                </div>
            </main>
        </div>
    );
}

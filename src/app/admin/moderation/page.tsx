import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ModerationPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");

    const flagged = await prisma.trial.findMany({ where: { flagCount: { gt: 0 } }, orderBy: { flagCount: "desc" }, include: { voyage: { include: { sea: true } } } });

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/admin" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Admiral</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>🚩 Moderation</h1>
                    <div className="w-20" />
                </div>
            </header>
            <main className="max-w-4xl mx-auto px-4 py-8">
                {flagged.length === 0 ? (
                    <div className="sea-card p-12 text-center"><div className="text-6xl mb-4">✅</div><p className="text-amber-600">No flagged trials. The seas are calm!</p></div>
                ) : (
                    <div className="space-y-4">
                        {flagged.map(t => (
                            <div key={t.id} className="sea-card p-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-sm px-2 py-0.5 rounded-full bg-red-900/30 text-red-400">🚩 {t.flagCount}</span>
                                    <span className="text-xs text-amber-600">{t.voyage.sea.icon} {t.voyage.title}</span>
                                </div>
                                <p className="text-sm mb-3">{t.question}</p>
                                <div className="flex gap-2">
                                    <form action="/api/admin/moderation/approve" method="POST">
                                        <input type="hidden" name="trialId" value={t.id} />
                                        <button className="btn-pirate text-xs">Approve</button>
                                    </form>
                                    <form action="/api/admin/moderation/remove" method="POST">
                                        <input type="hidden" name="trialId" value={t.id} />
                                        <button className="btn-cannon text-xs">Remove</button>
                                    </form>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AnalyticsPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");

    const [totalUsers, totalTrials, totalVoyages, activeToday] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.trialAttempt.count(),
        prisma.userVoyageProgress.count({ where: { status: "Completed" } }),
        prisma.trialAttempt.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    ]);

    const seas = await prisma.sea.findMany({ include: { voyages: { include: { progress: true } } } });
    const seaStats = seas.map(s => {
        const total = s.voyages.length;
        const done = s.voyages.reduce((sum, v) => sum + v.progress.filter(p => p.status === "Completed" || p.status === "Mastered").length, 0);
        return { name: s.name, icon: s.icon, done, total, pct: total > 0 ? Math.round((done / (total * (total > 0 ? 1 : 1))) * 100) : 0 };
    });

    const recentAttempts = await prisma.trialAttempt.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { user: true, trial: { include: { voyage: { include: { sea: true } } } } } });

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/admin" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Admiral</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>📊 Analytics</h1>
                    <div className="w-20" />
                </div>
            </header>
            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {[["👥", totalUsers, "Active Users"], ["⚔️", totalTrials, "Total Trials"], ["🗺️", totalVoyages, "Voyages Done"], ["🔥", activeToday, "Trials Today"]].map(([i, v, l]) => (
                        <div key={l} className="sea-card p-4 text-center"><div className="text-2xl mb-1">{i}</div><div className="text-2xl font-bold" style={{ color: "#F7C948" }}>{v}</div><div className="text-xs text-amber-700">{l}</div></div>
                    ))}
                </div>

                <div className="sea-card p-6 mb-6">
                    <h2 className="text-lg mb-4" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>🌊 Per-Sea Completion</h2>
                    <div className="space-y-3">
                        {seaStats.map(s => (
                            <div key={s.name}>
                                <div className="flex justify-between text-sm mb-1"><span>{s.icon} {s.name}</span><span className="text-amber-400">{s.pct}%</span></div>
                                <div className="hull-bar"><div className="hull-bar-fill" style={{ width: `${s.pct}%` }} /></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="sea-card p-6">
                    <h2 className="text-lg mb-4" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>📋 Recent Activity</h2>
                    <div className="space-y-2">
                        {recentAttempts.map(a => (
                            <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-abyssal/50 text-sm">
                                <span>{a.correct ? "✅" : "❌"}</span>
                                <span className="flex-1 truncate">{a.trial.question.slice(0, 60)}...</span>
                                <span className="text-xs text-amber-600">{a.user.name}</span>
                                <span className="text-xs text-amber-600">{new Date(a.createdAt).toLocaleTimeString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const RANKS = ["Deckhand", "Swabbie", "Gunner", "Boatswain", "Quartermaster", "First Mate", "Captain", "Commodore", "Sea Lord"];
const RANK_XP = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000];

export default async function CaptainPage() {
    const session = await auth();
    if (!session?.user || (session.user.role !== "Parent" && session.user.role !== "Admin")) redirect("/");

    // Find linked children via StudentParent junction
    const links = await prisma.studentParent.findMany({
        where: session.user.role === "Admin" ? {} : { parentId: session.user.id },
        include: { student: { include: { streaks: true } } },
    });
    const learners = links.map(l => l.student);

    const stats = await Promise.all(learners.map(async l => {
        const prog = await prisma.userVoyageProgress.findMany({ where: { userId: l.id }, include: { voyage: { include: { sea: true } } } });
        const xpR = await prisma.pointTransaction.aggregate({ where: { userId: l.id }, _sum: { points: true } });
        const done = prog.filter(p => p.status === "Completed" || p.status === "Mastered").length;
        const skulls = prog.reduce((s, p) => s + p.skulls, 0);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const todayTrials = await prisma.trialAttempt.count({ where: { userId: l.id, createdAt: { gte: today } } });
        const last50 = await prisma.trialAttempt.findMany({ where: { userId: l.id }, orderBy: { createdAt: "desc" }, take: 50 });
        const acc = last50.length > 0 ? Math.round((last50.filter(a => a.correct).length / last50.length) * 100) : 0;
        let rank = "Deckhand"; const xp = xpR._sum.points || 0;
        for (let i = RANKS.length - 1; i >= 0; i--) { if (xp >= RANK_XP[i]) { rank = RANKS[i]; break; } }
        const seaBreak: Record<string, { done: number; total: number; skulls: number; icon: string }> = {};
        for (const p of prog) { const n = p.voyage.sea.name; if (!seaBreak[n]) seaBreak[n] = { done: 0, total: 0, skulls: 0, icon: p.voyage.sea.icon }; seaBreak[n].total++; seaBreak[n].skulls += p.skulls; if (p.status === "Completed" || p.status === "Mastered") seaBreak[n].done++; }
        return { learner: l, xp, done, skulls, todayTrials, acc, rank, seaBreak, streak: l.streaks };
    }));

    const totalV = await prisma.voyage.count();

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3"><span className="text-2xl">🏴‍☠️</span><h1 className="text-xl" style={{ fontFamily: "'Pirata One',cursive", color: "#F7C948" }}>Captain's Quarters</h1></div>
                    <div className="flex items-center gap-3"><span className="text-sm text-amber-600">{session.user.name}</span><a href="/api/auth/signout" className="text-sm text-amber-800 hover:text-amber-400">Abandon Ship</a></div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h2 className="text-2xl mb-6" style={{ color: "#F7C948" }}>📊 Fleet Report</h2>
                {stats.map(s => (
                    <div key={s.learner.id} className="mb-8">
                        <div className="wanted-poster rounded-2xl p-6 mb-4">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-yellow-500 flex items-center justify-center text-2xl">🏴</div>
                                <div><h3 className="text-2xl">{s.learner.name}</h3><p className="text-amber-700 text-sm">{s.rank} · {s.xp} XP · 🪙 {s.learner.crowns}</p></div>
                                <div className="ml-auto flex gap-3">
                                    <div className="text-center"><div className="text-2xl font-bold" style={{ color: "#D32F2F" }}>🔥 {s.streak?.[0]?.currentStreak || 0}d</div><div className="text-xs text-amber-700">Streak</div></div>
                                    <div className="text-center"><div className="text-2xl font-bold" style={{ color: "#00897B" }}>{s.todayTrials}</div><div className="text-xs text-amber-700">Today</div></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3 mb-4">
                                {[["🗺️", `${s.done}/${totalV}`, "Voyages"], ["☠️", s.skulls, "Skulls"], ["🎯", `${s.acc}%`, "Accuracy"], ["⚓", s.streak?.[0]?.longestStreak || 0, "Best Streak"]].map(([i, v, l]) => (
                                    <div key={l} className="text-center p-3 rounded-xl bg-amber-50/50"><div className="text-lg">{i}</div><div className="text-lg font-bold" style={{ color: "#5D4037" }}>{v}</div><div className="text-xs text-amber-700">{l}</div></div>
                                ))}
                            </div>
                            <h4 className="text-sm font-semibold text-amber-700 mb-3">By Sea</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(s.seaBreak).map(([sea, d]) => (
                                    <div key={sea} className="p-3 rounded-xl bg-amber-50/50"><div className="flex items-center gap-2 mb-2"><span>{d.icon}</span><span className="text-sm font-medium" style={{ color: "#5D4037" }}>{sea}</span></div>
                                        <div className="hull-bar mb-1"><div className="hull-bar-fill" style={{ width: `${d.total > 0 ? (d.done / d.total) * 100 : 0}%` }} /></div>
                                        <div className="flex justify-between text-xs text-amber-700"><span>{d.done}/{d.total}</span><span>☠️ {d.skulls}</span></div></div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
                {stats.length === 0 && <div className="wanted-poster rounded-2xl p-12 text-center"><div className="text-6xl mb-4">🏴</div><h3 className="text-xl font-bold mb-2" style={{ color: "#5D4037" }}>No Crew Members Yet</h3><p className="text-amber-700">Recruit a young sailor to start their adventure!</p></div>}
            </main>
        </div>
    );
}

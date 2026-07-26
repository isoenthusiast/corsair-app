import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEconomySettings, getRank } from "@/lib/economy";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProfilePage() {
    const session = await auth();
    if (!session?.user) redirect("/");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { achievements: { include: { achievement: true }, orderBy: { earnedAt: "desc" } }, streaks: true, charms: true, shipUpgrades: { include: { upgrade: true } } },
    });
    if (!user) redirect("/");

    const economy = await getEconomySettings();
    const rankXP = economy.rankXP as number[];

    const xpR = await prisma.pointTransaction.aggregate({ where: { userId: user.id }, _sum: { points: true } });
    const totalXP = xpR._sum.points || 0;

    const { rank, nextRank, progress } = getRank(totalXP, rankXP);
    const rp = progress;

    const completed = await prisma.userVoyageProgress.count({ where: { userId: user.id, status: { in: ["Completed", "Mastered"] } } });
    const totalV = await prisma.voyage.count();
    const allP = await prisma.userVoyageProgress.findMany({ where: { userId: user.id } });
    const totalSkulls = allP.reduce((s, p) => s + p.skulls, 0);

    const allAch = await prisma.achievement.findMany({ orderBy: { rarity: "asc" } });
    const earnedIds = new Set(user.achievements.map(ua => ua.achievementId));

    const recent = await prisma.trialAttempt.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10, include: { trial: { include: { voyage: { include: { sea: true } } } } } });

    const rarityColors: Record<string, string> = { Common: "border-slate-600 bg-slate-800", Uncommon: "border-emerald-700 bg-emerald-900/30", Rare: "border-blue-700 bg-blue-900/30", Epic: "border-purple-700 bg-purple-900/30", Legendary: "border-amber-600 bg-amber-900/30" };

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/map" className="flex items-center gap-2 text-amber-600 hover:text-amber-400 transition"><span>←</span><span className="text-sm">Chart</span></Link>
                    <h1 className="text-lg" style={{ fontFamily: "'Pirata One',cursive" }}>Wanted Poster</h1>
                    <div className="w-20" />
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Wanted Poster */}
                <div className="wanted-poster rounded-2xl p-8 mb-6 animate-map-unfold">
                    <div className="text-center mb-4"><div className="text-6xl mb-2">🏴‍☠️</div><div className="bounty-tag inline-block text-lg mb-2">WANTED</div><h2 className="text-4xl">{user.name}</h2></div>
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <span className="rank-badge px-4 py-1 text-lg">{rank}</span>
                        <span className="text-4xl" style={{ color: "#D32F2F" }}>⚔️ {totalXP} XP</span>
                    </div>
                    <div className="hull-bar mb-2 max-w-md mx-auto"><div className="hull-bar-fill" style={{ width: `${rp}%` }} /></div>
                    <div className="text-center text-sm" style={{ color: "#5D4037" }}>{rank} → {nextRank || "MAX RANK"} ({Math.round(rp)}%)</div>

                    <div className="grid grid-cols-4 gap-3 mt-6">
                        {[["☠️", totalSkulls, "Skulls"], ["🗺️", `${completed}/${totalV}`, "Voyages"], ["🪙", user.crowns, "Crowns"], ["🔥", user.streaks?.[0]?.currentStreak || 0, "Streak"]].map(([i, v, l]) => (
                            <div key={l} className="text-center p-3 rounded-xl bg-amber-50/50"><div className="text-xl">{i}</div><div className="text-lg font-bold" style={{ color: "#5D4037" }}>{v}</div><div className="text-xs text-amber-700">{l}</div></div>
                        ))}
                    </div>
                </div>

                {/* Sea Charms */}
                <div className="sea-card p-6 mb-6">
                    <h3 className="text-lg mb-4" style={{ fontFamily: "'Pirata One',cursive", color: "#F7C948" }}>🍈 Sea Charms</h3>
                    <div className="grid grid-cols-4 gap-3">
                        {user.charms.map(c => {
                            const icons: Record<string, string> = { whisper_scroll: "📜", storm_pass: "⛈️", fortune_wind: "💨", anchor_charm: "⚓" };
                            const names: Record<string, string> = { whisper_scroll: "Whisper Scroll", storm_pass: "Storm Pass", fortune_wind: "Fortune Wind", anchor_charm: "Anchor Charm" };
                            return <div key={c.id} className="text-center p-3 rounded-xl bg-abyssal/50"><div className="text-2xl mb-1">{icons[c.type] || "❓"}</div><div className="text-lg font-bold" style={{ color: "#F7C948" }}>{c.quantity}</div><div className="text-xs text-amber-600">{names[c.type] || c.type}</div></div>;
                        })}
                        {user.charms.length === 0 && <p className="text-amber-600 text-sm col-span-4">Complete trials to earn sea charms!</p>}
                    </div>
                </div>

                {/* Ship Upgrades */}
                <div className="sea-card p-6 mb-6">
                    <h3 className="text-lg mb-4" style={{ fontFamily: "'Pirata One',cursive", color: "#F7C948" }}>⛵ Ship Upgrades</h3>
                    {user.shipUpgrades.length === 0 ? <p className="text-amber-600 text-sm">Visit the Shipwright to upgrade your vessel!</p> : <div className="space-y-2">{user.shipUpgrades.map(su => <div key={su.id} className="flex items-center gap-3 p-2 rounded-lg bg-abyssal/50"><span className="text-2xl">{su.upgrade.icon}</span><div><div className="font-medium text-sm">{su.upgrade.name}</div><div className="text-xs text-amber-600">{su.upgrade.description}</div></div></div>)}</div>}
                </div>

                {/* Achievements */}
                <div className="sea-card p-6 mb-6">
                    <h3 className="text-lg mb-4" style={{ fontFamily: "'Pirata One',cursive", color: "#F7C948" }}>🏅 Bounty Board ({user.achievements.length}/{allAch.length})</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {allAch.map(a => { const e = earnedIds.has(a.id); return <div key={a.id} className={`p-3 rounded-xl border transition ${e ? rarityColors[a.rarity] || "border-slate-600" : "border-slate-800 bg-slate-900/50 opacity-40"}`}><div className="text-2xl mb-1">{e ? a.icon : "🔒"}</div><div className="text-sm font-medium">{a.name}</div><div className="text-xs text-slate-500">{a.description}</div></div>; })}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="sea-card p-6">
                    <h3 className="text-lg mb-4" style={{ fontFamily: "'Pirata One',cursive", color: "#F7C948" }}>📋 Ship Log</h3>
                    {recent.length === 0 ? <p className="text-amber-600 text-sm">No trials yet. Set sail on a voyage!</p> : <div className="space-y-2">{recent.map(a => <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-abyssal/50 transition"><span className="text-lg">{a.correct ? "✅" : "💪"}</span><div className="flex-1 min-w-0"><div className="text-sm truncate">{a.trial.question.slice(0, 60)}...</div><div className="text-xs text-amber-600">{a.trial.voyage.sea.icon} {a.trial.voyage.title} · {new Date(a.createdAt).toLocaleDateString()}</div></div><div style={{ color: "#F7C948" }}>{"☠️".repeat(a.skulls)}</div></div>)}</div>}
                </div>

                <div className="mt-6 text-center"><a href="/api/auth/signout" className="text-sm text-amber-800 hover:text-amber-600">Abandon Ship</a></div>
            </main>
        </div>
    );
}

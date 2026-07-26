import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEconomySettings, getRank } from "@/lib/economy";
import Link from "next/link";
import { redirect } from "next/navigation";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import RecommendedVoyage from "@/components/RecommendedVoyage";

export default async function MapPage() {
    const session = await auth();
    if (!session?.user) redirect("/");

    const economy = await getEconomySettings();
    const rankXP = economy.rankXP as number[];

    const seas = await prisma.sea.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
            voyages: {
                where: { lifecycle: "Published" },
                orderBy: { sortOrder: "asc" },
                include: { progress: { where: { userId: session.user.id } } },
            },
        },
    });

    const allProgress = await prisma.userVoyageProgress.findMany({ where: { userId: session.user.id } });
    const totalSkulls = allProgress.reduce((s, p) => s + p.skulls, 0);
    const completedVoyages = allProgress.filter(p => p.status === "Completed" || p.status === "Mastered").length;
    const totalVoyages = await prisma.voyage.count();
    const xpResult = await prisma.pointTransaction.aggregate({ where: { userId: session.user.id }, _sum: { points: true } });
    const totalXP = xpResult._sum.points || 0;
    const streak = await prisma.streak.findUnique({ where: { userId: session.user.id } });
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const { rank, nextRank, progress: rankProgress, nextXP } = getRank(totalXP, rankXP);

    // Active system announcements (not expired, matching user role or all-roles)
    const now = new Date();
    const allAnnouncements = await prisma.systemAnnouncement.findMany({
        where: { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        orderBy: { createdAt: "desc" },
        take: 10,
    });
    const announcements = allAnnouncements.filter(a => !a.targetRole || a.targetRole === session.user.role).slice(0, 3);

    const seaColors: Record<string, string> = {
        "Sea of Cunning": "#4F46E5", "Sea of Whispers": "#DC2626",
        "Sea of Navigation": "#059669", "Sea of Brews": "#D97706",
    };

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🏴‍☠️</span>
                        <h1 className="text-xl" style={{ fontFamily: "'Pirata One',cursive", color: "#F7C948" }}>Corsair Academy</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-900/30 border border-amber-700/30">
                            <span className="text-sm">🪙</span>
                            <span className="text-sm font-semibold" style={{ color: "#F7C948" }}>{user?.crowns || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-purple-900/30 border border-purple-700/30">
                            <span className="text-sm">⚡</span>
                            <span className="text-sm font-semibold text-purple-300">{totalXP} XP</span>
                        </div>
                        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-900/30 border border-amber-700/30">
                            <span className="text-sm">🔥</span>
                            <span className="text-sm font-semibold" style={{ color: "#F7C948" }}>{streak?.currentStreak || 0}d</span>
                        </div>
                        <Link href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-abyssal/80 border border-amber-900/30 hover:border-amber-700/50 transition text-sm">
                            <span>🏴</span><span>{session.user.name}</span>
                        </Link>
                    </div>
                </div>
            </header>

            {session.user.impersonatedBy && <ImpersonationBanner studentName={session.user.name} />}

            {announcements.length > 0 && (
                <div className="max-w-6xl mx-auto px-4 pt-4 space-y-2">
                    {announcements.map(a => (
                        <div key={a.id} className="p-3 rounded-lg bg-amber-900/20 border border-amber-700/40 text-center animate-sail">
                            <strong className="text-sm" style={{ color: "#F7C948" }}>📢 {a.title}</strong>
                            <span className="text-sm text-amber-300 ml-2">{a.body}</span>
                        </div>
                    ))}
                </div>
            )}

            <main className="max-w-6xl mx-auto px-4 py-8">
                {/* Wanted Poster Banner */}
                <div className="wanted-poster rounded-2xl p-6 mb-8 animate-map-unfold">
                    <div className="flex items-center gap-6">
                        <div className="text-6xl">🏴‍☠️</div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-3xl">{session.user.name}</h2>
                                <span className="rank-badge px-3 py-1 rounded-full text-sm">{rank}</span>
                                <span className="bounty-tag text-sm">⚔️ {totalXP} XP</span>
                            </div>
                            <div className="hull-bar mb-1">
                                <div className="hull-bar-fill" style={{ width: `${rankProgress}%` }} />
                            </div>
                            <div className="flex justify-between text-xs" style={{ color: "#5D4037" }}>
                                <span>{rank}</span>
                                {nextRank && <span>Next: {nextRank} ({nextXP} XP)</span>}
                            </div>
                        </div>
                        <div className="text-center" style={{ color: "#5D4037" }}>
                            <div className="text-3xl font-bold" style={{ color: "#D32F2F", fontFamily: "'Pirata One',cursive" }}>🪙 {user?.crowns || 0}</div>
                            <div className="text-xs">Crowns</div>
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {[
                        ["☠️", totalSkulls, "Skulls"],
                        ["🗺️", `${completedVoyages}/${totalVoyages}`, "Voyages"],
                        ["🔥", streak?.currentStreak || 0, "Day Streak"],
                        ["⚓", streak?.longestStreak || 0, "Best Streak"],
                    ].map(([icon, val, label]) => (
                        <div key={label} className="sea-card p-4 text-center">
                            <div className="text-2xl mb-1">{icon}</div>
                            <div className="text-xl font-bold" style={{ color: "#F7C948" }}>{val}</div>
                            <div className="text-xs text-amber-700">{label}</div>
                        </div>
                    ))}
                </div>

                {/* Navigation */}
                <div className="flex gap-4 mb-6">
                    <Link href="/tavern" className="btn-pirate text-sm flex items-center gap-2">
                        🍺 Tavern Shop
                    </Link>
                    <Link href="/ship" className="btn-pirate text-sm flex items-center gap-2">
                        ⛵ Ship Upgrades
                    </Link>
                </div>

                {/* AI Personalization */}
                <RecommendedVoyage />

                {/* Seas */}
                <h2 className="text-2xl mb-6" style={{ color: "#F7C948" }}>🗺️ Chart Your Course</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {seas.map(sea => {
                        const seaDone = sea.voyages.filter(v => v.progress.some(p => p.status === "Completed" || p.status === "Mastered")).length;
                        return (
                            <div key={sea.id} className="sea-card p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-3xl">{sea.icon}</span>
                                    <div>
                                        <h3 style={{ fontFamily: "'Pirata One',cursive", fontSize: "1.25rem", color: "#F7C948" }}>{sea.name}</h3>
                                        <p className="text-sm text-amber-600">{sea.description}</p>
                                    </div>
                                </div>
                                <div className="hull-bar mb-2">
                                    <div className="hull-bar-fill" style={{ width: `${sea.voyages.length > 0 ? (seaDone / sea.voyages.length) * 100 : 0}%` }} />
                                </div>
                                <p className="text-xs text-amber-700 mb-4">{seaDone}/{sea.voyages.length} conquered</p>
                                <div className="space-y-2">
                                    {sea.voyages.map((v, idx) => {
                                        const p = v.progress[0];
                                        // Locked if: progress says Locked, OR no progress AND (has prerequisite OR not first in sea)
                                        const locked = p?.status === "Locked" || (!p && (!!v.requiredVoyageId || idx > 0));
                                        const done = p?.status === "Completed" || p?.status === "Mastered";
                                        return (
                                            <div key={v.id} className={`voyage-node flex items-center gap-3 p-3 rounded-xl transition ${locked ? "locked" : done ? "bg-emerald-900/20 border border-emerald-700/30" : "bg-abyssal/50 border border-amber-900/20 hover:border-amber-700/40"}`}>
                                                {locked ? (
                                                    <>
                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm bg-slate-800">🔒</div>
                                                        <div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{v.title}</div>
                                                            <div className="text-xs text-amber-700">{v.captainGauntlet && "⚔️ Gauntlet · "}{"☠️".repeat(v.difficulty)}</div></div>
                                                    </>
                                                ) : (
                                                    <Link href={`/voyage/${v.id}`} className="flex items-center gap-3 flex-1">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${done ? "bg-emerald-600" : "bg-amber-600"}`}>
                                                            {done ? "✅" : v.captainGauntlet ? "👑" : "▶️"}
                                                        </div>
                                                        <div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{v.title}</div>
                                                            <div className="text-xs text-amber-700">{v.captainGauntlet && "⚔️ Gauntlet · "}{"☠️".repeat(v.difficulty)}</div></div>
                                                        {done && <div style={{ color: "#F7C948" }}>{"☠️".repeat(p?.skulls || 0)}</div>}
                                                    </Link>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}

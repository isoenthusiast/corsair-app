import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ShipPage() {
    const session = await auth();
    if (!session?.user) redirect("/");

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { shipUpgrades: { include: { upgrade: true } } } });
    if (!user) redirect("/");

    const upgrades = await prisma.shipUpgrade.findMany({ orderBy: { sortOrder: "asc" } });
    const ownedIds = new Set(user.shipUpgrades.map(su => su.upgradeId));

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/map" className="flex items-center gap-2 text-amber-600 hover:text-amber-400 transition"><span>←</span><span className="text-sm">Chart</span></Link>
                    <h1 className="text-lg" style={{ fontFamily: "'Pirata One',cursive" }}>⛵ Shipwright's Dock</h1>
                    <div className="flex items-center gap-1"><span>🪙</span><span className="font-bold" style={{ color: "#F7C948" }}>{user.crowns}</span></div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="wanted-poster rounded-2xl p-6 mb-6">
                    <h2 className="text-2xl mb-2">Upgrade Your Ship!</h2>
                    <p className="text-amber-700">Permanent upgrades that improve your pirating abilities.</p>
                    <p className="text-sm mt-2" style={{ color: "#5D4037" }}>🪙 Balance: <strong>{user.crowns} Crowns</strong></p>
                </div>

                <div className="space-y-4">
                    {upgrades.length === 0 ? (
                        <div className="sea-card p-12 text-center"><p className="text-amber-600">The shipwright is still stocking the docks. Check back soon!</p></div>
                    ) : (
                        upgrades.map(u => {
                            const owned = ownedIds.has(u.id);
                            return (
                                <div key={u.id} className={`sea-card p-6 ${owned ? "border-emerald-700" : ""}`}>
                                    <div className="flex items-center gap-4">
                                        <span className="text-4xl">{u.icon}</span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg" style={{ fontFamily: "'Pirata One',cursive", color: "#F7C948" }}>{u.name}</h3>
                                                {owned && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-700/30">OWNED</span>}
                                            </div>
                                            <p className="text-sm text-amber-600">{u.description}</p>
                                        </div>
                                        {owned ? (
                                            <span className="text-emerald-400">✅</span>
                                        ) : (
                                            <form action={`/api/shop/buy-upgrade`} method="POST">
                                                <input type="hidden" name="userId" value={user.id} />
                                                <input type="hidden" name="upgradeId" value={u.id} />
                                                <input type="hidden" name="cost" value={u.cost} />
                                                <button type="submit" className="btn-pirate text-sm" disabled={user.crowns < u.cost}>
                                                    🪙 {u.cost}
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>
        </div>
    );
}

import { auth } from "@/lib/auth";
import { getEconomySettings } from "@/lib/economy";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function EconomyPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");

    const ECONOMY_DEFAULTS = await getEconomySettings();

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/admin" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Admiral</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>💰 Economy Panel</h1>
                    <div className="w-20" />
                </div>
            </header>
            <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
                <div className="sea-card p-6">
                    <h2 className="text-lg mb-4" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>Crown Rate</h2>
                    <p className="text-sm text-amber-600 mb-3">Crowns awarded = XP × rate (currently {ECONOMY_DEFAULTS.crownRate})</p>
                    <form action="/api/admin/economy" method="POST" className="flex gap-3">
                        <input type="hidden" name="setting" value="crownRate" />
                        <input name="value" type="number" step="0.1" min="0.1" max="1.0" defaultValue={ECONOMY_DEFAULTS.crownRate} className="w-24 px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white" />
                        <button className="btn-pirate text-sm">Save</button>
                    </form>
                </div>

                <div className="sea-card p-6">
                    <h2 className="text-lg mb-4" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>🍺 Tavern Prices</h2>
                    <div className="space-y-2">
                        {Object.entries(ECONOMY_DEFAULTS.shopPrices).map(([item, price]) => (
                            <form key={item} action="/api/admin/economy" method="POST" className="flex items-center gap-3">
                                <input type="hidden" name="setting" value={`shop_${item}`} />
                                <span className="w-40 text-sm capitalize">{item.replace(/_/g, " ")}</span>
                                <input name="value" type="number" defaultValue={price} className="w-24 px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" />
                                <span className="text-xs text-amber-600">🪙</span>
                                <button className="btn-pirate text-xs">Save</button>
                            </form>
                        ))}
                    </div>
                </div>

                <div className="sea-card p-6">
                    <h2 className="text-lg mb-4" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>⛵ Ship Upgrade Costs</h2>
                    <div className="space-y-2">
                        {["Reinforced Hull", "Crow's Nest", "Treasure Hold", "Cannon Array", "Phantom Sails"].map((name, i) => (
                            <form key={name} action="/api/admin/economy" method="POST" className="flex items-center gap-3">
                                <input type="hidden" name="setting" value={`upgrade_${i}`} />
                                <span className="w-40 text-sm">{name}</span>
                                <input name="value" type="number" defaultValue={ECONOMY_DEFAULTS.upgradeCosts[i]} className="w-24 px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" />
                                <span className="text-xs text-amber-600">🪙</span>
                                <button className="btn-pirate text-xs">Save</button>
                            </form>
                        ))}
                    </div>
                </div>

                <div className="sea-card p-6">
                    <h2 className="text-lg mb-4" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>👑 Rank XP Thresholds</h2>
                    {["Deckhand", "Swabbie", "Gunner", "Boatswain", "Quartermaster", "First Mate", "Captain", "Commodore", "Sea Lord"].map((rank, i) => (
                        <form key={rank} action="/api/admin/economy" method="POST" className="flex items-center gap-3 mb-2">
                            <input type="hidden" name="setting" value={`rank_${i}`} />
                            <span className="w-32 text-sm">{rank}</span>
                            <input name="value" type="number" defaultValue={ECONOMY_DEFAULTS.rankXP[i]} className="w-24 px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" />
                            <span className="text-xs text-amber-600">XP</span>
                            <button className="btn-pirate text-xs">Save</button>
                        </form>
                    ))}
                </div>

                <form action="/api/admin/economy/reset" method="POST" className="text-center">
                    <button className="btn-cannon text-sm">Reset All to Defaults</button>
                </form>
            </main>
        </div>
    );
}

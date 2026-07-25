import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

const SHOP_ITEMS = [
    { type: "whisper_scroll" as const, name: "Whisper Scroll", icon: "📜", cost: 20, desc: "Reveals a hint for any trial" },
    { type: "storm_pass" as const, name: "Storm Pass", icon: "⛈️", cost: 50, desc: "Skip one trial instantly" },
    { type: "fortune_wind" as const, name: "Fortune Wind", icon: "💨", cost: 100, desc: "Double XP for 1 hour" },
    { type: "anchor_charm" as const, name: "Anchor Charm", icon: "⚓", cost: 150, desc: "Freeze your streak for 1 day" },
];

export default async function TavernPage() {
    const session = await auth();
    if (!session?.user) redirect("/");

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { charms: true } });
    if (!user) redirect("/");

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/map" className="flex items-center gap-2 text-amber-600 hover:text-amber-400 transition"><span>←</span><span className="text-sm">Chart</span></Link>
                    <h1 className="text-lg" style={{ fontFamily: "'Pirata One',cursive" }}>🍺 The Tipsy Kraken Tavern</h1>
                    <div className="flex items-center gap-1"><span>🪙</span><span className="font-bold" style={{ color: "#F7C948" }}>{user.crowns}</span></div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="wanted-poster rounded-2xl p-6 mb-6">
                    <h2 className="text-2xl mb-2">Welcome, Sailor!</h2>
                    <p className="text-amber-700">Spend your hard-earned crowns on sea charms and supplies.</p>
                    <p className="text-sm mt-2" style={{ color: "#5D4037" }}>🪙 Balance: <strong>{user.crowns} Crowns</strong></p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SHOP_ITEMS.map(item => {
                        const owned = user.charms.find(c => c.type === item.type);
                        return (
                            <div key={item.type} className="sea-card p-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-3xl">{item.icon}</span>
                                    <div>
                                        <h3 className="text-lg" style={{ fontFamily: "'Pirata One',cursive", color: "#F7C948" }}>{item.name}</h3>
                                        <p className="text-xs text-amber-600">{item.desc}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Owned: <strong style={{ color: "#F7C948" }}>{owned?.quantity || 0}</strong></span>
                                    <form action={`/api/shop/buy`} method="POST">
                                        <input type="hidden" name="userId" value={user.id} />
                                        <input type="hidden" name="itemType" value={item.type} />
                                        <input type="hidden" name="cost" value={item.cost} />
                                        <button type="submit" className="btn-pirate text-sm" disabled={user.crowns < item.cost}>
                                            Buy 🪙 {item.cost}
                                        </button>
                                    </form>
                                </div>
                                {user.crowns < item.cost && <p className="text-xs text-red-400 mt-2">Not enough crowns!</p>}
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminVoyagesPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");
    const seas = await prisma.sea.findMany({ orderBy: { sortOrder: "asc" }, include: { voyages: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { trials: true } } } } } });

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/admin" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Admiral</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>🗺️ Manage Curriculum</h1>
                </div>
            </header>
            <main className="max-w-6xl mx-auto px-4 py-8">
                {seas.map(sea => (
                    <div key={sea.id} className="mb-8">
                        <h2 className="text-lg mb-4" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>{sea.icon} {sea.name}</h2>
                        <div className="space-y-2">
                            {sea.voyages.map(v => (
                                <div key={v.id} className="sea-card p-4 flex items-center gap-4">
                                    <span className="text-sm px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400">{v.status || "Draft"}</span>
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">{v.title} {v.captainGauntlet && "⚔️"}</div>
                                        <div className="text-xs text-amber-600">{v._count.trials} trials · {"☠️".repeat(v.difficulty)}</div>
                                    </div>
                                    <Link href={`/admin/voyages/${v.id}`} className="text-amber-400 text-sm hover:text-amber-200">Edit</Link>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </main>
        </div>
    );
}

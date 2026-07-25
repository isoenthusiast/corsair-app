import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function TemplatesPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");

    const bundles = await prisma.voyageBundle.findMany({ include: { items: { include: { voyage: { include: { sea: true } } } } } });
    const allVoyages = await prisma.voyage.findMany({ include: { sea: true }, orderBy: { sortOrder: "asc" } });
    const classes = await prisma.class.findMany();

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/admin" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Admiral</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>📦 Curriculum Templates</h1>
                    <div className="w-20" />
                </div>
            </header>
            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Existing bundles */}
                <div className="space-y-4 mb-8">
                    {bundles.map(b => (
                        <div key={b.id} className="sea-card p-6">
                            <h2 className="text-lg mb-2" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>{b.name}</h2>
                            <p className="text-xs text-amber-600 mb-3">{b.items.length} voyages</p>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {b.items.map(item => <span key={item.id} className="px-2 py-1 rounded-full bg-abyssal text-xs text-amber-400">{item.voyage.sea.icon} {item.voyage.title}</span>)}
                            </div>
                            <div className="flex gap-2">
                                {classes.map(c => (
                                    <form key={c.id} action="/api/admin/templates/apply" method="POST">
                                        <input type="hidden" name="bundleId" value={b.id} />
                                        <input type="hidden" name="classId" value={c.id} />
                                        <button className="btn-pirate text-xs">Apply to {c.name}</button>
                                    </form>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Create new */}
                <div className="sea-card p-6">
                    <h2 className="text-lg mb-4" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>Create Template</h2>
                    <form action="/api/admin/templates/create" method="POST" className="space-y-3">
                        <div><input name="name" placeholder="Template name..." className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white" required /></div>
                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                            {allVoyages.map(v => (
                                <label key={v.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="checkbox" name="voyageIds" value={v.id} className="accent-amber-600" />
                                    {v.sea.icon} {v.title}
                                </label>
                            ))}
                        </div>
                        <button className="btn-pirate text-sm">Create Template</button>
                    </form>
                </div>
            </main>
        </div>
    );
}

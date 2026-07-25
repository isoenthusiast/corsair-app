import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AnnouncementsPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");
    const announcements = await prisma.systemAnnouncement.findMany({ orderBy: { createdAt: "desc" }, include: { admin: { select: { name: true } } } });

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/admin" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Admiral</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>📢 System Announcements</h1>
                    <div className="w-20" />
                </div>
            </header>
            <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* Create */}
                <div className="sea-card p-6">
                    <h2 className="text-lg font-bold mb-4" style={{ color: "#F7C948" }}>📝 New Announcement</h2>
                    <form action="/api/admin/announcements/create" method="POST" className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2"><input name="title" placeholder="Title" required className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" /></div>
                            <div><select name="targetRole" className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm"><option value="">All Roles</option>{["Student", "Teacher", "Parent"].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                        </div>
                        <textarea name="body" placeholder="Message body..." required rows={3} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" />
                        <div className="flex gap-3 items-end">
                            <div><label className="block text-xs text-amber-600 mb-1">Expires (optional)</label><input name="expiresAt" type="date" className="px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" /></div>
                            <button type="submit" className="btn-pirate text-sm">Broadcast 📢</button>
                        </div>
                    </form>
                </div>

                {/* List */}
                <div className="sea-card p-6">
                    <h2 className="text-lg font-bold mb-4" style={{ color: "#F7C948" }}>📋 Active Announcements ({announcements.length})</h2>
                    {announcements.length === 0 ? <p className="text-amber-600 text-sm">No announcements yet.</p> : (
                        <div className="space-y-3">
                            {announcements.map(a => (
                                <div key={a.id} className="p-4 rounded-lg bg-abyssal/50 border border-amber-900/20">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-bold" style={{ color: "#F7C948" }}>{a.title}</h3>
                                            <p className="text-sm text-amber-300 mt-1">{a.body}</p>
                                            <div className="flex gap-3 mt-2 text-xs text-amber-600">
                                                <span>By {a.admin.name}</span>
                                                {a.targetRole && <span>🎯 {a.targetRole}s only</span>}
                                                {a.expiresAt && <span>⌛ Expires {new Date(a.expiresAt).toLocaleDateString()}</span>}
                                                <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <form action="/api/admin/announcements/delete" method="POST">
                                            <input type="hidden" name="id" value={a.id} />
                                            <button className="text-red-400 hover:text-red-300 text-xs">✕</button>
                                        </form>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";

export default async function InvitesPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");

    const invites = await prisma.inviteLink.findMany({
        orderBy: { createdAt: "desc" },
        include: { creator: { select: { name: true } } },
    });

    const now = new Date();

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/admin" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Admiral</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>🔗 Invite Links</h1>
                    <div className="w-20" />
                </div>
            </header>
            <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* Generate */}
                <div className="sea-card p-6">
                    <h2 className="text-lg font-bold mb-4" style={{ color: "#F7C948" }}>🪝 Generate Invite Link</h2>
                    <form action="/api/admin/invites/create" method="POST" className="flex items-end gap-4">
                        <div>
                            <label className="block text-xs text-amber-600 mb-1">Role</label>
                            <select name="role" className="px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm">
                                {["Student", "Teacher", "Parent"].map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-amber-600 mb-1">Expires In</label>
                            <select name="expiryDays" className="px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm">
                                <option value="1">1 day</option>
                                <option value="3">3 days</option>
                                <option value="7" selected>7 days</option>
                                <option value="14">14 days</option>
                                <option value="30">30 days</option>
                            </select>
                        </div>
                        <button type="submit" className="btn-pirate text-sm">Generate Link 🔗</button>
                    </form>
                </div>

                {/* List */}
                <div className="sea-card p-6">
                    <h2 className="text-lg font-bold mb-4" style={{ color: "#F7C948" }}>📋 All Invites ({invites.length})</h2>
                    {invites.length === 0 ? <p className="text-amber-600 text-sm">No invites generated yet.</p> : (
                        <div className="space-y-2">
                            {invites.map(inv => {
                                const isUsed = !!inv.usedById;
                                const isExpired = new Date(inv.expiresAt) < now;
                                const status = isUsed ? "Used" : isExpired ? "Expired" : "Active";
                                const statusColor = isUsed ? "bg-slate-800 text-slate-400" : isExpired ? "bg-red-900/30 text-red-400" : "bg-emerald-900/30 text-emerald-400";
                                const inviteUrl = `${process.env.AUTH_URL || "http://localhost:3200"}/invite/${inv.token}`;
                                return (
                                    <div key={inv.id} className="p-3 rounded-lg bg-abyssal/50 border border-amber-900/20 flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium" style={{ color: "#F7C948" }}>{inv.role}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor}`}>{status}</span>
                                            </div>
                                            <div className="flex gap-3 mt-1 text-xs text-amber-600">
                                                <span>{inv.token.slice(0, 8)}...</span>
                                                <span>By {inv.creator.name}</span>
                                                <span>Expires {new Date(inv.expiresAt).toLocaleDateString()}</span>
                                                <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            {!isUsed && (
                                                <>
                                                    <CopyButton url={inviteUrl} />
                                                    <form action="/api/admin/invites/revoke" method="POST" className="inline">
                                                        <input type="hidden" name="id" value={inv.id} />
                                                        <button className="px-2 py-1 rounded bg-red-900/30 text-red-400 text-xs hover:bg-red-900/50">✕ Revoke</button>
                                                    </form>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

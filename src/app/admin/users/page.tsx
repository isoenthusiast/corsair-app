import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminUsersPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, include: { pointLog: { select: { id: true } } } });

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/admin" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Admiral</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>👥 Manage Users</h1>
                    <Link href="/admin/users/new" className="btn-pirate text-sm">+ New User</Link>
                </div>
            </header>
            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="sea-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-amber-900/20 text-amber-600 text-left">
                            {["Name", "Username", "Role", "Status", "XP", "Crowns", "Rank", "Actions"].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} className="border-b border-amber-900/10 hover:bg-abyssal/50">
                                    <td className="p-3">{u.name}</td>
                                    <td className="p-3 text-amber-400">{u.username}</td>
                                    <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs bg-amber-900/30 text-amber-400">{u.role}</span></td>
                                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${u.status === "Active" ? "bg-emerald-900/30 text-emerald-400" : u.status === "Inactive" ? "bg-slate-800 text-slate-400" : "bg-red-900/30 text-red-400"}`}>{u.status || "Active"}</span></td>
                                    <td className="p-3">{u.pointLog?.length || 0} XP</td>
                                    <td className="p-3">🪙 {u.crowns}</td>
                                    <td className="p-3">{u.pirateRank}</td>
                                    <td className="p-3"><Link href={`/admin/users/${u.id}`} className="text-amber-400 hover:text-amber-200 text-xs">Edit</Link></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}

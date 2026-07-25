import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function UserEditPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return <div className="min-h-screen treasure-map flex items-center justify-center"><p className="text-amber-600">User not found</p></div>;

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/admin/users" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Users</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>Edit: {user.name}</h1>
                    <div className="w-20" />
                </div>
            </header>
            <main className="max-w-2xl mx-auto px-4 py-8">
                <div className="sea-card p-6">
                    <form action="/api/admin/users/update" method="POST" className="space-y-4">
                        <input type="hidden" name="userId" value={user.id} />
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm text-amber-600 mb-1">Name</label><input name="name" defaultValue={user.name} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white" /></div>
                            <div><label className="block text-sm text-amber-600 mb-1">Username</label><input name="username" defaultValue={user.username} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white" /></div>
                            <div><label className="block text-sm text-amber-600 mb-1">Role</label><select name="role" defaultValue={user.role} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white">
                                {["Student", "Teacher", "Parent", "Admin"].map(r => <option key={r} value={r}>{r}</option>)}
                            </select></div>
                            <div><label className="block text-sm text-amber-600 mb-1">Status</label><select name="status" defaultValue={user.status || "Active"} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white">
                                {["Active", "Inactive", "Suspended"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select></div>
                            <div><label className="block text-sm text-amber-600 mb-1">Age</label><input name="age" type="number" defaultValue={user.age || ""} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white" /></div>
                            <div><label className="block text-sm text-amber-600 mb-1">Crowns</label><input name="crowns" type="number" defaultValue={user.crowns} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white" /></div>
                        </div>
                        <div><label className="block text-sm text-amber-600 mb-1">Bio</label><textarea name="bio" defaultValue={user.bio || ""} rows={2} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white" /></div>
                        <div className="flex gap-3">
                            <button type="submit" className="btn-pirate">Save Changes</button>
                            <button formAction="/api/admin/users/reset-password" className="btn-cannon text-sm">Reset Password</button>
                            {!user.deletedAt && <button formAction="/api/admin/users/delete" className="px-4 py-2 rounded-lg bg-red-900/30 border border-red-700 text-red-400 text-sm">Soft Delete</button>}
                            {user.deletedAt && <button formAction="/api/admin/users/restore" className="px-4 py-2 rounded-lg bg-emerald-900/30 border border-emerald-700 text-emerald-400 text-sm">Restore</button>}
                        </div>
                    </form>
                    {user.role !== "Admin" && (
                        <form action="/api/admin/impersonate" method="POST" className="mt-4 pt-4 border-t border-amber-900/20">
                            <input type="hidden" name="userId" value={user.id} />
                            <button type="submit" className="px-4 py-2 rounded-lg bg-amber-900/30 border border-amber-600/50 text-amber-400 text-sm hover:bg-amber-900/50 w-full">
                                🏴 Login as {user.name}
                            </button>
                        </form>
                    )}
                    <div className="mt-4 p-3 rounded-lg bg-abyssal/50 text-xs text-amber-600">
                        Created: {new Date(user.createdAt).toLocaleString()}<br />
                        {user.deletedAt && <>Deleted: {new Date(user.deletedAt).toLocaleString()}<br /></>}
                        Rank: {user.pirateRank}
                    </div>
                </div>
            </main>
        </div>
    );
}

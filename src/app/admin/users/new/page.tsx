import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function CreateUserPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/admin/users" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Users</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>🆕 Create User</h1>
                    <div className="w-20" />
                </div>
            </header>
            <main className="max-w-2xl mx-auto px-4 py-8">
                <div className="sea-card p-6">
                    <form action="/api/admin/users/create" method="POST" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm text-amber-600 mb-1">Name</label><input name="name" required className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white" placeholder="e.g., Blackbeard Jr." /></div>
                            <div><label className="block text-sm text-amber-600 mb-1">Username</label><input name="username" required className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white" placeholder="e.g., blackbeard" /></div>
                            <div><label className="block text-sm text-amber-600 mb-1">Password</label><input name="password" type="password" required className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white" placeholder="Min 6 characters" /></div>
                            <div><label className="block text-sm text-amber-600 mb-1">Role</label><select name="role" defaultValue="Student" className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white">
                                {["Student", "Teacher", "Parent", "Admin"].map(r => <option key={r} value={r}>{r}</option>)}
                            </select></div>
                            <div><label className="block text-sm text-amber-600 mb-1">Status</label><select name="status" defaultValue="Active" className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white">
                                {["Active", "Inactive", "Suspended"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select></div>
                            <div><label className="block text-sm text-amber-600 mb-1">Age</label><input name="age" type="number" className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white" placeholder="Optional" /></div>
                            <div><label className="block text-sm text-amber-600 mb-1">Starting Crowns</label><input name="crowns" type="number" defaultValue="0" className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white" /></div>
                        </div>
                        <div><label className="block text-sm text-amber-600 mb-1">Bio</label><textarea name="bio" rows={2} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white" placeholder="Optional pirate backstory" /></div>
                        <button type="submit" className="btn-pirate">Create User</button>
                    </form>
                </div>
            </main>
        </div>
    );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");

    const [userCount, classCount, voyageCount, trialCount] = await Promise.all([
        prisma.user.count(),
        prisma.class.count(),
        prisma.voyage.count(),
        prisma.trial.count(),
    ]);

    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 10 });
    const classes = await prisma.class.findMany({ include: { teachers: { include: { teacher: true } }, _count: { select: { students: true } } } });

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3"><span className="text-2xl">🏴‍☠️</span><h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>Admiral's Command</h1></div>
                    <div className="flex items-center gap-3"><span className="text-sm text-amber-600">{session.user.name}</span><a href="/api/auth/signout" className="text-sm text-amber-800 hover:text-amber-400">Abandon Ship</a></div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {[["👥", userCount, "Users"], ["🏫", classCount, "Classes"], ["🗺️", voyageCount, "Voyages"], ["⚔️", trialCount, "Trials"]].map(([i, v, l]) => (
                        <div key={l} className="sea-card p-4 text-center"><div className="text-2xl mb-1">{i}</div><div className="text-2xl font-bold" style={{ color: "#F7C948" }}>{v}</div><div className="text-xs text-amber-700">{l}</div></div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="sea-card p-6">
                        <h2 className="text-lg mb-4" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>👥 Recent Users</h2>
                        <div className="space-y-2">
                            {users.map(u => (
                                <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg bg-abyssal/50">
                                    <span className="text-sm px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400">{u.role}</span>
                                    <span className="flex-1 text-sm">{u.name}</span>
                                    <span className="text-xs text-amber-600">🪙 {u.crowns}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="sea-card p-6">
                        <h2 className="text-lg mb-4" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>🏫 Classes</h2>
                        <div className="space-y-2">
                            {classes.map(c => (
                                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-abyssal/50">
                                    <span className="text-sm">{c.name}</span>
                                    <span className="text-xs text-amber-600">Teacher: {c.teachers[0]?.teacher.name || "Unassigned"}</span>
                                    <span className="ml-auto text-xs text-amber-600">{c._count.students} students</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-6">
                    <Link href="/admin/users" className="sea-card p-6 text-center hover:border-amber-600 transition">
                        <div className="text-3xl mb-2">👥</div><div className="font-bold" style={{ color: "#F7C948" }}>Manage Users</div>
                    </Link>
                    <Link href="/admin/classes" className="sea-card p-6 text-center hover:border-amber-600 transition">
                        <div className="text-3xl mb-2">🏫</div><div className="font-bold" style={{ color: "#F7C948" }}>Manage Classes</div>
                    </Link>
                    <Link href="/admin/voyages" className="sea-card p-6 text-center hover:border-amber-600 transition">
                        <div className="text-3xl mb-2">🗺️</div><div className="font-bold" style={{ color: "#F7C948" }}>Manage Curriculum</div>
                    </Link>
                    <Link href="/admin/announcements" className="sea-card p-6 text-center hover:border-amber-600 transition">
                        <div className="text-3xl mb-2">📢</div><div className="font-bold" style={{ color: "#F7C948" }}>Announcements</div>
                    </Link>
                </div>
            </main>
        </div>
    );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const RANKS = ["Deckhand", "Swabbie", "Gunner", "Boatswain", "Quartermaster", "First Mate", "Captain", "Commodore", "Sea Lord"];

export default async function ClassPage() {
    const session = await auth();
    if (!session?.user || (session.user.role !== "Teacher" && session.user.role !== "Admin")) redirect("/");

    const classes = session.user.role === "Admin"
        ? await prisma.class.findMany({ include: { teachers: { include: { teacher: true } }, _count: { select: { students: true } } } })
        : await prisma.class.findMany({ where: { teachers: { some: { teacherId: session.user.id } } }, include: { _count: { select: { students: true } } } });

    if (classes.length === 0) {
        return (
            <div className="min-h-screen treasure-map flex items-center justify-center">
                <div className="text-center"><div className="text-6xl mb-4">🏫</div><h1 className="text-2xl" style={{ color: "#F7C948" }}>No Classes Yet</h1><p className="text-amber-600">Contact the Admiral to set up your classes.</p></div>
            </div>
        );
    }

    // If only one class, redirect to it
    if (classes.length === 1 && session.user.role !== "Admin") {
        redirect(`/class/${classes[0].id}`);
    }

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>🏫 Your Classes</h1>
                    <a href="/api/auth/signout" className="text-sm text-amber-800 hover:text-amber-400">Abandon Ship</a>
                </div>
            </header>
            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="grid gap-4">
                    {classes.map(c => (
                        <a key={c.id} href={`/class/${c.id}`} className="sea-card p-6 hover:border-amber-600 transition">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">🏴‍☠️</span>
                                <div className="flex-1"><h2 className="text-lg" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>{c.name}</h2><p className="text-sm text-amber-600">{c._count.students} crew members</p></div>
                                <span className="text-2xl">→</span>
                            </div>
                        </a>
                    ))}
                </div>
            </main>
        </div>
    );
}

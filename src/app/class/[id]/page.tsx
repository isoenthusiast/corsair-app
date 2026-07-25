import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const RANKS = ["Deckhand", "Swabbie", "Gunner", "Boatswain", "Quartermaster", "First Mate", "Captain", "Commodore", "Sea Lord"];
const RANK_XP = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000];

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || (session.user.role !== "Teacher" && session.user.role !== "Admin")) redirect("/");
    const { id } = await params;

    const classData = await prisma.class.findUnique({
        where: { id },
        include: {
            teachers: { include: { teacher: true } },
            students: { include: { student: true } },
            assignments: { include: { voyage: true }, orderBy: { createdAt: "desc" } },
            announcements: { orderBy: { createdAt: "desc" } },
        },
    });
    if (!classData) return <div className="min-h-screen treasure-map flex items-center justify-center"><p className="text-amber-600">Class not found</p></div>;

    // Get XP for each student for leaderboard
    const studentStats = await Promise.all(classData.students.map(async sc => {
        const xpR = await prisma.pointTransaction.aggregate({ where: { userId: sc.studentId }, _sum: { points: true } });
        const xp = xpR._sum.points || 0;
        let rank = "Deckhand";
        for (let i = RANKS.length - 1; i >= 0; i--) { if (xp >= RANK_XP[i]) { rank = RANKS[i]; break; } }
        const done = await prisma.userVoyageProgress.count({ where: { userId: sc.studentId, status: { in: ["Completed", "Mastered"] } } });
        return { student: sc.student, xp, rank, voyagesDone: done };
    }));
    studentStats.sort((a, b) => b.xp - a.xp);

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <a href="/class" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Classes</span></a>
                    <h1 className="text-lg" style={{ fontFamily: "'Pirata One', cursive" }}>{classData.name}</h1>
                    <span className="text-sm text-amber-600">Teacher: {classData.teachers[0]?.teacher.name || "Unassigned"}</span>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Leaderboard */}
                <div className="wanted-poster rounded-2xl p-6 mb-6">
                    <h2 className="text-2xl mb-4">🏆 Crew Leaderboard</h2>
                    <div className="space-y-2">
                        {studentStats.map((s, i) => (
                            <div key={s.student.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/50">
                                <span className="text-xl font-bold" style={{ color: "#5D4037" }}>#{i + 1}</span>
                                <span className="text-2xl">🏴</span>
                                <div className="flex-1">
                                    <div className="font-bold" style={{ color: "#3E2723" }}>{s.student.name}</div>
                                    <div className="text-xs text-amber-700">{s.rank} · {s.voyagesDone} voyages done</div>
                                </div>
                                <span className="font-bold" style={{ color: "#D32F2F" }}>{s.xp} XP</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Assignments */}
                <div className="sea-card p-6 mb-6">
                    <h2 className="text-lg mb-4" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>📋 Assignments</h2>
                    {classData.assignments.length === 0 ? <p className="text-amber-600 text-sm">No assignments yet.</p> :
                        <div className="space-y-2">{classData.assignments.map(a => (
                            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-abyssal/50">
                                <span>🗺️</span>
                                <div className="flex-1"><div className="text-sm font-medium">{a.voyage.title}</div></div>
                                {a.dueDate && <span className="text-xs text-amber-600">Due: {new Date(a.dueDate).toLocaleDateString()}</span>}
                            </div>
                        ))}</div>}
                </div>

                {/* Announcements */}
                <div className="sea-card p-6">
                    <h2 className="text-lg mb-4" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>📢 Announcements</h2>
                    {classData.announcements.length === 0 ? <p className="text-amber-600 text-sm">No announcements.</p> :
                        <div className="space-y-3">{classData.announcements.map(a => (
                            <div key={a.id} className="p-4 rounded-xl bg-abyssal/50">
                                <div className="font-medium text-sm">{a.title}</div>
                                <p className="text-sm text-amber-600 mt-1">{a.body}</p>
                                <p className="text-xs text-amber-800 mt-2">{new Date(a.createdAt).toLocaleDateString()}</p>
                            </div>
                        ))}</div>}
                </div>
            </main>
        </div>
    );
}

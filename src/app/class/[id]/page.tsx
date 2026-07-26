import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEconomySettings, getRank } from "@/lib/economy";
import { redirect } from "next/navigation";

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || (session.user.role !== "Teacher" && session.user.role !== "Admin")) redirect("/");
    const { id } = await params;

    const economy = await getEconomySettings();
    const rankXP = economy.rankXP as number[];

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
        const { rank } = getRank(xp, rankXP);
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
                    {/* Create Assignment Form */}
                    <form action={`/api/class/${id}/assignments`} method="POST" className="mt-4 p-4 rounded-xl bg-abyssal/30 border border-amber-900/20 space-y-3">
                        <h3 className="text-sm font-bold" style={{ color: "#F7C948" }}>+ New Assignment</h3>
                        <div className="grid grid-cols-3 gap-3">
                            <select name="voyageId" className="px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm">
                                <option value="">Select Voyage</option>
                                {classData.assignments.length === 0 && <option value="loading">Loading voyages...</option>}
                            </select>
                            <input name="dueDate" type="date" className="px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" />
                            <button className="btn-pirate text-sm">Assign</button>
                        </div>
                    </form>
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
                    {/* Create Announcement Form */}
                    <form action={`/api/class/${id}/announcements`} method="POST" className="mt-4 p-4 rounded-xl bg-abyssal/30 border border-amber-900/20 space-y-3">
                        <h3 className="text-sm font-bold" style={{ color: "#F7C948" }}>+ New Announcement</h3>
                        <input name="title" placeholder="Title..." className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" />
                        <textarea name="body" placeholder="Message..." rows={2} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" />
                        <button className="btn-pirate text-sm">Post</button>
                    </form>
                </div>
            </main>
        </div>
    );
}

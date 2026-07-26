import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import KanbanBoard from "@/components/KanbanBoard";

export default async function KanbanPage() {
    const session = await auth();
    if (!session?.user || session.user.role === "Student") redirect("/");

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/admin" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Admiral</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>📋 Kanban Board</h1>
                    <div className="w-20" />
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 py-6">
                <KanbanBoard />
            </main>
        </div>
    );
}

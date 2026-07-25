"use client";

import { useRouter } from "next/navigation";

export default function ImpersonationBanner({ studentName }: { studentName: string }) {
    const router = useRouter();

    return (
        <div className="bg-amber-900/40 border-b border-amber-600/50 text-center py-2 px-4 animate-sail">
            <span className="text-amber-300 text-sm">
                🏴‍☠️ Impersonating <strong style={{ color: "#F7C948" }}>{studentName}</strong>
            </span>
            <form action="/api/admin/impersonate/stop" method="POST" className="inline ml-3">
                <button className="px-3 py-0.5 rounded-full bg-amber-700/50 border border-amber-500/50 text-amber-200 text-xs hover:bg-amber-700">
                    ← Return to Admiral
                </button>
            </form>
        </div>
    );
}

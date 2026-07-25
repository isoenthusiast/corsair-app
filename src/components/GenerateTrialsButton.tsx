"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateTrialsButton({ voyageId }: { voyageId: string }) {
    const router = useRouter();
    const [count, setCount] = useState(3);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState("");

    async function generate() {
        setLoading(true);
        setError("");
        setResult("");
        try {
            const res = await fetch(`/api/admin/voyages/${voyageId}/generate-trials`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ count }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Generation failed");
            setResult(`✅ ${data.created} trials created!`);
            router.refresh();
        } catch (err: any) {
            setError(err.message || "AI generation failed. Try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mt-4 pt-4 border-t border-amber-900/20">
            <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-amber-600">Generate:</span>
                <select
                    value={count}
                    onChange={e => setCount(parseInt(e.target.value))}
                    className="px-2 py-1 rounded bg-abyssal border border-amber-900/30 text-white text-xs"
                    disabled={loading}
                >
                    <option value={3}>3 trials</option>
                    <option value={5}>5 trials</option>
                </select>
                <button
                    onClick={generate}
                    disabled={loading}
                    className="px-4 py-1.5 rounded-lg bg-purple-900/30 border border-purple-600/50 text-purple-300 text-sm hover:bg-purple-900/50 disabled:opacity-50"
                >
                    {loading ? "🧠 Generating..." : "🤖 Generate Trials"}
                </button>
            </div>
            {result && <p className="mt-2 text-xs text-emerald-400">{result}</p>}
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
    );
}

"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export default function ChangePasswordPage() {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (next.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (next !== confirm) {
            setError("New passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword: current, newPassword: next }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to change password.");
            } else {
                setSuccess("Password changed! Signing you out...");
                setTimeout(() => signOut({ callbackUrl: "/" }), 1500);
            }
        } catch {
            setError("Something went wrong. Try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center treasure-map p-4">
            <div className="w-full max-w-md parchment rounded-2xl p-8">
                <div className="text-center mb-6">
                    <div className="text-5xl mb-3">🔐</div>
                    <h1 className="text-3xl font-bold" style={{ color: "#5D4037", fontFamily: "'Pirata One', cursive" }}>Change Yer Code</h1>
                    <p className="text-sm text-amber-700 mt-2">Ye must set a new secret code before sailing.</p>
                </div>

                {error && <div className="mb-4 p-3 rounded-xl bg-red-100 border border-red-300 text-red-700 text-sm text-center">{error}</div>}
                {success && <div className="mb-4 p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-700 text-sm text-center">{success}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Current Secret Code</label>
                        <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required
                            className="w-full px-4 py-3 rounded-xl bg-white border-2 border-amber-800/30 focus:outline-none focus:border-amber-600 transition" style={{ color: "#3E2723" }} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>New Secret Code</label>
                        <input type="password" value={next} onChange={e => setNext(e.target.value)} required minLength={6}
                            className="w-full px-4 py-3 rounded-xl bg-white border-2 border-amber-800/30 focus:outline-none focus:border-amber-600 transition" style={{ color: "#3E2723" }} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Confirm New Secret Code</label>
                        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                            className="w-full px-4 py-3 rounded-xl bg-white border-2 border-amber-800/30 focus:outline-none focus:border-amber-600 transition" style={{ color: "#3E2723" }} />
                    </div>
                    <button type="submit" disabled={loading} className="btn-pirate w-full text-lg">
                        {loading ? "Hoisting..." : "Set New Code"}
                    </button>
                </form>
            </div>
        </div>
    );
}

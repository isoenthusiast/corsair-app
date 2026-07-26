"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Auto-submit impersonation token
    useEffect(() => {
        const impersonateToken = searchParams.get("impersonate");
        if (impersonateToken) {
            setLoading(true);
            signIn("credentials", {
                username: "_impersonate_",
                password: impersonateToken,
                redirect: false,
            }).then(result => {
                if (result?.error) {
                    setError("Impersonation link expired. Please try again.");
                    setLoading(false);
                } else {
                    router.push("/");
                    router.refresh();
                }
            });
        }
    }, [searchParams, router]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        const result = await signIn("credentials", { username, password, redirect: false });
        if (result?.error) { setError("Wrong username or password, sailor!"); setLoading(false); }
        else { router.push("/"); router.refresh(); }
    }

    return (
        <div className="min-h-screen flex items-center justify-center treasure-map p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8 animate-sail">
                    <div className="text-7xl mb-4">🏴‍☠️</div>
                    <h1 className="text-5xl font-bold" style={{ color: "#F7C948", textShadow: "0 3px 0 #5D4037" }}>
                        Corsair Academy
                    </h1>
                    <p className="mt-2" style={{ color: "#E8D5A3" }}>Chart your course. Conquer the seas.</p>
                </div>

                <div className="parchment rounded-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Sailor Name</label>
                            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                                placeholder="Your pirate name"
                                className="w-full px-4 py-3 rounded-xl bg-white border-2 border-amber-800/30 focus:outline-none focus:border-amber-600 transition"
                                style={{ color: "#3E2723" }} required />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Secret Code</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="Your pirate password"
                                className="w-full px-4 py-3 rounded-xl bg-white border-2 border-amber-800/30 focus:outline-none focus:border-amber-600 transition"
                                style={{ color: "#3E2723" }} required />
                        </div>
                        {error && (
                            <div className="p-3 rounded-xl bg-red-100 border border-red-300 text-red-700 text-sm text-center">{error}</div>
                        )}
                        <button type="submit" disabled={loading}
                            className="btn-pirate w-full text-lg">
                            {loading ? "Hoisting Sails..." : "Set Sail! ⛵"}
                        </button>
                    </form>
                    <div className="mt-6 pt-4 border-t border-amber-800/20 text-center text-xs" style={{ color: "#8D6E63" }}>
                        <p>Captain: <strong>parent</strong> / learning123</p>
                        <p>Cadet: <strong>andrew</strong> / andrew123</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center treasure-map">
                <div className="text-amber-600 text-xl">🏴‍☠️ Loading...</div>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
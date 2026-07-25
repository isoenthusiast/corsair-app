import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>, searchParams: Promise<{ error?: string }> }) {
    const { token } = await params;

    const invite = await prisma.inviteLink.findUnique({ where: { token } });
    if (!invite || invite.usedById || new Date(invite.expiresAt) < new Date()) {
        return (
            <div className="min-h-screen flex items-center justify-center treasure-map">
                <div className="wanted-poster rounded-2xl p-8 text-center max-w-md">
                    <div className="text-6xl mb-4">⏰</div>
                    <h1 className="text-2xl mb-2">Invite Expired</h1>
                    <p className="text-amber-700">This invite link is no longer valid. Contact the Admiral for a new one.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center treasure-map">
            <div className="wanted-poster rounded-2xl p-8 max-w-md w-full">
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4">🏴‍☠️</div>
                    <h1 className="text-3xl" style={{ fontFamily: "'Pirata One', cursive", color: "#3E2723" }}>Join the Crew!</h1>
                    <p className="text-amber-700 mt-2">You've been invited as a <strong>{invite.role}</strong></p>
                </div>
                <form action="/api/invite/accept" method="POST" className="space-y-3">
                    <input type="hidden" name="token" value={token} />
                    <div><label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Your Name</label><input name="name" placeholder="Pirate name" required className="w-full px-4 py-2 rounded-lg bg-white border-2 border-amber-800/30" style={{ color: "#3E2723" }} /></div>
                    <div><label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Choose Username</label><input name="username" placeholder="pirate_name" required className="w-full px-4 py-2 rounded-lg bg-white border-2 border-amber-800/30" style={{ color: "#3E2723" }} /></div>
                    <div><label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Secret Code</label><input name="password" type="password" placeholder="Choose a password" required className="w-full px-4 py-2 rounded-lg bg-white border-2 border-amber-800/30" style={{ color: "#3E2723" }} /></div>
                    <button type="submit" className="btn-pirate w-full text-lg">Join the Crew! ⚓</button>
                </form>
            </div>
        </div>
    );
}

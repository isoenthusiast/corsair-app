import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { checkRateLimit } from "@/lib/rateLimit";

async function logLogin(userId: string | null, username: string, success: boolean, ip?: string, ua?: string) {
    try {
        await prisma.loginHistory.create({
            data: { userId, username, success, ipAddress: ip, userAgent: ua },
        });
    } catch { /* never break auth flow */ }
}

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: string;
            name: string;
            impersonatedBy?: string;
            mustChangePassword?: boolean;
        } & DefaultSession["user"];
    }
    interface User {
        role?: string;
        impersonatedBy?: string;
        mustChangePassword?: boolean;
    }
}

import type { DefaultSession } from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials, request) {
                if (!credentials?.username || !credentials?.password) return null;

                const ip = request?.headers?.get("x-forwarded-for") || undefined;
                const ua = request?.headers?.get("user-agent") || undefined;

                // ── Rate limiting: 5 login attempts per username per minute ──
                const rl = checkRateLimit(`login:${credentials.username as string}`, 5);
                if (!rl.allowed) {
                    console.warn(`[RateLimit] Login blocked for user ${credentials.username}`);
                    return null;
                }

                // ── Impersonation: special username with signed token ──
                if (credentials.username === "_impersonate_") {
                    const token = credentials.password as string;
                    const [targetUserId, expiry, signature] = token.split(".");
                    if (Date.now() > parseInt(expiry)) return null;

                    const expectedSig = crypto
                        .createHmac("sha256", process.env.AUTH_SECRET!)
                        .update(`${targetUserId}.${expiry}`)
                        .digest("hex");
                    if (signature !== expectedSig) return null;

                    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
                    if (!target || target.role === "Admin") return null;

                    return {
                        id: target.id,
                        name: target.name,
                        role: target.role,
                        impersonatedBy: "admin",
                    };
                }

                // ── Normal authentication ──
                const user = await prisma.user.findUnique({
                    where: { username: credentials.username as string },
                });
                if (!user) {
                    await logLogin(null, credentials.username as string, false, ip, ua);
                    return null;
                }

                const valid = await bcrypt.compare(
                    credentials.password as string,
                    user.passwordHash
                );
                if (!valid) {
                    await logLogin(user.id, user.username, false, ip, ua);
                    return null;
                }

                // Reject inactive, suspended, or soft-deleted accounts
                if (user.status !== "Active" || user.deletedAt) {
                    await logLogin(user.id, user.username, false, ip, ua);
                    return null;
                }

                await logLogin(user.id, user.username, true, ip, ua);
                return {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    mustChangePassword: user.mustChangePassword,
                };
            },
        }),
    ],
});

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

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
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null;

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
                if (!user) return null;

                const valid = await bcrypt.compare(
                    credentials.password as string,
                    user.passwordHash
                );
                if (!valid) return null;

                // Reject inactive, suspended, or soft-deleted accounts
                if (user.status !== "Active" || user.deletedAt) {
                    return null;
                }

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

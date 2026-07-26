import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
    providers: [], // Populated in auth.ts
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id as string;
                token.role = (user as any).role;
                (token as any).impersonatedBy = (user as any).impersonatedBy;
                (token as any).mustChangePassword = (user as any).mustChangePassword ?? false;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.impersonatedBy = (token as any).impersonatedBy as string | undefined;
                (session.user as any).mustChangePassword = (token as any).mustChangePassword as boolean | undefined;
            }
            return session;
        },
    },
    pages: {
        signIn: "/",
    },
    session: {
        strategy: "jwt",
    },
};

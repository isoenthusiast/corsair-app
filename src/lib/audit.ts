import { prisma } from "@/lib/prisma";

/**
 * Write an audit log entry. Safe to call without a request (no IP).
 * Use this for all admin actions: user CRUD, impersonation, economy/settings changes.
 */
export async function logAudit(
    userId: string,
    action: string,
    targetId?: string,
    details?: string,
    ipAddress?: string,
) {
    try {
        await prisma.auditLog.create({
            data: { userId, action, targetId, details, ipAddress },
        });
    } catch {
        // Audit logging should never break the main flow
        console.error("[AuditLog] Failed to write:", action);
    }
}

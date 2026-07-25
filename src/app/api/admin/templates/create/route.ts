import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");
    const form = await request.formData();
    const name = form.get("name") as string;
    const voyageIds = form.getAll("voyageIds") as string[];
    if (name && voyageIds.length > 0) {
        const bundle = await prisma.voyageBundle.create({ data: { name, adminId: session.user.id } });
        for (let i = 0; i < voyageIds.length; i++) {
            await prisma.voyageBundleItem.create({ data: { bundleId: bundle.id, voyageId: voyageIds[i], sortOrder: i } });
        }
    }
    redirect("/admin/templates");
}

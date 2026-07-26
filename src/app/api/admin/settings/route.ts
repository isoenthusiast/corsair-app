import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const form = await request.formData();
    const category = form.get("category") as string;
    console.log(`Settings: ${category} updated`);
    redirect("/admin/settings?ok=1");
}

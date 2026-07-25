import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
    const form = await request.formData();
    const category = form.get("category") as string;
    console.log(`Settings: ${category} updated`);
    redirect("/admin/settings?ok=1");
}

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
        }

        const blob = await put(`documents/${Date.now()}_${file.name}`, file, {
            access: "public",
        });

        return NextResponse.json({ url: blob.url, size: file.size, name: file.name });
    } catch (error) {
        console.error("Document upload failed:", error);
        return NextResponse.json({ error: "업로드에 실패했습니다." }, { status: 500 });
    }
}

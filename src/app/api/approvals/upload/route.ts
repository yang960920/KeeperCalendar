import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

// 대용량 파일 업로드 지원 (최대 100MB)
export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const formData = await request.formData();
        const files = formData.getAll("files") as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
        }

        const results = await Promise.all(
            files.map(async (file) => {
                const blob = await put(
                    `approvals/${Date.now()}_${file.name}`,
                    file,
                    { access: "public" }
                );
                return {
                    name: file.name,
                    url: blob.url,
                    size: file.size,
                    type: file.type || "application/octet-stream",
                };
            })
        );

        return NextResponse.json({ files: results });
    } catch (error) {
        console.error("Approval attachment upload failed:", error);
        return NextResponse.json(
            { error: "파일 업로드에 실패했습니다." },
            { status: 500 }
        );
    }
}

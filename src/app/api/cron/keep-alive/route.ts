import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * NeonDB Cold Start 방지용 keep-alive 크론
 * 5분마다 가벼운 쿼리를 실행하여 DB 연결을 유지합니다.
 */
export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const elapsed = Date.now() - start;

        return NextResponse.json({
            ok: true,
            elapsed_ms: elapsed,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[keep-alive] DB ping failed:", error);
        return NextResponse.json(
            { ok: false, error: "DB connection failed" },
            { status: 500 }
        );
    }
}

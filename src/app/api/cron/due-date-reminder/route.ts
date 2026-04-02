import { NextResponse } from "next/server";
import { sendDueDateReminders } from "@/app/actions/notification";

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await sendDueDateReminders();
        return NextResponse.json({
            ok: true,
            sent: result.sent,
            message: `${result.sent}건의 마감일 리마인더를 발송했습니다.`,
        });
    } catch (error: any) {
        console.error("[Cron DueDateReminder] Error:", error);
        return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
    }
}

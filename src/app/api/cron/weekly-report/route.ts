import { NextResponse } from "next/server";
import { generateReportPDFs } from "@/lib/report/pdf-generator";
import { sendReportEmail, buildReportEmailHtml } from "@/lib/report/email-sender";
import { prisma } from "@/lib/prisma";
import { getWeekRange } from "@/lib/report/data-collector";

export async function GET(request: Request) {
    // Cron 인증
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { start } = getWeekRange();
        const result = await generateReportPDFs("WEEKLY", start);

        // 자동 이메일 발송
        try {
            const reportSet = await (prisma as any).reportSet.findUnique({
                where: { id: result.reportSetId },
                include: { reports: { where: { scope: "COMPANY" } } },
            });

            const recipients = await (prisma as any).reportRecipient.findMany({
                where: { isActive: true },
            });

            if (reportSet?.reports[0]?.pdfUrl && recipients.length > 0) {
                const pdfRes = await fetch(reportSet.reports[0].pdfUrl);
                const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

                await sendReportEmail({
                    recipients: recipients.map((r: any) => ({ email: r.email, name: r.name })),
                    subject: `[HanmirWorks] 한미르(주) ${reportSet.periodLabel} 주간 업무 리포트`,
                    htmlBody: buildReportEmailHtml(reportSet.periodLabel, "WEEKLY", reportSet.stats || {}),
                    pdfBuffer,
                    pdfFilename: `한미르_주간리포트_${reportSet.periodLabel}.pdf`,
                });

                await (prisma as any).reportSet.update({
                    where: { id: result.reportSetId },
                    data: { status: "SENT", sentAt: new Date() },
                });
            }
        } catch (emailErr) {
            console.error("[WeeklyCron] Email failed:", emailErr);
        }

        return NextResponse.json({ success: true, reportSetId: result.reportSetId });
    } catch (error: any) {
        console.error("[WeeklyCron] Failed:", error);
        return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
    }
}

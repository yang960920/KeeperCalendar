import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtps.hiworks.com",
    port: parseInt(process.env.EMAIL_PORT || "465"),
    secure: true, // SSL for port 465
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

interface EmailOptions {
    recipients: { email: string; name: string }[];
    subject: string;
    htmlBody: string;
    pdfBuffer: Buffer;
    pdfFilename: string;
}

export async function sendReportEmail(options: EmailOptions): Promise<{
    success: boolean;
    sentTo: string[];
    failedTo: string[];
}> {
    const sentTo: string[] = [];
    const failedTo: string[] = [];

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("[Email] EMAIL_USER/EMAIL_PASS not configured. Skipping.");
        return { success: false, sentTo, failedTo: options.recipients.map(r => r.email) };
    }

    for (const recipient of options.recipients) {
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_FROM || `"HanmirWorks" <${process.env.EMAIL_USER}>`,
                to: `"${recipient.name}" <${recipient.email}>`,
                subject: options.subject,
                html: options.htmlBody,
                attachments: [
                    {
                        filename: options.pdfFilename,
                        content: options.pdfBuffer,
                        contentType: "application/pdf",
                    },
                ],
            });
            sentTo.push(recipient.email);
        } catch (error: any) {
            console.error(`[Email] Failed to send to ${recipient.email}:`, error?.message);
            failedTo.push(recipient.email);
        }
    }

    return {
        success: sentTo.length > 0,
        sentTo,
        failedTo,
    };
}

export function buildReportEmailHtml(periodLabel: string, type: string, stats: {
    totalTasks: number;
    completionRate: number;
    delayedTasks: number;
}): string {
    return `
    <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 18px;">📊 HanmirWorks ${type === "WEEKLY" ? "주간" : "월간"} 리포트</h1>
            <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">${periodLabel}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px; text-align: center; border-right: 1px solid #e9ecef;">
                        <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${stats.totalTasks}</div>
                        <div style="font-size: 12px; color: #6c757d;">총 업무</div>
                    </td>
                    <td style="padding: 10px; text-align: center; border-right: 1px solid #e9ecef;">
                        <div style="font-size: 24px; font-weight: bold; color: #22c55e;">${stats.completionRate}%</div>
                        <div style="font-size: 12px; color: #6c757d;">완료율</div>
                    </td>
                    <td style="padding: 10px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${stats.delayedTasks}</div>
                        <div style="font-size: 12px; color: #6c757d;">지연</div>
                    </td>
                </tr>
            </table>
        </div>
        <div style="padding: 20px; border: 1px solid #e9ecef; border-top: 0; border-radius: 0 0 8px 8px;">
            <p style="color: #495057; font-size: 14px;">첨부된 PDF 파일에서 전사 종합 리포트를 확인하세요.</p>
            <p style="color: #adb5bd; font-size: 11px; margin-top: 20px;">본 메일은 HanmirWorks 시스템에서 자동 발송되었습니다.</p>
        </div>
    </div>`;
}

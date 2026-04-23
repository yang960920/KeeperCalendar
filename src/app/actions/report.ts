"use server";

import { prisma } from "@/lib/prisma";
import { generateReportPDFs } from "@/lib/report/pdf-generator";
import { sendReportEmail, buildReportEmailHtml } from "@/lib/report/email-sender";

// ── 리포트 세트 생성 ──

export async function generateReportSet(
    type: "WEEKLY" | "MONTHLY",
    periodStart?: string, // ISO date string
): Promise<{ success: boolean; reportSetId?: string; error?: string }> {
    try {
        const start = periodStart ? new Date(periodStart) : undefined;
        const result = await generateReportPDFs(type, start);
        return { success: true, reportSetId: result.reportSetId };
    } catch (error: any) {
        console.error("Report generation failed:", error);
        return { success: false, error: error?.message || "리포트 생성에 실패했습니다." };
    }
}

// ── 리포트 세트 이메일 발송 ──

export async function sendReportSetEmail(reportSetId: string): Promise<{
    success: boolean;
    sentCount?: number;
    error?: string;
}> {
    try {
        const reportSet = await (prisma as any).reportSet.findUnique({
            where: { id: reportSetId },
            include: {
                reports: { where: { scope: "COMPANY" } },
            },
        });

        if (!reportSet) return { success: false, error: "리포트를 찾을 수 없습니다." };

        const companyReport = reportSet.reports[0];
        if (!companyReport?.pdfUrl) return { success: false, error: "전사 PDF가 없습니다." };

        // 수신자 조회
        const recipients = await (prisma as any).reportRecipient.findMany({
            where: { isActive: true },
        });

        if (recipients.length === 0) return { success: false, error: "활성 수신자가 없습니다." };

        // PDF 다운로드
        const pdfRes = await fetch(companyReport.pdfUrl);
        const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

        const typeLabel = reportSet.type === "WEEKLY" ? "주간" : "월간";
        const subject = `[HanmirWorks] 한미르(주) ${reportSet.periodLabel} 업무 리포트`;

        const htmlBody = buildReportEmailHtml(
            reportSet.periodLabel,
            reportSet.type,
            reportSet.stats || { totalTasks: 0, completionRate: 0, delayedTasks: 0 },
        );

        // 상태 업데이트
        await (prisma as any).reportSet.update({
            where: { id: reportSetId },
            data: { status: "SENDING" },
        });

        const result = await sendReportEmail({
            recipients: recipients.map((r: any) => ({ email: r.email, name: r.name })),
            subject,
            htmlBody,
            pdfBuffer,
            pdfFilename: `한미르_${typeLabel}리포트_${reportSet.periodLabel}.pdf`,
        });

        await (prisma as any).reportSet.update({
            where: { id: reportSetId },
            data: {
                status: result.success ? "SENT" : "FAILED",
                sentAt: result.success ? new Date() : undefined,
                sentTo: result.sentTo,
                error: result.failedTo.length > 0 ? `발송 실패: ${result.failedTo.join(", ")}` : null,
            },
        });

        return { success: true, sentCount: result.sentTo.length };
    } catch (error: any) {
        console.error("Email send failed:", error);
        return { success: false, error: error?.message || "이메일 발송에 실패했습니다." };
    }
}

// ── 리포트 세트 이력 조회 ──

export async function getReportSets(page: number = 1, limit: number = 10) {
    try {
        const [sets, total] = await Promise.all([
            (prisma as any).reportSet.findMany({
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                include: { _count: { select: { reports: true } } },
            }),
            (prisma as any).reportSet.count(),
        ]);

        return {
            success: true,
            data: sets.map((s: any) => ({
                ...s,
                reportCount: s._count.reports,
                createdAt: s.createdAt.toISOString(),
                sentAt: s.sentAt?.toISOString() || null,
                periodStart: s.periodStart.toISOString(),
                periodEnd: s.periodEnd.toISOString(),
            })),
            total,
            pages: Math.ceil(total / limit),
        };
    } catch (error: any) {
        return { success: false, data: [], total: 0, pages: 0 };
    }
}

// ── 특정 세트의 하위 리포트 목록 ──

export async function getReportsBySet(reportSetId: string) {
    try {
        const reports = await (prisma as any).report.findMany({
            where: { reportSetId },
            orderBy: [{ scope: "asc" }, { scopeLabel: "asc" }],
        });

        return {
            success: true,
            data: reports.map((r: any) => ({
                ...r,
                createdAt: r.createdAt.toISOString(),
            })),
        };
    } catch {
        return { success: false, data: [] };
    }
}

// ── 수신자 CRUD ──

export async function getReportRecipients() {
    try {
        const recipients = await (prisma as any).reportRecipient.findMany({
            orderBy: { createdAt: "desc" },
        });
        return {
            success: true,
            data: recipients.map((r: any) => ({
                ...r,
                createdAt: r.createdAt.toISOString(),
                updatedAt: r.updatedAt.toISOString(),
            })),
        };
    } catch {
        return { success: false, data: [] };
    }
}

export async function addReportRecipient(email: string, name: string) {
    try {
        await (prisma as any).reportRecipient.create({
            data: { email, name },
        });
        return { success: true };
    } catch (error: any) {
        if (error?.code === "P2002") {
            return { success: false, error: "이미 등록된 이메일입니다." };
        }
        return { success: false, error: "수신자 추가에 실패했습니다." };
    }
}

export async function removeReportRecipient(id: string) {
    try {
        await (prisma as any).reportRecipient.delete({ where: { id } });
        return { success: true };
    } catch {
        return { success: false };
    }
}

export async function toggleReportRecipient(id: string, isActive: boolean) {
    try {
        await (prisma as any).reportRecipient.update({
            where: { id },
            data: { isActive },
        });
        return { success: true };
    } catch {
        return { success: false };
    }
}

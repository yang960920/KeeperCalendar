"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── 결재 신청 ────────────────────────────────────────────────────────────────

export async function createApprovalRequest(data: {
    title: string;
    content: string;
    category: "VACATION" | "OVERTIME" | "BUSINESS_TRIP" | "EXPENSE" | "GENERAL";
    requesterId: string;
    approverIds: string[];   // 결재자 목록 (순서대로)
    projectId?: string;
    attachmentUrl?: string;
}) {
    try {
        if (!data.approverIds || data.approverIds.length === 0) {
            return { success: false, error: "결재자를 1명 이상 지정해야 합니다." };
        }

        const request = await (prisma as any).approvalRequest.create({
            data: {
                title: data.title,
                content: data.content,
                category: data.category,
                status: "PENDING",
                requesterId: data.requesterId,
                projectId: data.projectId || null,
                attachmentUrl: data.attachmentUrl || null,
                steps: {
                    create: data.approverIds.map((approverId, idx) => ({
                        approverId,
                        stepOrder: idx + 1,
                        status: idx === 0 ? "PENDING" : "WAITING", // 첫 결재자만 PENDING
                    })),
                },
            },
            include: { steps: { orderBy: { stepOrder: "asc" } } },
        });

        // 첫 결재자에게 알림
        try {
            await prisma.notification.create({
                data: {
                    userId: data.approverIds[0],
                    type: "SYSTEM",
                    title: "📋 결재 요청",
                    message: `"${data.title}" 결재가 요청되었습니다.`,
                    senderId: data.requesterId,
                },
            });
        } catch (notifyErr) {
            console.error("[Notification] 결재 알림 실패:", notifyErr);
        }

        revalidatePath("/approvals");
        return { success: true, data: request };
    } catch (error: any) {
        console.error("Failed to create approval request:", error);
        return { success: false, error: "결재 신청에 실패했습니다." };
    }
}

// ─── 결재 처리 (승인 / 반려) ───────────────────────────────────────────────────

export async function processApprovalStep(
    requestId: string,
    approverId: string,
    action: "APPROVED" | "REJECTED",
    comment?: string
) {
    try {
        const request = await (prisma as any).approvalRequest.findUnique({
            where: { id: requestId },
            include: { steps: { orderBy: { stepOrder: "asc" } } },
        });

        if (!request) return { success: false, error: "결재 요청을 찾을 수 없습니다." };
        if (request.status === "APPROVED" || request.status === "REJECTED") {
            return { success: false, error: "이미 완료된 결재입니다." };
        }

        // 현재 결재 단계 확인
        const currentStep = request.steps.find(
            (s: any) => s.approverId === approverId && s.status === "PENDING"
        );
        if (!currentStep) {
            return { success: false, error: "처리할 수 있는 결재 단계가 없습니다." };
        }

        // 단계 업데이트
        await (prisma as any).approvalStep.update({
            where: { id: currentStep.id },
            data: {
                status: action,
                comment: comment || null,
                actedAt: new Date(),
            },
        });

        let newRequestStatus: "IN_PROGRESS" | "APPROVED" | "REJECTED" = "IN_PROGRESS";

        if (action === "REJECTED") {
            // 반려: 요청 전체 반려
            newRequestStatus = "REJECTED";

            // 기안자에게 알림
            try {
                await prisma.notification.create({
                    data: {
                        userId: request.requesterId,
                        type: "SYSTEM",
                        title: "❌ 결재 반려",
                        message: `"${request.title}" 결재가 반려되었습니다.`,
                        senderId: approverId,
                    },
                });
            } catch (e) { /* ignore */ }

        } else {
            // 승인: 다음 단계 확인
            const nextStep = request.steps.find(
                (s: any) => s.stepOrder === currentStep.stepOrder + 1
            );

            if (nextStep) {
                // 다음 결재자로 이관
                await (prisma as any).approvalStep.update({
                    where: { id: nextStep.id },
                    data: { status: "PENDING" },
                });

                try {
                    await prisma.notification.create({
                        data: {
                            userId: nextStep.approverId,
                            type: "SYSTEM",
                            title: "📋 결재 요청",
                            message: `"${request.title}" 결재가 요청되었습니다.`,
                            senderId: approverId,
                        },
                    });
                } catch (e) { /* ignore */ }
            } else {
                // 마지막 단계 승인 → 전체 승인 완료
                newRequestStatus = "APPROVED";

                try {
                    await prisma.notification.create({
                        data: {
                            userId: request.requesterId,
                            type: "SYSTEM",
                            title: "✅ 결재 승인",
                            message: `"${request.title}" 결재가 최종 승인되었습니다.`,
                            senderId: approverId,
                        },
                    });
                } catch (e) { /* ignore */ }
            }
        }

        await (prisma as any).approvalRequest.update({
            where: { id: requestId },
            data: { status: newRequestStatus },
        });

        revalidatePath("/approvals");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to process approval step:", error);
        return { success: false, error: "결재 처리에 실패했습니다." };
    }
}

// ─── 결재 철회 ────────────────────────────────────────────────────────────────

export async function withdrawApprovalRequest(requestId: string, requesterId: string) {
    try {
        const request = await (prisma as any).approvalRequest.findUnique({
            where: { id: requestId },
        });
        if (!request) return { success: false, error: "결재 요청을 찾을 수 없습니다." };
        if (request.requesterId !== requesterId) {
            return { success: false, error: "철회 권한이 없습니다. (기안자만 가능)" };
        }
        if (request.status === "APPROVED" || request.status === "REJECTED") {
            return { success: false, error: "이미 완료된 결재는 철회할 수 없습니다." };
        }

        await (prisma as any).approvalRequest.update({
            where: { id: requestId },
            data: { status: "WITHDRAWN" },
        });

        revalidatePath("/approvals");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to withdraw approval:", error);
        return { success: false, error: "결재 철회에 실패했습니다." };
    }
}

// ─── 내 결재 목록 조회 ────────────────────────────────────────────────────────

export async function getMyApprovals(userId: string) {
    try {
        // 내가 신청한 결재
        const requested = await (prisma as any).approvalRequest.findMany({
            where: { requesterId: userId },
            include: { steps: { orderBy: { stepOrder: "asc" } } },
            orderBy: { createdAt: "desc" },
        });

        // 내가 결재해야 할 것들
        const toApprove = await (prisma as any).approvalRequest.findMany({
            where: {
                steps: {
                    some: {
                        approverId: userId,
                        status: "PENDING",
                    },
                },
                status: { in: ["PENDING", "IN_PROGRESS"] },
            },
            include: { steps: { orderBy: { stepOrder: "asc" } } },
            orderBy: { createdAt: "desc" },
        });

        const serialize = (list: any[]) =>
            list.map((r) => ({
                id: r.id,
                title: r.title,
                content: r.content,
                category: r.category,
                status: r.status,
                requesterId: r.requesterId,
                projectId: r.projectId,
                attachmentUrl: r.attachmentUrl,
                steps: r.steps.map((s: any) => ({
                    id: s.id,
                    approverId: s.approverId,
                    stepOrder: s.stepOrder,
                    status: s.status,
                    comment: s.comment,
                    actedAt: s.actedAt?.toISOString() || null,
                })),
                createdAt: r.createdAt.toISOString(),
                updatedAt: r.updatedAt.toISOString(),
            }));

        return {
            success: true,
            data: {
                requested: serialize(requested),
                toApprove: serialize(toApprove.filter(
                    (r: any) => !requested.some((req: any) => req.id === r.id)
                )),
            },
        };
    } catch (error: any) {
        console.error("Failed to get approvals:", error);
        return { success: false, data: { requested: [], toApprove: [] } };
    }
}

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createCalendarEvent } from "@/app/actions/calendar-event";
import { archiveApprovalDocument } from "@/app/actions/document";

// ─── 결재 신청 ────────────────────────────────────────────────────────────────

export async function createApprovalRequest(data: {
    title: string;
    content: string;
    category: "VACATION" | "OVERTIME" | "BUSINESS_TRIP" | "EXPENSE" | "GENERAL" | "INSPECTION" | "TAX_INVOICE" | "EXPENDITURE_PLAN" | "PERSONAL_EXPENSE";
    requesterId: string;
    approverIds: string[];   // 결재자 목록 (순서대로)
    projectId?: string;
    attachmentUrl?: string;
    formData?: Record<string, any>; // 카테고리별 상세 데이터
    attachments?: { name: string; url: string; size: number; type: string }[]; // 다중 첨부파일
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
                formData: data.formData ? JSON.stringify(data.formData) : null,
                steps: {
                    create: data.approverIds.map((approverId, idx) => ({
                        approverId,
                        stepOrder: idx + 1,
                        status: idx === 0 ? "PENDING" : "WAITING",
                    })),
                },
                ...(data.attachments && data.attachments.length > 0
                    ? {
                          attachments: {
                              create: data.attachments.map((att) => ({
                                  name: att.name,
                                  url: att.url,
                                  size: att.size,
                                  type: att.type,
                              })),
                          },
                      }
                    : {}),
            },
            include: { steps: { orderBy: { stepOrder: "asc" } }, attachments: true },
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

            // 정부과제 반려 시 gov-grant-assistant에 알림
            {
                const formData = request.formData ? JSON.parse(request.formData) : {};
                if (formData.source === "GRANT_APPLICATION") {
                    await sendWebhookToGrantAssistant("approval.rejected", {
                        approvalId: request.id,
                        category: "GRANT_APPLICATION",
                        formData,
                    }).catch(() => {});
                }
            }

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

                // ── 카테고리별 승인 후 자동화 ──
                try {
                    await handlePostApproval(request);
                } catch (postErr) {
                    console.error("[Approval] 후속 자동화 실패 (무시):", postErr);
                }
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
            include: { steps: { orderBy: { stepOrder: "asc" } }, attachments: true },
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
            include: { steps: { orderBy: { stepOrder: "asc" } }, attachments: true },
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
                formData: r.formData ? JSON.parse(r.formData) : null,
                steps: r.steps.map((s: any) => ({
                    id: s.id,
                    approverId: s.approverId,
                    stepOrder: s.stepOrder,
                    status: s.status,
                    comment: s.comment,
                    actedAt: s.actedAt?.toISOString() || null,
                })),
                attachments: (r.attachments || []).map((a: any) => ({
                    id: a.id,
                    name: a.name,
                    url: a.url,
                    size: a.size,
                    type: a.type,
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

// ─── 부서별 결재 목록 조회 (관리자 전용) ─────────────────────────────────────

const APPROVAL_ADMIN_IDS = ["양현준", "유경성", "김권찬", "한승우", "진호열"];

export async function getDepartmentApprovals(userId: string) {
    if (!APPROVAL_ADMIN_IDS.includes(userId)) {
        return { success: false, data: [] };
    }

    try {
        // 전체 결재 목록 조회 (신청자의 부서 정보 포함)
        const allRequests = await (prisma as any).approvalRequest.findMany({
            include: {
                steps: { orderBy: { stepOrder: "asc" } },
                attachments: true,
                requester: {
                    select: { id: true, name: true, department: { select: { id: true, name: true } } },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const serialized = allRequests.map((r: any) => ({
            id: r.id,
            title: r.title,
            content: r.content,
            category: r.category,
            status: r.status,
            requesterId: r.requesterId,
            requesterName: r.requester?.name || r.requesterId,
            departmentId: r.requester?.department?.id || null,
            departmentName: r.requester?.department?.name || "미지정",
            projectId: r.projectId,
            formData: r.formData ? JSON.parse(r.formData) : null,
            steps: r.steps.map((s: any) => ({
                id: s.id,
                approverId: s.approverId,
                stepOrder: s.stepOrder,
                status: s.status,
                comment: s.comment,
                actedAt: s.actedAt?.toISOString() || null,
            })),
            attachments: (r.attachments || []).map((a: any) => ({
                id: a.id,
                name: a.name,
                url: a.url,
                size: a.size,
                type: a.type,
            })),
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
        }));

        return { success: true, data: serialized };
    } catch (error: any) {
        console.error("Failed to get department approvals:", error);
        return { success: false, data: [] };
    }
}

// ─── 카테고리별 승인 후 자동화 ───────────────────────────────────────────────

async function handlePostApproval(request: any) {
    const formData = request.formData ? JSON.parse(request.formData) : {};
    const requester = await prisma.user.findUnique({
        where: { id: request.requesterId },
        select: { name: true },
    });
    const requesterName = requester?.name || "";

    switch (request.category) {
        case "VACATION": {
            // 휴가: 공유 캘린더에 VACATION 이벤트 생성 + Attendance 기록
            const startDate = formData.startDate; // "YYYY-MM-DD"
            const endDate = formData.endDate;     // "YYYY-MM-DD"
            const vacationType = formData.vacationType || "연차"; // 연차/반차(오전)/반차(오후)/병가

            if (startDate && endDate) {
                // 캘린더 이벤트 생성
                await createCalendarEvent({
                    title: `[${vacationType}] ${requesterName}`,
                    description: request.content,
                    category: "VACATION",
                    startTime: new Date(`${startDate}T00:00:00+09:00`).toISOString(),
                    endTime: new Date(`${endDate}T23:59:59+09:00`).toISOString(),
                    isAllDay: true,
                    creatorId: request.requesterId,
                    attendeeIds: [],
                    requiresRsvp: false,
                });

                // Attendance 기록 생성 (기간 내 평일)
                const start = new Date(`${startDate}T00:00:00+09:00`);
                const end = new Date(`${endDate}T00:00:00+09:00`);
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const dayOfWeek = d.getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // 주말 스킵
                    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                    const existing = await prisma.attendance.findUnique({
                        where: { userId_date: { userId: request.requesterId, date: dateOnly } },
                    });
                    if (!existing) {
                        await prisma.attendance.create({
                            data: {
                                userId: request.requesterId,
                                date: dateOnly,
                                clockIn: new Date(`${dateOnly.toISOString().split("T")[0]}T09:00:00+09:00`),
                                status: "PRESENT",
                                workType: "VACATION",
                            },
                        });
                    }
                }
            }
            break;
        }

        case "OVERTIME": {
            // 시간외근무: Attendance 기록에 overtime 표시
            const overtimeDate = formData.overtimeDate;
            const startTime = formData.startTime; // "HH:mm"
            const endTime = formData.endTime;     // "HH:mm"

            if (overtimeDate) {
                await createCalendarEvent({
                    title: `[시간외근무] ${requesterName}`,
                    description: `${startTime || ""} ~ ${endTime || ""}\n${request.content}`,
                    category: "OTHER",
                    startTime: new Date(`${overtimeDate}T${startTime || "18:00"}:00+09:00`).toISOString(),
                    endTime: new Date(`${overtimeDate}T${endTime || "21:00"}:00+09:00`).toISOString(),
                    isAllDay: false,
                    creatorId: request.requesterId,
                    attendeeIds: [],
                    requiresRsvp: false,
                });
            }
            break;
        }

        case "BUSINESS_TRIP": {
            // 외근/출장: 공유 캘린더에 이벤트 생성 + 근태 처리
            // ※ 외근 사전 신청(FieldWorkRequest)과 중복 방지:
            //   - 이미 FIELD_PLANNED 근태가 있으면 BUSINESS_TRIP으로 업그레이드
            //   - 이미 같은 날짜의 FIELD_WORK 캘린더 이벤트가 있으면 캘린더 중복 생성 안 함
            const tripStart = formData.tripStartDate || formData.startDate;
            const tripEnd = formData.tripEndDate || formData.endDate || tripStart;
            const location = formData.location || formData.destination || "";

            if (tripStart) {
                const isMultiDay = tripEnd && tripStart !== tripEnd;
                const label = isMultiDay ? "출장" : "외근";

                // 캘린더: 해당 기간에 이미 외근 사전 신청으로 등록된 이벤트가 있는지 확인
                const tripStartDate = new Date(`${tripStart}T00:00:00+09:00`);
                const tripEndDate = new Date(`${tripEnd || tripStart}T23:59:59+09:00`);
                const existingCalEvent = await (prisma as any).calendarEvent.findFirst({
                    where: {
                        creatorId: request.requesterId,
                        category: "FIELD_WORK",
                        startTime: { gte: tripStartDate },
                        endTime: { lte: new Date(tripEndDate.getTime() + 24 * 60 * 60 * 1000) },
                    },
                });

                if (existingCalEvent) {
                    // 기존 이벤트를 결재 보고서 내용으로 업데이트
                    await (prisma as any).calendarEvent.update({
                        where: { id: existingCalEvent.id },
                        data: {
                            title: `[${label}] ${requesterName} - ${location}`,
                            description: request.content,
                            startTime: tripStartDate,
                            endTime: tripEndDate,
                            isAllDay: true,
                            location,
                        },
                    });
                } else {
                    // 기존 이벤트 없으면 새로 생성
                    await createCalendarEvent({
                        title: `[${label}] ${requesterName} - ${location}`,
                        description: request.content,
                        category: "FIELD_WORK",
                        startTime: tripStartDate.toISOString(),
                        endTime: tripEndDate.toISOString(),
                        isAllDay: true,
                        location,
                        creatorId: request.requesterId,
                        attendeeIds: [],
                        requiresRsvp: false,
                    });
                }

                // Attendance: 기간 내 평일마다 처리
                const start = new Date(`${tripStart}T00:00:00+09:00`);
                const end = new Date(`${tripEnd || tripStart}T00:00:00+09:00`);
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const dayOfWeek = d.getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
                    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                    const existing = await prisma.attendance.findUnique({
                        where: { userId_date: { userId: request.requesterId, date: dateOnly } },
                    });
                    if (existing) {
                        // 외근 사전 신청(FIELD_PLANNED/FIELD_EMERGENCY)으로 이미 있으면 → BUSINESS_TRIP으로 업그레이드
                        if (existing.workType === "FIELD_PLANNED" || existing.workType === "FIELD_EMERGENCY") {
                            await prisma.attendance.update({
                                where: { id: existing.id },
                                data: { workType: "BUSINESS_TRIP" },
                            });
                        }
                    } else {
                        await prisma.attendance.create({
                            data: {
                                userId: request.requesterId,
                                date: dateOnly,
                                clockIn: new Date(`${dateOnly.toISOString().split("T")[0]}T09:00:00+09:00`),
                                status: "PRESENT",
                                workType: "BUSINESS_TRIP",
                            },
                        });
                    }
                }
            }
            break;
        }

        // EXPENSE: 후속 자동화 없음
        default: {
            // GENERAL 카테고리이지만 source가 GRANT_APPLICATION인 경우 → 정부과제 연동
            if (formData.source === "GRANT_APPLICATION") {
                await sendWebhookToGrantAssistant("approval.approved", {
                    approvalId: request.id,
                    category: "GRANT_APPLICATION",
                    formData,
                }).catch(() => {});
            }
            break;
        }
    }

    // 모든 카테고리 공통: 결재 문서 자동 보관
    try {
        await archiveApprovalDocument({
            approvalTitle: request.title,
            category: request.category,
            content: request.content || "",
            requesterId: request.requesterId,
            approvalId: request.id,
        });
    } catch (e) {
        console.error("결재 문서 자동 보관 실패 (무시):", e);
    }
}

// ─── gov-grant-assistant Webhook 발신 ──────────────────────────────────────

async function sendWebhookToGrantAssistant(
    event: string,
    data: Record<string, any>,
): Promise<boolean> {
    const url = process.env.GRANT_ASSISTANT_WEBHOOK_URL;
    const secret = process.env.WEBHOOK_SECRET;

    if (!url || !secret) {
        console.warn("[Webhook] GRANT_ASSISTANT_WEBHOOK_URL 또는 WEBHOOK_SECRET 미설정");
        return false;
    }

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-webhook-secret": secret,
            },
            body: JSON.stringify({ event, data }),
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
            console.error(`[Webhook] gov-grant-assistant 응답 오류: ${res.status}`);
            return false;
        }

        console.log(`[Webhook] gov-grant-assistant 전송 성공: ${event}`);
        return true;
    } catch (e) {
        console.error("[Webhook] gov-grant-assistant 전송 실패:", e);
        return false;
    }
}

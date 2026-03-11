"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * 긴급 요청 목록 조회 (단계별)
 * - PENDING_CREATOR: PARTICIPANT가 요청 → 부서장 검수 대기
 * - PENDING_ADMIN: 부서장 승인 또는 직접 요청 → Admin 승인 대기
 * - APPROVED: 승인된 긴급 업무 (사후 검증용)
 */
export async function getUrgentRequests(stage: "PENDING_CREATOR" | "PENDING_ADMIN" | "APPROVED") {
    try {
        const tasks = await prisma.task.findMany({
            where: {
                isUrgent: true,
                urgencyStatus: stage,
            },
            include: {
                assignee: { include: { department: true } },
                assignees: true,
                project: true,
                attachments: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return { success: true, data: tasks };
    } catch (error) {
        console.error("Failed to get urgent requests:", error);
        return { success: false, error: "긴급 요청 목록을 불러오는 중 오류가 발생했습니다." };
    }
}

/**
 * 부서장(CREATOR) 1차 검수
 * - 승인: PENDING_CREATOR → PENDING_ADMIN
 * - 거절: PENDING_CREATOR → REJECTED
 */
export async function creatorReviewUrgent(taskId: string, approved: boolean) {
    try {
        const task = await prisma.task.update({
            where: { id: taskId },
            data: {
                urgencyStatus: approved ? "PENDING_ADMIN" : "REJECTED",
                isUrgent: approved ? true : false,
            },
        });

        revalidatePath("/");
        revalidatePath("/admin/tracking");

        return {
            success: true,
            message: approved
                ? `"${task.title}" 긴급 요청을 승인하여 관리자에게 전달했습니다.`
                : `"${task.title}" 긴급 요청을 거절했습니다.`,
        };
    } catch (error) {
        console.error("Failed to review urgent:", error);
        return { success: false, error: "긴급 검수 처리에 실패했습니다." };
    }
}

/**
 * Admin 최종 수락
 * PENDING_ADMIN → APPROVED
 */
export async function adminApproveUrgent(taskId: string) {
    try {
        const task = await prisma.task.update({
            where: { id: taskId },
            data: { urgencyStatus: "APPROVED" },
        });

        revalidatePath("/");
        revalidatePath("/admin/tracking");

        return { success: true, message: `"${task.title}" 긴급 업무를 승인했습니다. 공헌도 ×2.0이 적용됩니다.` };
    } catch (error) {
        console.error("Failed to approve urgent:", error);
        return { success: false, error: "긴급 승인에 실패했습니다." };
    }
}

/**
 * Admin 거절
 * PENDING_ADMIN → REJECTED
 */
export async function adminRejectUrgent(taskId: string) {
    try {
        const task = await prisma.task.update({
            where: { id: taskId },
            data: { urgencyStatus: "REJECTED", isUrgent: false },
        });

        revalidatePath("/");
        revalidatePath("/admin/tracking");

        return { success: true, message: `"${task.title}" 긴급 요청을 거절했습니다.` };
    } catch (error) {
        console.error("Failed to reject urgent:", error);
        return { success: false, error: "긴급 거절에 실패했습니다." };
    }
}

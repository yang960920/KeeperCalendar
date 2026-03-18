"use server";

import { prisma } from "@/lib/prisma";

// 독촉 알림 보내기 (24시간 쿨다운)
export async function sendNudge(data: {
    senderId: string;
    taskId: string;
    taskTitle: string;
    projectId: string;
    recipientIds: string[];
}) {
    try {
        // 24시간 이내 같은 업무에 같은 발신자가 보낸 독촉이 있는지 확인 (스팸 방지)
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentNudge = await (prisma as any).notification.findFirst({
            where: {
                type: "NUDGE",
                taskId: data.taskId,
                senderId: data.senderId,
                createdAt: { gte: cutoff },
            },
        });

        if (recentNudge) {
            return {
                success: false,
                error: "같은 업무에 대해 24시간 이내 재독촉할 수 없습니다.",
            };
        }

        // 수신자별 알림 설정 확인 (notifyNudge OFF인 사용자 제외)
        const settings = await (prisma as any).userSettings.findMany({
            where: {
                userId: { in: data.recipientIds },
                notifyNudge: false,
            },
            select: { userId: true },
        });
        const blockedIds = new Set(settings.map((s: any) => s.userId));
        const eligibleIds = data.recipientIds.filter(id => !blockedIds.has(id));

        if (eligibleIds.length === 0) {
            return {
                success: false,
                error: "모든 담당자가 독촉 알림을 OFF로 설정했습니다.",
            };
        }

        // 알림 생성
        await (prisma as any).notification.createMany({
            data: eligibleIds.map(userId => ({
                userId,
                type: "NUDGE",
                title: "📢 업무 독촉",
                message: `"${data.taskTitle}" 업무를 확인해주세요. (독촉: ${data.senderId})`,
                projectId: data.projectId,
                taskId: data.taskId,
                senderId: data.senderId,
            })),
        });

        // 활동 로그
        try {
            await prisma.activityLog.create({
                data: {
                    action: "독촉 알림",
                    entityType: "TASK",
                    entityId: data.taskId,
                    details: `"${data.taskTitle}" 업무에 독촉 알림을 보냈습니다. (수신: ${eligibleIds.join(", ")})`,
                    userId: data.senderId,
                    projectId: data.projectId,
                    taskId: data.taskId,
                },
            });
        } catch (logErr) {
            console.error("[ActivityLog] 독촉 로그 기록 실패:", logErr);
        }

        return { success: true, sentCount: eligibleIds.length };
    } catch (error: any) {
        console.error("독촉 알림 전송 실패:", error);
        return { success: false, error: "독촉 알림 전송에 실패했습니다." };
    }
}

// 해당 업무의 독촉 횟수 조회
export async function getNudgeCount(taskId: string): Promise<number> {
    try {
        const count = await (prisma as any).notification.count({
            where: { type: "NUDGE", taskId },
        });
        return count;
    } catch {
        return 0;
    }
}

// 내 알림 목록 조회
export async function getMyNotifications(userId: string) {
    try {
        const notifications = await (prisma as any).notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        return {
            success: true,
            data: notifications.map((n: any) => ({
                ...n,
                createdAt: n.createdAt.toISOString(),
            })),
        };
    } catch (error: any) {
        console.error("알림 조회 실패:", error);
        return { success: false, data: [] };
    }
}

// 읽음 처리
export async function markAsRead(notificationId: string) {
    try {
        await (prisma as any).notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
        return { success: true };
    } catch {
        return { success: false };
    }
}

// 전체 읽음
export async function markAllAsRead(userId: string) {
    try {
        await (prisma as any).notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
        return { success: true };
    } catch {
        return { success: false };
    }
}

// 읽지 않은 알림 수
export async function getUnreadCount(userId: string): Promise<number> {
    try {
        const count = await (prisma as any).notification.count({
            where: { userId, isRead: false },
        });
        return count;
    } catch {
        return 0;
    }
}

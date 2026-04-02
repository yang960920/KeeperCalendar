"use server";

import { prisma } from "@/lib/prisma";

// ─── 설정 기반 알림 필터 유틸 ──────────────────────────────────────────────────

/**
 * 특정 설정 필드가 false인 사용자를 걸러낸 뒤, 유효한 수신자 ID 목록을 반환
 */
async function filterByNotifySetting(
    userIds: string[],
    settingField: "notifyNudge" | "notifyDueDate" | "notifyPeerReview" | "notifySubTaskAssign"
): Promise<string[]> {
    if (userIds.length === 0) return [];
    const blocked = await (prisma as any).userSettings.findMany({
        where: { userId: { in: userIds }, [settingField]: false },
        select: { userId: true },
    });
    const blockedSet = new Set(blocked.map((s: any) => s.userId));
    return userIds.filter((id) => !blockedSet.has(id));
}

// ─── 하위업무 배정 알림 ────────────────────────────────────────────────────────

export async function sendSubTaskAssignNotification(data: {
    assigneeId: string;
    taskTitle: string;
    subTaskTitle: string;
    taskId: string;
    senderId: string;
}) {
    try {
        const eligible = await filterByNotifySetting([data.assigneeId], "notifySubTaskAssign");
        if (eligible.length === 0) return;

        await (prisma as any).notification.create({
            data: {
                userId: data.assigneeId,
                type: "SYSTEM",
                title: "📌 하위업무 배정",
                message: `"${data.taskTitle}" > "${data.subTaskTitle}" 하위업무가 배정되었습니다.`,
                taskId: data.taskId,
                senderId: data.senderId,
            },
        });
    } catch (err) {
        console.error("[Notification] 하위업무 배정 알림 실패:", err);
    }
}

// ─── 피어 리뷰 요청 알림 ──────────────────────────────────────────────────────

export async function sendPeerReviewNotification(data: {
    recipientIds: string[];
    projectName: string;
    projectId: string;
}) {
    try {
        const eligible = await filterByNotifySetting(data.recipientIds, "notifyPeerReview");
        if (eligible.length === 0) return;

        await (prisma as any).notification.createMany({
            data: eligible.map((userId: string) => ({
                userId,
                type: "SYSTEM",
                title: "⭐ 피어 리뷰 요청",
                message: `"${data.projectName}" 프로젝트의 피어 리뷰를 작성해 주세요.`,
                projectId: data.projectId,
            })),
        });
    } catch (err) {
        console.error("[Notification] 피어 리뷰 알림 실패:", err);
    }
}

// ─── 마감일 리마인더 알림 (cron에서 호출) ─────────────────────────────────────

export async function sendDueDateReminders() {
    try {
        // 알림 설정이 켜진 사용자의 설정 조회
        const allSettings = await (prisma as any).userSettings.findMany({
            where: { notifyDueDate: true },
            select: { userId: true, notifyDueDays: true },
        });

        if (allSettings.length === 0) return { sent: 0 };

        let totalSent = 0;

        // notifyDueDays 그룹별로 처리 (1, 3, 7)
        const dayGroups = new Map<number, string[]>();
        for (const s of allSettings) {
            const days = s.notifyDueDays || 1;
            if (!dayGroups.has(days)) dayGroups.set(days, []);
            dayGroups.get(days)!.push(s.userId);
        }

        for (const [days, userIds] of dayGroups) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + days);
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);

            // 해당 날짜에 마감인 업무 중 해당 사용자들이 담당인 것
            const tasks = await prisma.task.findMany({
                where: {
                    status: { not: "DONE" },
                    dueDate: { gte: startOfDay, lte: endOfDay },
                    assignees: { some: { id: { in: userIds } } },
                },
                include: {
                    assignees: { select: { id: true } },
                    project: { select: { name: true } },
                },
            });

            const notifications: any[] = [];
            for (const task of tasks) {
                for (const assignee of task.assignees) {
                    if (userIds.includes(assignee.id)) {
                        notifications.push({
                            userId: assignee.id,
                            type: "SYSTEM",
                            title: "⏰ 마감일 리마인더",
                            message: `"${task.title}" 업무 마감이 ${days === 1 ? "내일" : `${days}일 후`}입니다.${task.project ? ` (${task.project.name})` : ""}`,
                            taskId: task.id,
                        });
                    }
                }
            }

            if (notifications.length > 0) {
                await (prisma as any).notification.createMany({ data: notifications });
                totalSent += notifications.length;
            }
        }

        return { sent: totalSent };
    } catch (err) {
        console.error("[Notification] 마감일 리마인더 실패:", err);
        return { sent: 0, error: String(err) };
    }
}

// ─── 독촉 알림 보내기 (24시간 쿨다운) ─────────────────────────────────────────
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
        const eligibleIds = await filterByNotifySetting(data.recipientIds, "notifyNudge");

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

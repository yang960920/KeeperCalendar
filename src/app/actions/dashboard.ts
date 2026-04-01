"use server";

import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";

/**
 * 대시보드 통계 데이터 한번에 조회 (병렬 쿼리)
 */
export async function getDashboardStats(userId: string) {
    noStore();
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 5개의 독립 쿼리를 병렬 실행 (Waterfall 제거)
        const [todayTasks, unreadNotifications, allMyTasks, activeProjects, recentNotifications] = await Promise.all([
            // 1. 오늘 할 일 (오늘 기한인 업무 + 나에게 할당된 업무)
            prisma.task.findMany({
                where: {
                    OR: [
                        {
                            dueDate: { gte: today, lt: tomorrow },
                            assignees: { some: { id: userId } },
                        },
                        {
                            endDate: { gte: today, lt: tomorrow },
                            assignees: { some: { id: userId } },
                        },
                    ],
                },
                include: {
                    project: { select: { name: true } },
                    assignees: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 10,
            }),
            // 2. 안 읽은 알림 수
            prisma.notification.count({
                where: { userId, isRead: false },
            }),
            // 3. 업무 상태별 건수 (내가 담당인 것들)
            prisma.task.findMany({
                where: {
                    assignees: { some: { id: userId } },
                },
                select: { status: true, isUrgent: true },
            }),
            // 4. 진행 중 프로젝트 수
            prisma.project.count({
                where: {
                    status: "ACTIVE",
                    OR: [
                        { creatorId: userId },
                        { participants: { some: { id: userId } } },
                    ],
                },
            }),
            // 5. 최근 알림 목록 (메일 위젯용)
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
        ]);

        const taskStats = {
            total: allMyTasks.length,
            todo: allMyTasks.filter((t) => t.status === "TODO").length,
            inProgress: allMyTasks.filter((t) => t.status === "IN_PROGRESS").length,
            done: allMyTasks.filter((t) => t.status === "DONE").length,
            urgent: allMyTasks.filter((t) => t.isUrgent).length,
        };

        return {
            success: true,
            data: {
                todayTasks,
                unreadNotifications,
                taskStats,
                activeProjects,
                recentNotifications,
            },
        };
    } catch (error) {
        console.error("[Dashboard] getDashboardStats error:", error);
        return { success: false, error: "대시보드 데이터 조회 중 오류가 발생했습니다." };
    }
}

/**
 * 최근 로그인 기록 조회 (ActivityLog에서 LOGIN 타입만)
 */
export async function getLoginHistory(userId: string) {
    noStore();
    try {
        const logs = await prisma.activityLog.findMany({
            where: {
                userId,
                action: "LOGIN",
            },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        return { success: true, data: logs };
    } catch (error) {
        console.error("[Dashboard] getLoginHistory error:", error);
        return { success: false, error: "접속 기록 조회 중 오류가 발생했습니다." };
    }
}

/**
 * 최근 활동 피드 조회 (내 활동 + 내가 생성한 프로젝트 참여자 활동)
 */
export async function getActivityFeed(userId: string) {
    noStore();
    try {
        // 1. 내가 생성한 프로젝트 ID 목록
        const myProjects = await prisma.project.findMany({
            where: {
                OR: [
                    { creatorId: userId },
                    { participants: { some: { id: userId } } },
                ],
            },
            select: { id: true },
        });
        const projectIds = myProjects.map((p) => p.id);

        // 2. 내 활동 + 내 프로젝트 범위 활동
        const feed = await prisma.activityLog.findMany({
            where: {
                action: { not: "LOGIN" },
                OR: [
                    { userId },
                    { projectId: { in: projectIds } },
                ],
            },
            include: {
                user: { select: { id: true, name: true, profileImageUrl: true } },
                project: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 30,
        });

        return { success: true, data: feed };
    } catch (error) {
        console.error("[Dashboard] getActivityFeed error:", error);
        return { success: false, error: "활동 피드 조회 중 오류가 발생했습니다." };
    }
}

/**
 * 업무 상태별 최근 목록 (TaskStatusWidget용)
 */
export async function getRecentTasks(userId: string) {
    noStore();
    try {
        const tasks = await prisma.task.findMany({
            where: {
                assignees: { some: { id: userId } },
            },
            include: {
                project: { select: { name: true } },
                assignees: { select: { id: true, name: true } },
            },
            orderBy: { updatedAt: "desc" },
        });

        return { success: true, data: tasks };
    } catch (error) {
        console.error("[Dashboard] getRecentTasks error:", error);
        return { success: false, error: "업무 목록 조회 중 오류가 발생했습니다." };
    }
}

/**
 * 미니 캘린더용 — 해당 월에 업무가 있는 날짜 목록
 */
export async function getTaskDatesForMonth(userId: string, year: number, month: number) {
    noStore();
    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const tasks = await prisma.task.findMany({
            where: {
                assignees: { some: { id: userId } },
                OR: [
                    { dueDate: { gte: startDate, lte: endDate } },
                    { endDate: { gte: startDate, lte: endDate } },
                    { createdAt: { gte: startDate, lte: endDate } },
                ],
            },
            select: { dueDate: true, endDate: true, createdAt: true },
        });

        // 날짜만 수집 (중복 제거)
        const dateSet = new Set<string>();
        tasks.forEach((t) => {
            if (t.dueDate) dateSet.add(t.dueDate.toISOString().split("T")[0]);
            if (t.endDate) dateSet.add(t.endDate.toISOString().split("T")[0]);
        });

        return { success: true, data: Array.from(dateSet) };
    } catch (error) {
        console.error("[Dashboard] getTaskDatesForMonth error:", error);
        return { success: false, error: "캘린더 데이터 조회 중 오류가 발생했습니다." };
    }
}

/**
 * 특정 날짜의 업무 목록 조회 (미니캘린더 날짜 클릭용)
 */
export async function getTasksForDate(userId: string, dateStr: string) {
    noStore();
    try {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const tasks = await prisma.task.findMany({
            where: {
                assignees: { some: { id: userId } },
                OR: [
                    { dueDate: { gte: date, lt: nextDay } },
                    { endDate: { gte: date, lt: nextDay } },
                ],
            },
            include: {
                project: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return { success: true, data: tasks };
    } catch (error) {
        console.error("[Dashboard] getTasksForDate error:", error);
        return { success: false, error: "날짜별 업무 조회 중 오류가 발생했습니다." };
    }
}


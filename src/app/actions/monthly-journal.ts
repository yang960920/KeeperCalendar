"use server";

import { prisma } from "@/lib/prisma";

// ─── 월간 목표 CRUD ──────────────────────────────────────────────────────────

export async function getMonthlyGoals(userId: string, year: number, month: number) {
    try {
        const goals = await (prisma as any).monthlyGoal.findMany({
            where: { userId, year, month },
            orderBy: { createdAt: "asc" },
        });
        return {
            success: true,
            data: goals.map((g: any) => ({
                ...g,
                createdAt: g.createdAt.toISOString(),
                updatedAt: g.updatedAt.toISOString(),
            })),
        };
    } catch (error: any) {
        console.error("Failed to get monthly goals:", error);
        return { success: false, data: [] };
    }
}

export async function createMonthlyGoal(data: {
    userId: string;
    year: number;
    month: number;
    title: string;
    targetValue: number;
    unit?: string;
}) {
    try {
        const goal = await (prisma as any).monthlyGoal.create({
            data: {
                userId: data.userId,
                year: data.year,
                month: data.month,
                title: data.title,
                targetValue: data.targetValue,
                unit: data.unit || "%",
            },
        });
        return { success: true, data: goal };
    } catch (error: any) {
        if (error?.code === "P2002") {
            return { success: false, error: "동일한 목표가 이미 존재합니다." };
        }
        console.error("Failed to create monthly goal:", error);
        return { success: false, error: "목표 생성에 실패했습니다." };
    }
}

export async function updateMonthlyGoal(goalId: string, data: {
    currentValue?: number;
    isCompleted?: boolean;
    title?: string;
    targetValue?: number;
}) {
    try {
        const goal = await (prisma as any).monthlyGoal.update({
            where: { id: goalId },
            data,
        });
        return { success: true, data: goal };
    } catch (error: any) {
        console.error("Failed to update monthly goal:", error);
        return { success: false, error: "목표 업데이트에 실패했습니다." };
    }
}

export async function deleteMonthlyGoal(goalId: string) {
    try {
        await (prisma as any).monthlyGoal.delete({ where: { id: goalId } });
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete monthly goal:", error);
        return { success: false, error: "목표 삭제에 실패했습니다." };
    }
}

// ─── 주간 요약 자동 생성 ─────────────────────────────────────────────────────

export async function getWeeklySummary(userId: string, year: number, month: number) {
    try {
        // 해당 월의 모든 업무를 주차별로 그룹핑
        const monthStr = String(month).padStart(2, "0");
        const startDate = new Date(`${year}-${monthStr}-01T00:00:00+09:00`);
        const endDate = new Date(year, month, 0, 23, 59, 59); // 해당 월 말일

        const tasks = await prisma.task.findMany({
            where: {
                OR: [
                    { assigneeId: userId },
                    { assignees: { some: { id: userId } } },
                ],
                dueDate: { gte: startDate, lte: endDate },
            },
            include: {
                project: { select: { name: true } },
                subTasks: { select: { isCompleted: true } },
            },
            orderBy: { dueDate: "asc" },
        });

        // 주차별 그룹핑
        const weeks: {
            weekNum: number;
            startDay: number;
            endDay: number;
            tasks: typeof tasks;
            completed: number;
            total: number;
            delayed: number;
        }[] = [];

        const daysInMonth = new Date(year, month, 0).getDate();
        const today = new Date();

        for (let w = 0; w < 5; w++) {
            const wStart = w * 7 + 1;
            const wEnd = Math.min((w + 1) * 7, daysInMonth);
            if (wStart > daysInMonth) break;

            const weekTasks = tasks.filter((t) => {
                if (!t.dueDate) return false;
                const day = t.dueDate.getDate();
                return day >= wStart && day <= wEnd;
            });

            const completed = weekTasks.filter((t) => t.status === "DONE").length;
            const delayed = weekTasks.filter((t) => {
                if (t.status === "DONE") return false;
                if (!t.endDate) return false;
                return new Date(t.endDate) < today;
            }).length;

            weeks.push({
                weekNum: w + 1,
                startDay: wStart,
                endDay: wEnd,
                tasks: weekTasks,
                completed,
                total: weekTasks.length,
                delayed,
            });
        }

        const summaryData = weeks.map((w) => ({
            weekNum: w.weekNum,
            period: `${month}/${w.startDay} ~ ${month}/${w.endDay}`,
            total: w.total,
            completed: w.completed,
            delayed: w.delayed,
            rate: w.total > 0 ? Math.round((w.completed / w.total) * 100) : 0,
            topTasks: w.tasks.slice(0, 5).map((t) => ({
                title: t.title,
                project: (t.project as any)?.name || "개인",
                status: t.status === "DONE" ? "완료" : t.status === "IN_PROGRESS" ? "진행중" : "대기",
                priority: t.priority || "보통",
            })),
        }));

        return { success: true, data: summaryData };
    } catch (error: any) {
        console.error("Failed to get weekly summary:", error);
        return { success: false, data: [] };
    }
}

// ─── 월간 비교 (전월 vs 이번달) ──────────────────────────────────────────────

export async function getMonthComparison(userId: string, year: number, month: number) {
    try {
        // 이번 달
        const currentStart = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+09:00`);
        const currentEnd = new Date(year, month, 0, 23, 59, 59);

        // 전월
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const prevStart = new Date(`${prevYear}-${String(prevMonth).padStart(2, "0")}-01T00:00:00+09:00`);
        const prevEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59);

        const [currentTasks, prevTasks] = await Promise.all([
            prisma.task.findMany({
                where: {
                    OR: [
                        { assigneeId: userId },
                        { assignees: { some: { id: userId } } },
                    ],
                    dueDate: { gte: currentStart, lte: currentEnd },
                },
            }),
            prisma.task.findMany({
                where: {
                    OR: [
                        { assigneeId: userId },
                        { assignees: { some: { id: userId } } },
                    ],
                    dueDate: { gte: prevStart, lte: prevEnd },
                },
            }),
        ]);

        const today = new Date();

        const calcStats = (tasks: typeof currentTasks) => {
            const total = tasks.length;
            const completed = tasks.filter((t) => t.status === "DONE").length;
            const delayed = tasks.filter((t) => {
                if (t.status === "DONE") return false;
                if (!t.endDate) return false;
                return new Date(t.endDate) < today;
            }).length;
            const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
            const totalContribution = tasks.reduce((sum, t) => sum + (t.contributionScore || 0), 0);

            // 기한 준수율
            const withEnd = tasks.filter((t) => t.endDate && t.status === "DONE" && t.completedAt);
            const onTime = withEnd.filter((t) => new Date(t.completedAt!) <= new Date(t.endDate!)).length;
            const timelinessRate = withEnd.length > 0 ? Math.round((onTime / withEnd.length) * 100) : 100;

            return { total, completed, delayed, inProgress, rate, totalContribution, timelinessRate };
        };

        const current = calcStats(currentTasks);
        const prev = calcStats(prevTasks);

        return {
            success: true,
            data: {
                current: { ...current, year, month },
                previous: { ...prev, year: prevYear, month: prevMonth },
                diff: {
                    total: current.total - prev.total,
                    completed: current.completed - prev.completed,
                    rate: current.rate - prev.rate,
                    delayed: current.delayed - prev.delayed,
                    contribution: current.totalContribution - prev.totalContribution,
                    timeliness: current.timelinessRate - prev.timelinessRate,
                },
            },
        };
    } catch (error: any) {
        console.error("Failed to get month comparison:", error);
        return { success: false, data: null };
    }
}

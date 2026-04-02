"use server";

import { prisma } from "@/lib/prisma";

/**
 * 부서별 달성률 데이터를 가져옵니다.
 * - monthlyStats: 월별 달성률 (전체 또는 특정 부서)
 * - departmentStats: 부서별 달성률 비교 (전체 부서 모드)
 * - memberStats: 특정 부서 선택 시 소속 직원별 달성률
 *
 * 복수 담당자(assignees)가 있는 업무는 모든 담당자에게 균등 배분됩니다.
 */
export async function getAchievementData(departmentFilter: string = "all") {
    try {
        // 기본 where 절: 부서 필터
        const departmentWhere = departmentFilter !== "all"
            ? { assignee: { department: { name: departmentFilter } } }
            : {};

        // 모든 Task (필터 적용) — assignees(복수) 포함
        const tasks = await prisma.task.findMany({
            where: {
                ...departmentWhere,
                assigneeId: { not: null },
            },
            include: {
                assignee: {
                    include: { department: true }
                },
                assignees: {
                    include: { department: true }
                },
            }
        });

        // ── 1. 월별 통계 ──
        const monthlyMap: Record<string, { total: number; done: number }> = {};
        tasks.forEach(t => {
            const month = (t.dueDate || t.createdAt).toISOString().slice(0, 7);
            if (!monthlyMap[month]) monthlyMap[month] = { total: 0, done: 0 };
            monthlyMap[month].total += 1;
            if (t.status === "DONE") monthlyMap[month].done += 1;
        });

        const monthlyStats = Object.entries(monthlyMap)
            .map(([month, { total, done }]) => ({
                month,
                label: `${parseInt(month.split("-")[1])}월`,
                total,
                done,
                rate: total > 0 ? Math.round((done / total) * 100) : 0,
            }))
            .sort((a, b) => a.month.localeCompare(b.month));

        // ── 2. 부서별 통계 (전체 부서 모드) ──
        // ── 3. 개인별 통계 (특정 부서 선택 시) ──
        // 복수 담당자를 모두 순회하여 각자에게 공헌도를 배분
        const deptMap: Record<string, { total: number; done: number; contribution: number; totalPlanned: number }> = {};
        const memberMap: Record<string, { total: number; done: number; contribution: number; totalPlanned: number }> = {};

        tasks.forEach(t => {
            // 실제 담당자 목록 결정 (assignees가 있으면 복수, 없으면 assignee 단수)
            const assigneeList = t.assignees && t.assignees.length > 0
                ? t.assignees
                : t.assignee ? [t.assignee] : [];

            if (assigneeList.length === 0) return;

            // 각 담당자에게 균등 배분
            assigneeList.forEach(user => {
                const deptName = user.department?.name || "미지정";
                const memberName = user.name || "미할당";

                // 부서별
                if (!deptMap[deptName]) deptMap[deptName] = { total: 0, done: 0, contribution: 0, totalPlanned: 0 };
                deptMap[deptName].total += 1;
                deptMap[deptName].totalPlanned += (t.planned || 1);
                if (t.status === "DONE") {
                    deptMap[deptName].done += 1;
                    deptMap[deptName].contribution += (t.contributionScore || 0);
                }

                // 개인별
                if (!memberMap[memberName]) memberMap[memberName] = { total: 0, done: 0, contribution: 0, totalPlanned: 0 };
                memberMap[memberName].total += 1;
                memberMap[memberName].totalPlanned += (t.planned || 1);
                if (t.status === "DONE") {
                    memberMap[memberName].done += 1;
                    memberMap[memberName].contribution += (t.contributionScore || 0);
                }
            });
        });

        const departmentStats = Object.entries(deptMap)
            .map(([name, { total, done, contribution, totalPlanned }]) => ({
                name,
                total,
                done,
                rate: total > 0 ? Math.round((done / total) * 100) : 0,
                contribution,
                totalPlanned,
            }))
            .sort((a, b) => b.rate - a.rate);

        const memberStats = Object.entries(memberMap)
            .map(([name, { total, done, contribution, totalPlanned }]) => ({
                name,
                total,
                done,
                rate: total > 0 ? Math.round((done / total) * 100) : 0,
                contribution,
                totalPlanned,
            }))
            .sort((a, b) => b.contribution - a.contribution);

        return {
            success: true,
            data: { monthlyStats, departmentStats, memberStats }
        };
    } catch (error) {
        console.error("Achievement data error:", error);
        return { success: false, error: "달성률 데이터를 불러오는 중 오류가 발생했습니다." };
    }
}

// ─── KPI 대시보드 데이터 (기간 필터 지원) ────────────────────────────────────

export async function getKpiDashboard(yearMonth?: string) {
    try {
        const today = new Date();
        let periodStart: Date;
        let periodEnd: Date;
        let prevStart: Date;
        let prevEnd: Date;

        if (yearMonth) {
            const [y, m] = yearMonth.split("-").map(Number);
            periodStart = new Date(y, m - 1, 1);
            periodEnd = new Date(y, m, 0, 23, 59, 59);
            const pm = m === 1 ? 12 : m - 1;
            const py = m === 1 ? y - 1 : y;
            prevStart = new Date(py, pm - 1, 1);
            prevEnd = new Date(py, pm, 0, 23, 59, 59);
        } else {
            // 이번 달
            periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
            periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
            prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            prevEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
        }

        const [currentTasks, prevTasks, allUsers] = await Promise.all([
            prisma.task.findMany({
                where: {
                    assigneeId: { not: null },
                    OR: [
                        { dueDate: { gte: periodStart, lte: periodEnd } },
                        { createdAt: { gte: periodStart, lte: periodEnd } },
                    ],
                },
                include: {
                    assignee: { include: { department: true } },
                    assignees: { include: { department: true } },
                    subTasks: { select: { isCompleted: true } },
                },
            }),
            prisma.task.findMany({
                where: {
                    assigneeId: { not: null },
                    OR: [
                        { dueDate: { gte: prevStart, lte: prevEnd } },
                        { createdAt: { gte: prevStart, lte: prevEnd } },
                    ],
                },
                select: { status: true, contributionScore: true, endDate: true, completedAt: true },
            }),
            prisma.user.count({ where: { role: { not: undefined as any } } }),
        ]);

        // 현재 기간 지표
        const total = currentTasks.length;
        const completed = currentTasks.filter(t => t.status === "DONE").length;
        const inProgress = currentTasks.filter(t => t.status === "IN_PROGRESS").length;
        const delayed = currentTasks.filter(t => {
            if (t.status === "DONE") return false;
            if (!t.endDate) return false;
            return new Date(t.endDate) < today;
        }).length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const totalContribution = currentTasks.reduce((s, t) => s + (t.contributionScore || 0), 0);

        // 기한 준수율
        const withEnd = currentTasks.filter(t => t.endDate && t.status === "DONE" && t.completedAt);
        const onTime = withEnd.filter(t => new Date(t.completedAt!) <= new Date(t.endDate!)).length;
        const timelinessRate = withEnd.length > 0 ? Math.round((onTime / withEnd.length) * 100) : 100;

        // 전월 지표
        const prevTotal = prevTasks.length;
        const prevCompleted = prevTasks.filter(t => t.status === "DONE").length;
        const prevRate = prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : 0;
        const prevContribution = prevTasks.reduce((s, t) => s + (t.contributionScore || 0), 0);
        const prevDelayed = prevTasks.filter(t => {
            if (t.status === "DONE") return false;
            if (!t.endDate) return false;
            return new Date(t.endDate) < prevEnd;
        }).length;

        // 우선순위별 분석
        const priorityMap: Record<string, { total: number; done: number; delayed: number }> = {};
        currentTasks.forEach(t => {
            const p = t.priority || "보통";
            if (!priorityMap[p]) priorityMap[p] = { total: 0, done: 0, delayed: 0 };
            priorityMap[p].total++;
            if (t.status === "DONE") priorityMap[p].done++;
            if (t.status !== "DONE" && t.endDate && new Date(t.endDate) < today) priorityMap[p].delayed++;
        });

        const priorityStats = Object.entries(priorityMap).map(([priority, v]) => ({
            priority,
            total: v.total,
            done: v.done,
            delayed: v.delayed,
            rate: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0,
        }));

        // 부서별 요약 (top 5)
        const deptSummaryMap: Record<string, { name: string; total: number; done: number; contribution: number }> = {};
        currentTasks.forEach(t => {
            const assigneeList = t.assignees && t.assignees.length > 0 ? t.assignees : t.assignee ? [t.assignee] : [];
            assigneeList.forEach(u => {
                const dept = u.department?.name || "미지정";
                if (!deptSummaryMap[dept]) deptSummaryMap[dept] = { name: dept, total: 0, done: 0, contribution: 0 };
                deptSummaryMap[dept].total++;
                if (t.status === "DONE") {
                    deptSummaryMap[dept].done++;
                    deptSummaryMap[dept].contribution += (t.contributionScore || 0);
                }
            });
        });

        const topDepartments = Object.values(deptSummaryMap)
            .map(d => ({ ...d, rate: d.total > 0 ? Math.round((d.done / d.total) * 100) : 0 }))
            .sort((a, b) => b.rate - a.rate)
            .slice(0, 5);

        // Top 5 기여자
        const memberContribMap: Record<string, { name: string; dept: string; contribution: number; completed: number; total: number }> = {};
        currentTasks.forEach(t => {
            const assigneeList = t.assignees && t.assignees.length > 0 ? t.assignees : t.assignee ? [t.assignee] : [];
            assigneeList.forEach(u => {
                if (!memberContribMap[u.id]) {
                    memberContribMap[u.id] = { name: u.name, dept: u.department?.name || "미지정", contribution: 0, completed: 0, total: 0 };
                }
                memberContribMap[u.id].total++;
                if (t.status === "DONE") {
                    memberContribMap[u.id].completed++;
                    memberContribMap[u.id].contribution += (t.contributionScore || 0);
                }
            });
        });

        const topContributors = Object.values(memberContribMap)
            .sort((a, b) => b.contribution - a.contribution)
            .slice(0, 5)
            .map(c => ({ ...c, rate: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0 }));

        // 지연 분석
        const delayedTasks = currentTasks
            .filter(t => t.status !== "DONE" && t.endDate && new Date(t.endDate) < today)
            .map(t => {
                const assigneeList = t.assignees?.length ? t.assignees : t.assignee ? [t.assignee] : [];
                const delayDays = Math.floor((today.getTime() - new Date(t.endDate!).getTime()) / 86400000);
                return {
                    title: t.title,
                    assignees: assigneeList.map(u => u.name).join(", "),
                    department: assigneeList[0]?.department?.name || "미지정",
                    priority: t.priority || "보통",
                    delayDays,
                    dueDate: t.endDate!.toISOString().slice(0, 10),
                };
            })
            .sort((a, b) => b.delayDays - a.delayDays)
            .slice(0, 10);

        // 자동 요약 텍스트 생성
        const summaryLines: string[] = [];
        summaryLines.push(`이번 달 총 ${total}건의 업무 중 ${completed}건 완료 (달성률 ${rate}%)`);
        if (rate > prevRate) summaryLines.push(`전월 대비 달성률이 ${rate - prevRate}%p 상승했습니다.`);
        else if (rate < prevRate) summaryLines.push(`전월 대비 달성률이 ${prevRate - rate}%p 하락했습니다. 주의가 필요합니다.`);
        if (delayed > 0) summaryLines.push(`현재 ${delayed}건의 업무가 지연 중입니다.${delayed >= 5 ? " 긴급 점검이 필요합니다." : ""}`);
        if (topContributors.length > 0) summaryLines.push(`최고 기여자: ${topContributors[0].name} (${topContributors[0].dept}, ${topContributors[0].contribution}점)`);
        if (timelinessRate < 80) summaryLines.push(`기한 준수율이 ${timelinessRate}%로 낮습니다. 일정 관리 개선이 필요합니다.`);

        return {
            success: true,
            data: {
                kpi: {
                    total, completed, inProgress, delayed, rate,
                    totalContribution, timelinessRate, activeUsers: allUsers,
                },
                prevKpi: {
                    total: prevTotal, completed: prevCompleted, rate: prevRate,
                    contribution: prevContribution, delayed: prevDelayed,
                },
                diff: {
                    total: total - prevTotal,
                    completed: completed - prevCompleted,
                    rate: rate - prevRate,
                    delayed: delayed - prevDelayed,
                    contribution: totalContribution - prevContribution,
                },
                priorityStats,
                topDepartments,
                topContributors,
                delayedTasks,
                summary: summaryLines,
            },
        };
    } catch (error) {
        console.error("KPI dashboard error:", error);
        return { success: false, error: "KPI 대시보드 데이터를 불러오는 중 오류가 발생했습니다." };
    }
}

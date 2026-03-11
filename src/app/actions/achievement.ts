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

"use server";

import { prisma } from "@/lib/prisma";

/**
 * 부서별 달성률 데이터를 가져옵니다.
 * - monthlyStats: 월별 달성률 (전체 또는 특정 부서)
 * - departmentStats: 부서별 달성률 비교 (전체 부서 모드)
 * - memberStats: 특정 부서 선택 시 소속 직원별 달성률
 */
export async function getAchievementData(departmentFilter: string = "all") {
    try {
        // 기본 where 절: 부서 필터
        const departmentWhere = departmentFilter !== "all"
            ? { assignee: { department: { name: departmentFilter } } }
            : {};

        // Task 모델의 priority를 planned 수치로 변환
        const priorityToPlanned = (priority: string) => {
            if (priority === "HIGH") return 3;
            if (priority === "MEDIUM") return 2;
            return 1;
        };

        // 모든 Task (필터 적용)
        const tasks = await prisma.task.findMany({
            where: {
                ...departmentWhere,
                assigneeId: { not: null },
            },
            include: {
                assignee: {
                    include: { department: true }
                }
            }
        });

        // ── 1. 월별 통계 ──
        const monthlyMap: Record<string, { total: number; done: number }> = {};
        tasks.forEach(t => {
            const month = (t.dueDate || t.createdAt).toISOString().slice(0, 7); // YYYY-MM
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
        const deptMap: Record<string, { total: number; done: number; contribution: number; totalPlanned: number }> = {};
        tasks.forEach(t => {
            const deptName = t.assignee?.department?.name || "미지정";
            const planned = priorityToPlanned(t.priority);
            if (!deptMap[deptName]) deptMap[deptName] = { total: 0, done: 0, contribution: 0, totalPlanned: 0 };
            deptMap[deptName].total += 1;
            deptMap[deptName].totalPlanned += planned;
            if (t.status === "DONE") {
                deptMap[deptName].done += 1;
                deptMap[deptName].contribution += planned;
            }
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

        // ── 3. 개인별 통계 (특정 부서 선택 시) ──
        const memberMap: Record<string, { total: number; done: number; contribution: number; totalPlanned: number }> = {};
        tasks.forEach(t => {
            const name = t.assignee?.name || "미할당";
            const planned = priorityToPlanned(t.priority);
            if (!memberMap[name]) memberMap[name] = { total: 0, done: 0, contribution: 0, totalPlanned: 0 };
            memberMap[name].total += 1;
            memberMap[name].totalPlanned += planned;
            if (t.status === "DONE") {
                memberMap[name].done += 1;
                memberMap[name].contribution += planned;
            }
        });

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

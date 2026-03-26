"use server";

import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";

/**
 * [관리자] 오늘의 전체 직원 근태 현황 조회
 * - 출근한 사람은 Attendance 레코드를 기반으로 표시
 * - 미출근 사람은 User 테이블에서 JOIN하여 상태 "미출근"으로 표시
 */
export async function getTodayAttendanceList() {
    noStore();
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 모든 직원 목록 (관리자 제외하려면 role 필터 추가 가능)
        const allUsers = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                department: { select: { name: true } },
            },
            orderBy: { name: "asc" },
        });

        // 오늘 출근 기록
        const todayRecords = await prisma.attendance.findMany({
            where: { date: today },
            include: {
                user: { select: { id: true, name: true, department: { select: { name: true } } } },
            },
        });

        const attendanceMap = new Map(todayRecords.map(r => [r.userId, r]));

        const result = allUsers.map(user => {
            const record = attendanceMap.get(user.id);
            if (record) {
                return {
                    userId: user.id,
                    name: user.name,
                    department: user.department?.name || "-",
                    clockIn: record.clockIn.toISOString(),
                    clockOut: record.clockOut?.toISOString() || null,
                    status: record.clockOut ? "CLOCKED_OUT" : (record as any).status || "PRESENT",
                    deviceId: (record as any).deviceId,
                };
            }
            return {
                userId: user.id,
                name: user.name,
                department: user.department?.name || "-",
                clockIn: null,
                clockOut: null,
                status: "ABSENT",
                deviceId: null,
            };
        });

        // 요약 집계
        const summary = {
            total: result.length,
            present: result.filter(r => r.status === "PRESENT" || r.status === "CLOCKED_OUT").length,
            late: result.filter(r => r.status === "LATE").length,
            absent: result.filter(r => r.status === "ABSENT").length,
            clockedOut: result.filter(r => r.status === "CLOCKED_OUT").length,
        };

        return { success: true, data: result, summary };
    } catch (error) {
        console.error("[AdminAttendance] getTodayAttendanceList error:", error);
        return { success: false, data: [], summary: { total: 0, present: 0, late: 0, absent: 0, clockedOut: 0 } };
    }
}

/**
 * [관리자] 월간 근태 리포트
 * - 특정 연/월의 전체 직원 출퇴근 기록을 날짜별로 그룹핑
 */
export async function getMonthlyAttendanceReport(year: number, month: number) {
    noStore();
    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        const daysInMonth = new Date(year, month, 0).getDate();

        // 모든 직원
        const allUsers = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                department: { select: { name: true } },
            },
            orderBy: { name: "asc" },
        });

        // 해당 월의 모든 출근 기록
        const records = await prisma.attendance.findMany({
            where: {
                date: { gte: startDate, lte: endDate },
            },
            orderBy: { date: "asc" },
        });

        // userId별로 날짜 매핑
        const recordMap = new Map<string, Map<number, { clockIn: string; clockOut: string | null; status: string }>>();
        for (const r of records) {
            const day = r.date.getDate();
            if (!recordMap.has(r.userId)) recordMap.set(r.userId, new Map());
            recordMap.get(r.userId)!.set(day, {
                clockIn: r.clockIn.toISOString(),
                clockOut: r.clockOut?.toISOString() || null,
                status: (r as any).status || "PRESENT",
            });
        }

        const result = allUsers.map(user => {
            const userDays = recordMap.get(user.id);
            const days: Record<number, { clockIn: string; clockOut: string | null; status: string } | null> = {};
            let totalMinutes = 0;
            let lateCount = 0;
            let absentCount = 0;

            for (let d = 1; d <= daysInMonth; d++) {
                const dayDate = new Date(year, month - 1, d);
                const dayOfWeek = dayDate.getDay();
                // 주말은 건너뛰기 (0=일, 6=토)
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    days[d] = null;
                    continue;
                }

                const dayRecord = userDays?.get(d) || null;
                days[d] = dayRecord;

                if (dayRecord) {
                    if (dayRecord.status === "LATE") lateCount++;
                    if (dayRecord.clockOut) {
                        const diffMs = new Date(dayRecord.clockOut).getTime() - new Date(dayRecord.clockIn).getTime();
                        totalMinutes += Math.floor(diffMs / 60000);
                    }
                } else {
                    // 오늘 이전의 평일에 기록이 없으면 결근
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (dayDate < today) {
                        absentCount++;
                    }
                }
            }

            const totalHours = Math.floor(totalMinutes / 60);
            const totalMins = totalMinutes % 60;

            return {
                userId: user.id,
                name: user.name,
                department: user.department?.name || "-",
                days,
                summary: {
                    totalWorkTime: `${totalHours}시간 ${totalMins}분`,
                    totalMinutes,
                    lateCount,
                    absentCount,
                },
            };
        });

        return { success: true, data: result, daysInMonth };
    } catch (error) {
        console.error("[AdminAttendance] getMonthlyAttendanceReport error:", error);
        return { success: false, data: [], daysInMonth: 0 };
    }
}

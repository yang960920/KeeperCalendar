"use server";

import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";

/**
 * 자동 출근 처리 (로그인 시 호출)
 * 하루 1회 제한 — @@unique([userId, date])
 */
export async function autoClockIn(userId: string, deviceToken?: string) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 이미 오늘 출근 기록이 있는지 확인
        const existing = await prisma.attendance.findUnique({
            where: {
                userId_date: { userId, date: today },
            },
        });

        if (existing) {
            return { success: true, alreadyClockedIn: true, data: existing };
        }

        // 기기 토큰 검증 (토큰이 있는 경우에만)
        let deviceId: string | null = null;
        if (deviceToken) {
            const device = await prisma.deviceToken.findUnique({
                where: { token: deviceToken },
            });
            if (device && device.status === "APPROVED" && device.userId === userId) {
                deviceId = device.id;
            }
        }

        // 지각 판정 (09:00 이후 출근 시 지각)
        const now = new Date();
        const lateThreshold = new Date(today);
        lateThreshold.setHours(9, 0, 0, 0);
        const status = now > lateThreshold ? "LATE" : "PRESENT";

        const attendance = await prisma.attendance.create({
            data: {
                userId,
                date: today,
                clockIn: now,
                status,
                deviceId,
            },
        });

        return { success: true, alreadyClockedIn: false, data: attendance };
    } catch (error) {
        console.error("[Attendance] autoClockIn error:", error);
        return { success: false, error: "출근 기록 중 오류가 발생했습니다." };
    }
}

/**
 * 퇴근 처리
 */
export async function clockOut(userId: string) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await prisma.attendance.findUnique({
            where: {
                userId_date: { userId, date: today },
            },
        });

        if (!attendance) {
            return { success: false, error: "오늘 출근 기록이 없습니다." };
        }

        if (attendance.clockOut) {
            return { success: false, error: "이미 퇴근 처리되었습니다." };
        }

        const updated = await prisma.attendance.update({
            where: { id: attendance.id },
            data: { clockOut: new Date() },
        });

        return { success: true, data: updated };
    } catch (error) {
        console.error("[Attendance] clockOut error:", error);
        return { success: false, error: "퇴근 처리 중 오류가 발생했습니다." };
    }
}

/**
 * 오늘 출퇴근 상태 조회
 */
export async function getTodayAttendance(userId: string) {
    noStore();
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await prisma.attendance.findUnique({
            where: {
                userId_date: { userId, date: today },
            },
        });

        return { success: true, data: attendance };
    } catch (error) {
        console.error("[Attendance] getTodayAttendance error:", error);
        return { success: false, error: "출퇴근 상태 조회 중 오류가 발생했습니다." };
    }
}

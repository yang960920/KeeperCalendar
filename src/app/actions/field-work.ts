"use server";

import { prisma } from "@/lib/prisma";
import { createCalendarEvent } from "@/app/actions/calendar-event";

// ── 1. 직원: 외근 사전 신청 ──
export async function requestFieldWork(userId: string, date: string, reason: string) {
    try {
        // 날짜 파싱 (YYYY-MM-DD → Date 00:00:00)
        const targetDate = new Date(date + "T00:00:00+09:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (targetDate <= today) {
            return { success: false, error: "외근 신청은 내일 이후 날짜만 가능합니다." };
        }

        // 이미 해당 날짜에 신청이 있는지 확인
        const existing = await prisma.fieldWorkRequest.findUnique({
            where: { userId_date: { userId, date: targetDate } },
        });

        if (existing) {
            return { success: false, error: "해당 날짜에 이미 외근 신청이 존재합니다." };
        }

        const request = await prisma.fieldWorkRequest.create({
            data: {
                userId,
                date: targetDate,
                reason,
                status: "PENDING",
            },
        });

        return { success: true, data: request };
    } catch (error) {
        console.error("[FieldWork] 신청 오류:", error);
        return { success: false, error: "외근 신청 중 오류가 발생했습니다." };
    }
}

// ── 2. 관리자: 외근 신청 승인 (→ 자동 출근 기록 생성) ──
export async function approveFieldWork(requestId: string) {
    try {
        const req = await prisma.fieldWorkRequest.findUnique({
            where: { id: requestId },
            include: { user: true },
        });

        if (!req) return { success: false, error: "신청을 찾을 수 없습니다." };
        if (req.status !== "PENDING") return { success: false, error: "이미 처리된 신청입니다." };

        // 1) 신청 상태를 APPROVED로 변경
        await prisma.fieldWorkRequest.update({
            where: { id: requestId },
            data: { status: "APPROVED" },
        });

        // 2) 해당 날짜에 자동 출근 기록 생성 (직원의 기본 스케줄로)
        const startTime = req.user.workStartTime || "09:00";
        const dateStr = req.date.toISOString().split("T")[0]; // "YYYY-MM-DD"
        const clockInTime = new Date(`${dateStr}T${startTime}:00+09:00`);

        // 이미 해당 날짜에 출근 기록이 있는지 확인
        const existingAttendance = await prisma.attendance.findUnique({
            where: { userId_date: { userId: req.userId, date: req.date } },
        });

        if (!existingAttendance) {
            await prisma.attendance.create({
                data: {
                    userId: req.userId,
                    date: req.date,
                    clockIn: clockInTime,
                    status: "PRESENT",
                    workType: "FIELD_PLANNED",
                    fieldReason: req.reason,
                },
            });
        }

        // 3) 공유 캘린더에 외근 일정 자동 등록 (공지형)
        try {
            const endTime = new Date(clockInTime.getTime() + 9 * 60 * 60 * 1000); // 9시간 근무
            await createCalendarEvent({
                title: `[외근] ${req.user.name}`,
                description: req.reason,
                category: "FIELD_WORK",
                startTime: clockInTime.toISOString(),
                endTime: endTime.toISOString(),
                isAllDay: false,
                creatorId: req.userId,
                attendeeIds: [],
                requiresRsvp: false,
            });
        } catch (calErr) {
            console.error("[FieldWork] 캘린더 이벤트 생성 실패 (무시):", calErr);
        }

        return { success: true };
    } catch (error) {
        console.error("[FieldWork] 승인 오류:", error);
        return { success: false, error: "외근 승인 중 오류가 발생했습니다." };
    }
}

// ── 3. 관리자: 외근 신청 반려 ──
export async function rejectFieldWork(requestId: string, rejectedReason?: string) {
    try {
        await prisma.fieldWorkRequest.update({
            where: { id: requestId },
            data: {
                status: "REJECTED",
                rejectedReason: rejectedReason || "관리자에 의해 반려되었습니다.",
            },
        });
        return { success: true };
    } catch (error) {
        console.error("[FieldWork] 반려 오류:", error);
        return { success: false, error: "외근 반려 중 오류가 발생했습니다." };
    }
}

// ── 4. 직원: 긴급 외근 출근 (당일, 미등록 기기에서) ──
export async function emergencyFieldClockIn(userId: string, reason: string) {
    try {
        const now = new Date();
        const kstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
        const dateOnly = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate());

        // 이미 오늘 출근 기록이 있는지 확인
        const existing = await prisma.attendance.findUnique({
            where: { userId_date: { userId, date: dateOnly } },
        });

        if (existing) {
            return { success: false, error: "이미 오늘 출근 기록이 존재합니다." };
        }

        // 지각 판정: 직원의 출근 기준 시간과 비교
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const startTime = user?.workStartTime || "09:00";
        const [sh, sm] = startTime.split(":").map(Number);
        const isLate = kstNow.getHours() > sh || (kstNow.getHours() === sh && kstNow.getMinutes() > sm);

        const attendance = await prisma.attendance.create({
            data: {
                userId,
                date: dateOnly,
                clockIn: now,
                status: isLate ? "LATE" : "PRESENT",
                workType: "FIELD_EMERGENCY",
                fieldReason: reason,
            },
        });

        // 공유 캘린더에 긴급 외근 일정 자동 등록
        try {
            const endTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
            await createCalendarEvent({
                title: `[긴급외근] ${user?.name || ""}`,
                description: reason,
                category: "FIELD_WORK",
                startTime: now.toISOString(),
                endTime: endTime.toISOString(),
                isAllDay: false,
                creatorId: userId,
                attendeeIds: [],
                requiresRsvp: false,
            });
        } catch (calErr) {
            console.error("[FieldWork] 긴급외근 캘린더 이벤트 생성 실패 (무시):", calErr);
        }

        return { success: true, data: attendance };
    } catch (error) {
        console.error("[FieldWork] 긴급 외근 출근 오류:", error);
        return { success: false, error: "긴급 외근 출근 중 오류가 발생했습니다." };
    }
}

// ── 5. 직원: 외근 사후 증빙 제출 ──
export async function submitFieldProof(attendanceId: string, proofText: string, proofUrl?: string) {
    try {
        await prisma.attendance.update({
            where: { id: attendanceId },
            data: {
                fieldProofText: proofText,
                fieldProofUrl: proofUrl || null,
            },
        });
        return { success: true };
    } catch (error) {
        console.error("[FieldWork] 증빙 제출 오류:", error);
        return { success: false, error: "증빙 자료 제출 중 오류가 발생했습니다." };
    }
}

// ── 6. 관리자: 외근 신청 목록 조회 (대기열) ──
export async function getFieldWorkRequests(statusFilter: string = "PENDING") {
    try {
        const requests = await prisma.fieldWorkRequest.findMany({
            where: statusFilter === "ALL" ? {} : { status: statusFilter },
            include: {
                user: {
                    select: { id: true, name: true, department: { select: { name: true } } },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return {
            success: true,
            data: requests.map((r) => ({
                id: r.id,
                userId: r.userId,
                userName: r.user.name,
                department: r.user.department?.name || "미지정",
                date: r.date.toISOString().split("T")[0],
                reason: r.reason,
                status: r.status,
                rejectedReason: r.rejectedReason,
                createdAt: r.createdAt.toISOString(),
            })),
        };
    } catch (error) {
        console.error("[FieldWork] 목록 조회 오류:", error);
        return { success: false, error: "목록을 불러오는 중 오류가 발생했습니다." };
    }
}

// ── 7. 직원: 내 외근 신청 내역 조회 ──
export async function getMyFieldWorkRequests(userId: string) {
    try {
        const requests = await prisma.fieldWorkRequest.findMany({
            where: { userId },
            orderBy: { date: "desc" },
            take: 20,
        });

        return {
            success: true,
            data: requests.map((r) => ({
                id: r.id,
                date: r.date.toISOString().split("T")[0],
                reason: r.reason,
                status: r.status,
                rejectedReason: r.rejectedReason,
                createdAt: r.createdAt.toISOString(),
            })),
        };
    } catch (error) {
        console.error("[FieldWork] 내 신청 조회 오류:", error);
        return { success: false, error: "내 외근 신청을 불러오는 중 오류가 발생했습니다." };
    }
}

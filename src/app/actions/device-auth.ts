"use server";

import { prisma } from "@/lib/prisma";

/**
 * 기기 토큰 검증 및 자동 등록 핵심 로직
 * - 승인된 기기가 0개인 경우 → 자동 등록(APPROVED)
 * - 승인된 기기가 있으나, 현재 토큰이 없거나 무효 → PENDING 등록 필요
 */
export async function checkDeviceToken(userId: string, token: string | null) {
    try {
        // 1. 현재 토큰이 전달된 경우, 해당 토큰만 단일 조회 (가장 빈번한 케이스)
        if (token) {
            const matched = await prisma.deviceToken.findUnique({
                where: { token },
            });

            if (matched && matched.userId === userId) {
                if (matched.status === "APPROVED") {
                    return { success: true, status: "APPROVED", deviceId: matched.id };
                }
                if (matched.status === "PENDING") {
                    return { success: false, status: "PENDING", message: "기기 등록 승인을 대기 중입니다. 관리자에게 문의하세요." };
                }
            }
        }

        // 2. 토큰이 없거나 무효한 경우, 승인된 기기가 존재하는지 1건만 조회
        const hasApprovedDevice = await prisma.deviceToken.findFirst({
            where: { userId, status: "APPROVED" },
            select: { id: true },
        });

        // 3. 승인된 기기가 0개 = 첫 기기 → 자동 등록 + 자동 승인
        if (!hasApprovedDevice) {
            const newToken = crypto.randomUUID();
            const device = await prisma.deviceToken.create({
                data: {
                    userId,
                    token: newToken,
                    deviceInfo: "자동 등록 (첫 기기)",
                    status: "APPROVED",
                },
            });
            return { success: true, status: "AUTO_REGISTERED", token: newToken, deviceId: device.id };
        }

        // 4. 승인된 기기가 이미 존재하고, 현재 토큰이 없거나 무효 → 추가 기기 등록 필요
        return { success: false, status: "NEED_REGISTRATION", message: "등록되지 않은 기기입니다. 기기 등록을 요청하세요." };
    } catch (error) {
        console.error("[DeviceAuth] checkDeviceToken error:", error);
        return { success: false, status: "ERROR", message: "기기 인증 중 오류가 발생했습니다." };
    }
}

/**
 * 새 기기 등록 요청 (PENDING 상태로 생성)
 */
export async function requestDeviceRegistration(userId: string, deviceInfo: string) {
    try {
        const newToken = crypto.randomUUID();
        const device = await prisma.deviceToken.create({
            data: {
                userId,
                token: newToken,
                deviceInfo: deviceInfo || "알 수 없는 기기",
                status: "PENDING",
            },
        });
        return { success: true, token: newToken, deviceId: device.id };
    } catch (error) {
        console.error("[DeviceAuth] requestDeviceRegistration error:", error);
        return { success: false, error: "기기 등록 요청 중 오류가 발생했습니다." };
    }
}

/**
 * [관리자] 승인 대기 기기 목록 조회
 */
export async function getPendingDevicesAdmin() {
    try {
        const devices = await prisma.deviceToken.findMany({
            where: { status: "PENDING" },
            include: {
                user: { select: { id: true, name: true, department: { select: { name: true } } } },
            },
            orderBy: { createdAt: "desc" },
        });
        return { success: true, data: devices };
    } catch (error) {
        console.error("[DeviceAuth] getPendingDevicesAdmin error:", error);
        return { success: false, data: [] };
    }
}

/**
 * [관리자] 기기 승인
 */
export async function approveDeviceAdmin(tokenId: string) {
    try {
        await prisma.deviceToken.update({
            where: { id: tokenId },
            data: { status: "APPROVED" },
        });
        return { success: true };
    } catch (error) {
        console.error("[DeviceAuth] approveDeviceAdmin error:", error);
        return { success: false, error: "기기 승인에 실패했습니다." };
    }
}

/**
 * [관리자] 기기 거절 (삭제)
 */
export async function rejectDeviceAdmin(tokenId: string) {
    try {
        await prisma.deviceToken.delete({
            where: { id: tokenId },
        });
        return { success: true };
    } catch (error) {
        console.error("[DeviceAuth] rejectDeviceAdmin error:", error);
        return { success: false, error: "기기 거절에 실패했습니다." };
    }
}

/**
 * [관리자] 모든 등록된 기기 목록 조회 (관리용)
 */
export async function getAllDevicesAdmin() {
    try {
        const devices = await prisma.deviceToken.findMany({
            include: {
                user: { select: { id: true, name: true, department: { select: { name: true } } } },
            },
            orderBy: { createdAt: "desc" },
        });
        return { success: true, data: devices };
    } catch (error) {
        console.error("[DeviceAuth] getAllDevicesAdmin error:", error);
        return { success: false, data: [] };
    }
}

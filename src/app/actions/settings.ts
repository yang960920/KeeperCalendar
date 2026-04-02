"use server";

import { prisma } from "@/lib/prisma";

// 사용자 프로필 조회
export async function getUserProfile(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { department: true },
        });
        if (!user) return { success: false, error: "사용자를 찾을 수 없습니다." };
        return {
            success: true,
            data: {
                id: user.id,
                name: user.name,
                role: user.role,
                department: user.department?.name || null,
                profileImageUrl: user.profileImageUrl || null,
            },
        };
    } catch (error) {
        console.error("Failed to get user profile:", error);
        return { success: false, error: "프로필 조회에 실패했습니다." };
    }
}

// 프로필 이미지 업데이트
export async function updateProfileImage(userId: string, imageUrl: string) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { profileImageUrl: imageUrl },
        });
        return { success: true };
    } catch (error) {
        console.error("Failed to update profile image:", error);
        return { success: false, error: "프로필 이미지 저장에 실패했습니다." };
    }
}

// 비밀번호 변경
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return { success: false, error: "사용자를 찾을 수 없습니다." };

        if (user.password !== currentPassword) {
            return { success: false, error: "현재 비밀번호가 일치하지 않습니다." };
        }

        if (newPassword.length < 4) {
            return { success: false, error: "새 비밀번호는 최소 4자 이상이어야 합니다." };
        }

        await prisma.user.update({
            where: { id: userId },
            data: { password: newPassword },
        });

        return { success: true };
    } catch (error) {
        console.error("Failed to change password:", error);
        return { success: false, error: "비밀번호 변경에 실패했습니다." };
    }
}

// 설정 조회 (없으면 기본값 생성)
export async function getUserSettings(userId: string) {
    try {
        let settings = await prisma.userSettings.findUnique({ where: { userId } });
        if (!settings) {
            settings = await prisma.userSettings.create({
                data: { userId },
            });
        }
        return {
            success: true,
            data: {
                notifyDueDate: settings.notifyDueDate,
                notifyDueDays: settings.notifyDueDays,
                notifyPeerReview: settings.notifyPeerReview,
                notifySubTaskAssign: settings.notifySubTaskAssign,
                notifyNudge: (settings as any).notifyNudge ?? true,
                theme: settings.theme,
                heatmapColor: settings.heatmapColor,
            },
        };
    } catch (error) {
        console.error("Failed to get user settings:", error);
        return { success: false, error: "설정 조회에 실패했습니다." };
    }
}

// 위젯 레이아웃 조회
export async function getWidgetLayout(userId: string) {
    try {
        const settings = await prisma.userSettings.findUnique({
            where: { userId },
            select: { widgetLayout: true },
        });
        if (settings?.widgetLayout) {
            return { success: true, data: JSON.parse(settings.widgetLayout) };
        }
        return { success: true, data: null };
    } catch (error) {
        console.error("Failed to get widget layout:", error);
        return { success: false, data: null };
    }
}

// 위젯 레이아웃 저장
export async function saveWidgetLayout(userId: string, layout: {
    layoutType: string;
    widgets: { id: string; visible: boolean }[];
}) {
    try {
        await prisma.userSettings.upsert({
            where: { userId },
            create: { userId, widgetLayout: JSON.stringify(layout) },
            update: { widgetLayout: JSON.stringify(layout) },
        });
        return { success: true };
    } catch (error) {
        console.error("Failed to save widget layout:", error);
        return { success: false, error: "위젯 배치 저장에 실패했습니다." };
    }
}

// 설정 업데이트
export async function updateUserSettings(userId: string, data: {
    notifyDueDate?: boolean;
    notifyDueDays?: number;
    notifyPeerReview?: boolean;
    notifySubTaskAssign?: boolean;
    notifyNudge?: boolean;
    theme?: string;
    heatmapColor?: string;
}) {
    try {
        await prisma.userSettings.upsert({
            where: { userId },
            create: { userId, ...data },
            update: data,
        });
        return { success: true };
    } catch (error) {
        console.error("Failed to update user settings:", error);
        return { success: false, error: "설정 저장에 실패했습니다." };
    }
}

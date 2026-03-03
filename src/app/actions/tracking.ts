"use server";

import { prisma } from "@/lib/prisma";

export async function getTrackingData() {
    try {
        const tasks = await prisma.task.findMany({
            include: {
                assignee: {
                    include: { department: true }
                },
                project: true,
            },
            orderBy: {
                updatedAt: 'desc'
            },
            take: 50 // 최근 50개만 조회 (임시)
        });

        const logs = await prisma.activityLog.findMany({
            include: {
                user: true,
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 30 // 최근 로그 30개
        });

        // 진행률 계산 로직. 기존의 planned/done 필드가 없어 status로 일괄 환산하거나 커스텀하게 만들어야 함.
        const formattedTasks = tasks.map(t => {
            let progress = 0;
            if (t.status === 'DONE') progress = 100;
            else if (t.status === 'IN_PROGRESS') progress = 50;

            return {
                id: t.id,
                user: t.assignee?.name || '미할당',
                department: t.assignee?.department?.name || '-',
                title: t.title,
                status: t.status === 'DONE' ? '완료' : t.status === 'IN_PROGRESS' ? '진행 중' : '대기',
                progress,
                lastUpdated: t.updatedAt.toISOString().slice(0, 16).replace('T', ' ')
            };
        });

        const formattedLogs = logs.map(l => ({
            id: l.id,
            time: l.createdAt.toISOString().slice(0, 16).replace('T', ' '),
            user: l.user.name,
            action: l.action,
            detail: l.details || '',
        }));

        return { success: true, data: { tasks: formattedTasks, logs: formattedLogs } };
    } catch (error: any) {
        console.error("============= TRACKING DATA ERROR =============");
        console.error(error);
        console.error(error?.message);
        console.error(error?.stack);
        console.error("===============================================");
        return { success: false, error: "데이터를 불러오는 중 서버 오류가 발생했습니다: " + (error?.message || "알 수 없는 오류") };
    }
}

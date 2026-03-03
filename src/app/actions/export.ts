"use server";

import { prisma } from "./employee";

export async function getExportData() {
    try {
        const tasks = await prisma.task.findMany({
            include: {
                assignee: {
                    include: { department: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // CSV 포맷으로 변환할 데이터 가공
        const exportData = tasks.map(t => {
            let progress = 0;
            if (t.status === 'DONE') progress = 100;
            else if (t.status === 'IN_PROGRESS') progress = 50;

            return {
                담당자: t.assignee?.name || '미할당',
                부서: t.assignee?.department?.name || '미지정',
                업무명: t.title,
                상태: t.status === 'DONE' ? '완료' : t.status === 'IN_PROGRESS' ? '진행 중' : '대기',
                달성률: `${progress}%`,
                업데이트일자: t.updatedAt.toISOString().slice(0, 10),
            };
        });

        return { success: true, data: exportData };
    } catch (error) {
        console.error("Error generating export data:", error);
        return { success: false, error: "데이터 추출 중 오류가 발생했습니다." };
    }
}

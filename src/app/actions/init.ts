"use server";

import { prisma } from "@/lib/prisma";

export async function getInitialData(userId: string) {
    try {
        // 1. Fetch User's Projects
        // 내 거나 내가 참여자인 프로젝트 모두
        const projects = await prisma.project.findMany({
            where: {
                OR: [
                    { creatorId: userId },
                    { participants: { some: { id: userId } } }
                ]
            },
            include: {
                participants: true,
            }
        });

        // 2. Fetch User's Tasks
        // 내 담당이거나 내가 만든 프로젝트의 Task
        const projectIds = projects.map(p => p.id);
        const tasks = await prisma.task.findMany({
            where: {
                OR: [
                    { assigneeId: userId },
                    { projectId: { in: projectIds } }
                ]
            },
            include: {
                project: true,
                subTasks: { orderBy: { createdAt: 'asc' } },
            }
        });

        // Format to match Zustand store interfaces
        const formattedProjects = projects.map(p => ({
            id: p.id,
            title: p.name,
            creatorId: p.creatorId,
            participantIds: p.participants.map((u: any) => u.id),
            createdAt: p.createdAt.toISOString(),
        }));

        const formattedTasks = tasks.map(t => ({
            id: t.id,
            date: t.dueDate ? t.dueDate.toISOString().split('T')[0] : t.createdAt.toISOString().split('T')[0],
            endDate: t.endDate ? t.endDate.toISOString().split('T')[0] : undefined,
            title: t.title,
            content: t.description || "",
            category: t.project?.category || "일반",
            planned: t.priority === "HIGH" ? 3 : t.priority === "MEDIUM" ? 2 : 1, // Fallback conversion
            done: t.status === "DONE" ? (t.priority === "HIGH" ? 3 : t.priority === "MEDIUM" ? 2 : 1) : 0,
            weight: 1,
            projectId: t.projectId,
            assigneeId: t.assigneeId || undefined,
            completedAt: t.completedAt ? t.completedAt.toISOString() : undefined,
            subTasks: t.subTasks.map(st => ({
                id: st.id,
                title: st.title,
                isCompleted: st.isCompleted,
                completedAt: st.completedAt ? st.completedAt.toISOString() : undefined,
            })),
        }));

        return { success: true, projects: formattedProjects, tasks: formattedTasks };

    } catch (error) {
        console.error("Failed to fetch initial data:", error);
        return { success: false, error: "초기 데이터 로드 중 오류가 발생했습니다." };
    }
}

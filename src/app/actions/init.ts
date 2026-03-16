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
                    { assignees: { some: { id: userId } } },  // 복수 담당자
                    { projectId: { in: projectIds } }
                ]
            },
            include: {
                project: true,
                assignees: true,  // 복수 담당자 포함
                subTasks: {
                    orderBy: { createdAt: 'asc' },
                    include: { assignee: true },
                },
            }
        });

        // Format to match Zustand store interfaces
        const formattedProjects = projects.map(p => ({
            id: p.id,
            title: p.name,
            creatorId: p.creatorId,
            participantIds: p.participants.map((u: any) => u.id),
            createdAt: p.createdAt.toISOString(),
            endDate: p.endDate.toISOString(),
            status: (p as any).status || "ACTIVE",
            closedAt: (p as any).closedAt?.toISOString() || undefined,
            closeReason: (p as any).closeReason || undefined,
            closeSummary: (p as any).closeSummary || undefined,
            closeReportUrl: (p as any).closeReportUrl || undefined,
            closeReportName: (p as any).closeReportName || undefined,
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
            assigneeIds: t.assignees ? t.assignees.map((u: any) => u.id) : (t.assigneeId ? [t.assigneeId] : []),
            assigneeName: t.assignees && t.assignees.length > 0
                ? (t.assignees[0] as any).name
                : undefined,
            assigneeNames: t.assignees
                ? t.assignees.map((u: any) => u.name)
                : [],
            completedAt: t.completedAt ? t.completedAt.toISOString() : undefined,
            subTasks: t.subTasks.map(st => ({
                id: st.id,
                title: st.title,
                description: st.description || undefined,
                isCompleted: st.isCompleted,
                status: (st as any).status || 'TODO',  // Phase 3
                completedAt: st.completedAt ? st.completedAt.toISOString() : undefined,
                assigneeId: st.assigneeId || undefined,
                assigneeName: (st as any).assignee?.name || undefined,
                dueDate: st.dueDate ? st.dueDate.toISOString().split('T')[0] : undefined,
                endDate: st.endDate ? st.endDate.toISOString().split('T')[0] : undefined,
            })),
        }));

        return { success: true, projects: formattedProjects, tasks: formattedTasks };

    } catch (error) {
        console.error("Failed to fetch initial data:", error);
        return { success: false, error: "초기 데이터 로드 중 오류가 발생했습니다." };
    }
}

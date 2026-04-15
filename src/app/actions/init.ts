"use server";

import { prisma } from "@/lib/prisma";

// 프로젝트 전체 열람 권한이 있는 관리자 ID 목록 (서버 전용, 클라이언트 미노출)
const PROJECT_ADMIN_IDS = ["양현준", "유경성", "김권찬", "한승우", "진호열"];

export async function getInitialData(userId: string) {
    try {
        const isAdmin = PROJECT_ADMIN_IDS.includes(userId);

        // 1. Fetch Projects
        // 관리자: 모든 프로젝트 / 일반: 내 거나 내가 참여자인 프로젝트
        const projects = await prisma.project.findMany({
            where: isAdmin ? {} : {
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
                createdBy: { select: { id: true, name: true } }, // 업무 생성자
                subTasks: {
                    orderBy: { createdAt: 'asc' },
                    include: { assignee: true },
                },
            }
        });

        // Format to match Zustand store interfaces
        // 관리자인 경우 participantIds에 본인 ID를 주입하여 클라이언트 필터 통과
        const formattedProjects = projects.map(p => {
            const participantIds = p.participants.map((u: any) => u.id);
            if (isAdmin && !participantIds.includes(userId) && p.creatorId !== userId) {
                participantIds.push(userId);
            }
            return {
            id: p.id,
            title: p.name,
            creatorId: p.creatorId,
            participantIds,
            createdAt: p.createdAt.toISOString(),
            endDate: p.endDate.toISOString(),
            status: (p as any).status || "ACTIVE",
            closedAt: (p as any).closedAt?.toISOString() || undefined,
            closeReason: (p as any).closeReason || undefined,
            closeSummary: (p as any).closeSummary || undefined,
            closeReportUrl: (p as any).closeReportUrl || undefined,
            closeReportName: (p as any).closeReportName || undefined,
        };
        });

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
            createdById: (t as any).createdById || undefined,
            createdByName: (t as any).createdBy?.name || undefined,
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

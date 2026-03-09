"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * 활동 로그를 안전하게 기록합니다 (실패해도 메인 로직에 영향 없음)
 */
async function logActivity(data: {
    action: string;
    entityType: string;
    entityId: string;
    details: string;
    userId: string;
    projectId?: string;
    taskId?: string | null;
}) {
    try {
        await prisma.activityLog.create({
            data: {
                action: data.action,
                entityType: data.entityType,
                entityId: data.entityId,
                details: data.details,
                userId: data.userId,
                projectId: data.projectId || null,
                taskId: data.taskId || null,
            }
        });
    } catch (err) {
        console.error("[ActivityLog] 로그 기록 실패:", err);
        // 로그 실패는 메인 로직에 영향을 주지 않음
    }
}

export async function createTask(data: {
    title: string;
    content?: string;
    category: string;
    planned: number;
    projectId?: string;
    assigneeId?: string;
    assigneeIds?: string[];  // 복수 담당자
    date: string;
    endDate: string;
    subTasks?: { title: string }[];
}) {
    // 1. 소속 프로젝트가 없는 경우 (개인 업무 캘린더 작성 시) 빈 개인용 프로젝트를 찾아 연결
    // (현재 스키마 구조상 Task는 항상 Project에 속해야 함 - projectId 필수)
    let targetProjectId = data.projectId;

    if (!targetProjectId) {
        // "개인 업무"라는 기본 프로젝트를 찾거나 생성 (담당자 기준)
        if (!data.assigneeId) {
            return { success: false, error: "개인 업무는 담당자 ID가 필요합니다." };
        }

        let personalProject = await prisma.project.findFirst({
            where: {
                creatorId: data.assigneeId,
                name: "개인 업무",
            }
        });

        if (!personalProject) {
            personalProject = await prisma.project.create({
                data: {
                    name: "개인 업무",
                    category: "개인",
                    creatorId: data.assigneeId,
                    startDate: new Date(),
                    endDate: new Date(),
                }
            });
        }
        targetProjectId = personalProject.id;
    }

    try {
        const newTask = await prisma.task.create({
            data: {
                title: data.title,
                description: data.content,
                status: "TODO",
                priority: "MEDIUM",
                planned: data.planned,
                projectId: targetProjectId,
                assigneeId: data.assigneeId || (data.assigneeIds && data.assigneeIds.length > 0 ? data.assigneeIds[0] : undefined),
                // 복수 담당자 (다대다)
                assignees: data.assigneeIds && data.assigneeIds.length > 0
                    ? { connect: data.assigneeIds.map(id => ({ id })) }
                    : data.assigneeId
                        ? { connect: [{ id: data.assigneeId }] }
                        : undefined,
                dueDate: new Date(data.date),
                endDate: new Date(data.endDate),
                subTasks: data.subTasks && data.subTasks.length > 0
                    ? { create: data.subTasks.map(st => ({ title: st.title })) }
                    : undefined,
            },
            include: { subTasks: true, assignees: true },
        });

        // 활동 로그 기록 (별도 try/catch로 메인 로직에 영향 없음)
        if (data.assigneeId) {
            await logActivity({
                action: "업무 생성",
                entityType: "TASK",
                entityId: newTask.id,
                details: `"${data.title}" 업무를 생성했습니다. (기간: ${data.date} ~ ${data.endDate})`,
                userId: data.assigneeId,
                projectId: targetProjectId,
                taskId: newTask.id,
            });
        }

        revalidatePath("/");
        revalidatePath("/admin/tracking");

        return { success: true, data: newTask };
    } catch (error: any) {
        console.error("Failed to create task:", error);
        return { success: false, error: "업무 생성에 실패했습니다." };
    }
}

export async function updateTaskStatus(taskId: string, data: { done: number, isCompleted: boolean }) {
    try {
        const updated = await prisma.task.update({
            where: { id: taskId },
            data: {
                status: data.isCompleted ? "DONE" : "IN_PROGRESS",
                completedAt: data.isCompleted ? new Date() : null,
            },
            include: { assignees: true },
        });

        // 활동 로그 기록 (별도 try/catch로 메인 로직에 영향 없음)
        const logUser = updated.assigneeId || (updated.assignees.length > 0 ? updated.assignees[0].id : null);
        if (logUser) {
            await logActivity({
                action: data.isCompleted ? "업무 완료" : "업무 상태 변경",
                entityType: "TASK",
                entityId: taskId,
                details: data.isCompleted
                    ? `"${updated.title}" 업무를 완료 처리했습니다.`
                    : `"${updated.title}" 업무 상태를 진행 중으로 변경했습니다.`,
                userId: logUser,
                projectId: updated.projectId,
                taskId: taskId,
            });
        }

        revalidatePath("/");
        revalidatePath("/admin/tracking");

        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to update task status:", error);
        return { success: false, error: "상태 업데이트 실패" };
    }
}

export async function deleteTask(taskId: string, userId?: string) {
    try {
        // 삭제 전에 업무 정보를 가져와서 로그에 기록
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { assignee: true }
        });

        if (!task) {
            return { success: false, error: "해당 업무를 찾을 수 없습니다." };
        }

        // 활동 로그 기록 (삭제 전에 기록 — 삭제 후에는 taskId 참조 불가)
        const logUserId = userId || task.assigneeId;
        if (logUserId) {
            await logActivity({
                action: "업무 삭제",
                entityType: "TASK",
                entityId: taskId,
                details: `"${task.title}" 업무를 삭제했습니다.`,
                userId: logUserId,
                projectId: task.projectId,
                taskId: null, // CASCADE로 삭제되므로 null 처리
            });
        }

        // DB에서 삭제
        await prisma.task.delete({
            where: { id: taskId }
        });

        revalidatePath("/");
        revalidatePath("/admin/tracking");

        return { success: true };
    } catch (error) {
        console.error("Failed to delete task:", error);
        return { success: false, error: "업무 삭제에 실패했습니다." };
    }
}

// ====== SubTask CRUD ======

/**
 * 상위 Task의 상태를 SubTask 완료율 기반으로 자동 갱신합니다.
 */
async function recalcTaskStatus(taskId: string) {
    const allSubTasks = await prisma.subTask.findMany({ where: { taskId } });
    if (allSubTasks.length === 0) return;

    const completedCount = allSubTasks.filter(st => st.isCompleted).length;
    const totalCount = allSubTasks.length;

    let newStatus: "TODO" | "IN_PROGRESS" | "DONE" = "TODO";
    let completedAt: Date | null = null;

    if (completedCount === totalCount) {
        newStatus = "DONE";
        completedAt = new Date();
    } else if (completedCount > 0) {
        newStatus = "IN_PROGRESS";
    }

    await prisma.task.update({
        where: { id: taskId },
        data: { status: newStatus, completedAt },
    });
}

export async function addSubTask(taskId: string, data: {
    title: string;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
    endDate?: string;
}) {
    try {
        const subTask = await prisma.subTask.create({
            data: {
                taskId,
                title: data.title,
                description: data.description || null,
                assigneeId: data.assigneeId || null,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                endDate: data.endDate ? new Date(data.endDate) : null,
            },
        });

        revalidatePath("/");
        revalidatePath("/admin/tracking");

        return { success: true, data: subTask };
    } catch (error) {
        console.error("Failed to add sub-task:", error);
        return { success: false, error: "하위 업무 추가에 실패했습니다." };
    }
}

export async function updateSubTask(subTaskId: string, data: {
    title?: string;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
    endDate?: string;
}) {
    try {
        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description || null;
        if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId || null;
        if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
        if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

        const subTask = await prisma.subTask.update({
            where: { id: subTaskId },
            data: updateData,
        });

        revalidatePath("/");
        return { success: true, data: subTask };
    } catch (error) {
        console.error("Failed to update sub-task:", error);
        return { success: false, error: "하위 업무 수정에 실패했습니다." };
    }
}

export async function toggleSubTask(subTaskId: string) {
    try {
        const current = await prisma.subTask.findUnique({ where: { id: subTaskId } });
        if (!current) return { success: false, error: "하위 업무를 찾을 수 없습니다." };

        const newCompleted = !current.isCompleted;
        const subTask = await prisma.subTask.update({
            where: { id: subTaskId },
            data: {
                isCompleted: newCompleted,
                completedAt: newCompleted ? new Date() : null,
                status: newCompleted ? "DONE" : "TODO",  // Phase 3: status 동기화
            },
        });

        // 상위 Task 상태 자동 갱신
        await recalcTaskStatus(current.taskId);

        revalidatePath("/");
        revalidatePath("/admin/tracking");

        return { success: true, data: subTask };
    } catch (error) {
        console.error("Failed to toggle sub-task:", error);
        return { success: false, error: "하위 업무 상태 변경에 실패했습니다." };
    }
}

export async function deleteSubTask(subTaskId: string) {
    try {
        const current = await prisma.subTask.findUnique({ where: { id: subTaskId } });
        if (!current) return { success: false, error: "하위 업무를 찾을 수 없습니다." };

        const taskId = current.taskId;

        await prisma.subTask.delete({ where: { id: subTaskId } });

        // 상위 Task 상태 재계산
        await recalcTaskStatus(taskId);

        revalidatePath("/");
        revalidatePath("/admin/tracking");

        return { success: true };
    } catch (error) {
        console.error("Failed to delete sub-task:", error);
        return { success: false, error: "하위 업무 삭제에 실패했습니다." };
    }
}

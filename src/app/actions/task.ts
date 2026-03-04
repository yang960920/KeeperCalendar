"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createTask(data: {
    title: string;
    content?: string;
    category: string;
    planned: number;
    projectId?: string;
    assigneeId?: string;
    date: string;
    endDate: string;
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
                projectId: targetProjectId,
                assigneeId: data.assigneeId,
                dueDate: new Date(data.date), // 시작일 역할로 사용
                endDate: new Date(data.endDate),
            }
        });

        // 활동 로그 기록
        if (data.assigneeId) {
            await prisma.activityLog.create({
                data: {
                    action: "업무 생성",
                    entityType: "TASK",
                    entityId: newTask.id,
                    details: `"${data.title}" 업무를 생성했습니다. (기간: ${data.date} ~ ${data.endDate})`,
                    userId: data.assigneeId,
                    projectId: targetProjectId,
                    taskId: newTask.id,
                }
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
            }
        });

        // 활동 로그 기록
        if (updated.assigneeId) {
            await prisma.activityLog.create({
                data: {
                    action: data.isCompleted ? "업무 완료" : "업무 상태 변경",
                    entityType: "TASK",
                    entityId: taskId,
                    details: data.isCompleted
                        ? `"${updated.title}" 업무를 완료 처리했습니다.`
                        : `"${updated.title}" 업무 상태를 진행 중으로 변경했습니다.`,
                    userId: updated.assigneeId,
                    projectId: updated.projectId,
                    taskId: taskId,
                }
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
            await prisma.activityLog.create({
                data: {
                    action: "업무 삭제",
                    entityType: "TASK",
                    entityId: taskId,
                    details: `"${task.title}" 업무를 삭제했습니다.`,
                    userId: logUserId,
                    projectId: task.projectId,
                    // taskId는 CASCADE로 삭제되므로 null 처리
                    taskId: null,
                }
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

"use server";

import { prisma } from "@/lib/prisma";

export async function createProject(data: {
    title: string;
    creatorId: string;
    participantIds: string[];
    endDate: string; // ISO 문자열
}) {
    try {
        const newProject = await prisma.project.create({
            data: {
                name: data.title,
                category: "일반",
                creatorId: data.creatorId,
                startDate: new Date(),
                endDate: new Date(data.endDate),
                participants: {
                    connect: data.participantIds.map(userId => ({
                        id: userId
                    }))
                }
            },
            include: {
                participants: true,
            }
        });

        // 활동 로그 기록 (실패해도 프로젝트 생성에 영향 없음)
        try {
            await prisma.activityLog.create({
                data: {
                    action: "프로젝트 생성",
                    entityType: "PROJECT",
                    entityId: newProject.id,
                    details: `"${data.title}" 프로젝트를 생성했습니다. (참여자: ${data.participantIds.length}명, 종료일: ${data.endDate})`,
                    userId: data.creatorId,
                    projectId: newProject.id,
                }
            });
        } catch (logErr) {
            console.error("[ActivityLog] 프로젝트 로그 기록 실패:", logErr);
        }

        return { success: true, data: newProject };
    } catch (error: any) {
        console.error("Failed to create project:", error);
        return { success: false, error: "프로젝트 생성에 실패했습니다." };
    }
}

export async function updateProject(data: {
    projectId: string;
    title?: string;
    endDate?: string;
    userId: string; // 수정을 요청하는 사용자 ID
}) {
    try {
        // 프로젝트 소유권 확인
        const project = await prisma.project.findUnique({
            where: { id: data.projectId },
        });
        if (!project) {
            return { success: false, error: "프로젝트를 찾을 수 없습니다." };
        }
        if (project.creatorId !== data.userId) {
            return { success: false, error: "프로젝트 수정 권한이 없습니다." };
        }

        const updateData: any = {};
        const changes: string[] = [];

        if (data.title && data.title !== project.name) {
            updateData.name = data.title;
            changes.push(`제목: "${project.name}" → "${data.title}"`);
        }
        if (data.endDate) {
            updateData.endDate = new Date(data.endDate);
            changes.push(`종료일: ${project.endDate.toISOString().split("T")[0]} → ${data.endDate}`);
        }

        if (Object.keys(updateData).length === 0) {
            return { success: true, data: project };
        }

        const updated = await prisma.project.update({
            where: { id: data.projectId },
            data: updateData,
            include: { participants: true },
        });

        // 활동 로그
        try {
            await prisma.activityLog.create({
                data: {
                    action: "프로젝트 수정",
                    entityType: "PROJECT",
                    entityId: data.projectId,
                    details: `프로젝트를 수정했습니다. (${changes.join(", ")})`,
                    userId: data.userId,
                    projectId: data.projectId,
                }
            });
        } catch (logErr) {
            console.error("[ActivityLog] 프로젝트 수정 로그 기록 실패:", logErr);
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Failed to update project:", error);
        return { success: false, error: "프로젝트 수정에 실패했습니다." };
    }
}

export async function addProjectParticipants(data: {
    projectId: string;
    participantIds: string[];
    userId: string; // 요청하는 사용자 ID
}) {
    try {
        // 프로젝트 소유권 확인
        const project = await prisma.project.findUnique({
            where: { id: data.projectId },
            include: { participants: true },
        });
        if (!project) {
            return { success: false, error: "프로젝트를 찾을 수 없습니다." };
        }
        if (project.creatorId !== data.userId) {
            return { success: false, error: "참여자 추가 권한이 없습니다." };
        }

        // 이미 참여 중인 사람은 제외
        const existingIds = project.participants.map(p => p.id);
        const newIds = data.participantIds.filter(id => !existingIds.includes(id));

        if (newIds.length === 0) {
            return { success: true, data: project, message: "추가할 새로운 참여자가 없습니다." };
        }

        const updated = await prisma.project.update({
            where: { id: data.projectId },
            data: {
                participants: {
                    connect: newIds.map(id => ({ id }))
                }
            },
            include: { participants: true },
        });

        // 활동 로그
        try {
            await prisma.activityLog.create({
                data: {
                    action: "참여자 추가",
                    entityType: "PROJECT",
                    entityId: data.projectId,
                    details: `프로젝트에 참여자 ${newIds.length}명을 추가했습니다. (${newIds.join(", ")})`,
                    userId: data.userId,
                    projectId: data.projectId,
                }
            });
        } catch (logErr) {
            console.error("[ActivityLog] 참여자 추가 로그 기록 실패:", logErr);
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Failed to add participants:", error);
        return { success: false, error: "참여자 추가에 실패했습니다." };
    }
}

export async function getProjectEndDate(projectId: string) {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { endDate: true },
        });
        if (!project) return { success: false, error: "프로젝트를 찾을 수 없습니다." };
        return { success: true, endDate: project.endDate.toISOString() };
    } catch (error: any) {
        console.error("Failed to get project end date:", error);
        return { success: false, error: "프로젝트 종료일 조회 실패" };
    }
}

export async function closeProject(data: {
    projectId: string;
    userId: string;
    status: "COMPLETED" | "ON_HOLD" | "CANCELLED";
    closeReason: string;
    closeSummary: string;
    closeReportUrl?: string;
    closeReportName?: string;
}) {
    try {
        const project = await prisma.project.findUnique({
            where: { id: data.projectId },
            include: { participants: true },
        });
        if (!project) {
            return { success: false, error: "프로젝트를 찾을 수 없습니다." };
        }
        if (project.creatorId !== data.userId) {
            return { success: false, error: "프로젝트 종료 권한이 없습니다. (생성자만 가능)" };
        }
        if (project.status !== "ACTIVE") {
            return { success: false, error: "이미 종료된 프로젝트입니다." };
        }

        const updated = await prisma.project.update({
            where: { id: data.projectId },
            data: {
                status: data.status,
                closedAt: new Date(),
                closeReason: data.closeReason,
                closeSummary: data.closeSummary,
                closeReportUrl: data.closeReportUrl || null,
                closeReportName: data.closeReportName || null,
            },
            include: { participants: true },
        });

        // 활동 로그
        try {
            await prisma.activityLog.create({
                data: {
                    action: "프로젝트 종료",
                    entityType: "PROJECT",
                    entityId: data.projectId,
                    details: `프로젝트를 종료했습니다. (사유: ${data.closeReason}, 상태: ${data.status}${data.closeReportName ? `, 보고서: ${data.closeReportName}` : ""})`,
                    userId: data.userId,
                    projectId: data.projectId,
                }
            });
        } catch (logErr) {
            console.error("[ActivityLog] 프로젝트 종료 로그 기록 실패:", logErr);
        }

        // 피어 리뷰 알림 (COMPLETED일 때만)
        if (data.status === "COMPLETED") {
            try {
                const allMemberIds = [
                    project.creatorId,
                    ...project.participants.map((p) => p.id),
                ].filter((id, i, arr) => arr.indexOf(id) === i); // 중복 제거

                const { sendPeerReviewNotification } = await import("@/app/actions/notification");
                await sendPeerReviewNotification({
                    recipientIds: allMemberIds,
                    projectName: project.name,
                    projectId: data.projectId,
                });
            } catch (reviewErr) {
                console.error("[Notification] 피어 리뷰 알림 실패:", reviewErr);
            }
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Failed to close project:", error);
        return { success: false, error: "프로젝트 종료에 실패했습니다." };
    }
}

export async function getProjectCloseInfo(projectId: string) {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: {
                status: true,
                closedAt: true,
                closeReason: true,
                closeSummary: true,
                closeReportUrl: true,
                closeReportName: true,
            },
        });
        if (!project) return { success: false, error: "프로젝트를 찾을 수 없습니다." };
        return {
            success: true,
            data: {
                ...project,
                closedAt: project.closedAt?.toISOString() || null,
            },
        };
    } catch (error: any) {
        console.error("Failed to get close info:", error);
        return { success: false, error: "종료 정보 조회 실패" };
    }
}

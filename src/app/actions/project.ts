"use server";

import { prisma } from "@/lib/prisma";

export async function createProject(data: {
    title: string;
    creatorId: string;
    participantIds: string[];
}) {
    try {
        const newProject = await prisma.project.create({
            data: {
                name: data.title,
                category: "일반", // Default category if none provided
                creatorId: data.creatorId,
                startDate: new Date(),
                endDate: new Date(), // Set a default end date, update schema if optional
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

        return { success: true, data: newProject };
    } catch (error: any) {
        console.error("Failed to create project:", error);
        return { success: false, error: "프로젝트 생성에 실패했습니다." };
    }
}

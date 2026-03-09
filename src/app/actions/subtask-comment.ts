"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * 하위업무에 코멘트를 추가합니다.
 */
export async function addSubTaskComment(data: {
    subTaskId: string;
    content: string;
    authorId: string;
}) {
    try {
        const comment = await prisma.subTaskComment.create({
            data: {
                subTaskId: data.subTaskId,
                content: data.content,
                authorId: data.authorId,
            },
            include: {
                author: true,
            },
        });

        revalidatePath("/");
        return {
            success: true,
            data: {
                id: comment.id,
                content: comment.content,
                authorId: comment.authorId,
                authorName: comment.author.name,
                createdAt: comment.createdAt.toISOString(),
            },
        };
    } catch (error) {
        console.error("Failed to add sub-task comment:", error);
        return { success: false, error: "코멘트 추가에 실패했습니다." };
    }
}

/**
 * 하위업무의 코멘트 목록을 가져옵니다.
 */
export async function getSubTaskComments(subTaskId: string) {
    try {
        const comments = await prisma.subTaskComment.findMany({
            where: { subTaskId },
            include: { author: true },
            orderBy: { createdAt: "asc" },
        });

        return {
            success: true,
            data: comments.map((c) => ({
                id: c.id,
                content: c.content,
                authorId: c.authorId,
                authorName: c.author.name,
                createdAt: c.createdAt.toISOString(),
            })),
        };
    } catch (error) {
        console.error("Failed to get sub-task comments:", error);
        return { success: false, error: "코멘트 목록을 가져오지 못했습니다." };
    }
}

/**
 * 코멘트를 삭제합니다 (작성자만 가능).
 */
export async function deleteSubTaskComment(commentId: string, userId: string) {
    try {
        const comment = await prisma.subTaskComment.findUnique({
            where: { id: commentId },
        });

        if (!comment) {
            return { success: false, error: "코멘트를 찾을 수 없습니다." };
        }

        if (comment.authorId !== userId) {
            return { success: false, error: "본인이 작성한 코멘트만 삭제할 수 있습니다." };
        }

        await prisma.subTaskComment.delete({
            where: { id: commentId },
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete sub-task comment:", error);
        return { success: false, error: "코멘트 삭제에 실패했습니다." };
    }
}

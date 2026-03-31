"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── 폴더 생성 ────────────────────────────────────────────────────────────────

export async function createDocFolder(data: {
    name: string;
    creatorId: string;
    parentId?: string;
    projectId?: string;
}) {
    try {
        const folder = await (prisma as any).docFolder.create({
            data: {
                name: data.name,
                creatorId: data.creatorId,
                parentId: data.parentId || null,
                projectId: data.projectId || null,
            },
        });
        revalidatePath("/documents");
        return { success: true, data: folder };
    } catch (error: any) {
        console.error("Failed to create folder:", error);
        return { success: false, error: "폴더 생성에 실패했습니다." };
    }
}

// ─── 폴더 삭제 ────────────────────────────────────────────────────────────────

export async function deleteDocFolder(folderId: string, userId: string) {
    try {
        const folder = await (prisma as any).docFolder.findUnique({
            where: { id: folderId },
        });
        if (!folder) return { success: false, error: "폴더를 찾을 수 없습니다." };
        if (folder.creatorId !== userId) {
            return { success: false, error: "삭제 권한이 없습니다." };
        }
        await (prisma as any).docFolder.delete({ where: { id: folderId } });
        revalidatePath("/documents");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete folder:", error);
        return { success: false, error: "폴더 삭제에 실패했습니다." };
    }
}

// ─── 문서 업로드 등록 (Vercel Blob URL 저장) ─────────────────────────────────

export async function createDocument(data: {
    name: string;
    mimeType?: string;
    size?: number;
    url: string;          // Vercel Blob URL
    uploaderId: string;
    folderId?: string;
    projectId?: string;
    visibility?: "PUBLIC" | "PRIVATE";
    versionNote?: string;
}) {
    try {
        const document = await (prisma as any).document.create({
            data: {
                name: data.name,
                mimeType: data.mimeType || null,
                size: data.size || null,
                currentUrl: data.url,
                uploaderId: data.uploaderId,
                folderId: data.folderId || null,
                projectId: data.projectId || null,
                visibility: data.visibility || "PUBLIC",
                versions: {
                    create: {
                        url: data.url,
                        size: data.size || null,
                        uploaderId: data.uploaderId,
                        note: data.versionNote || "최초 업로드",
                    },
                },
            },
            include: { versions: true },
        });
        revalidatePath("/documents");
        return { success: true, data: document };
    } catch (error: any) {
        console.error("Failed to create document:", error);
        return { success: false, error: "문서 등록에 실패했습니다." };
    }
}

// ─── 문서 버전 추가 ───────────────────────────────────────────────────────────

export async function addDocumentVersion(data: {
    documentId: string;
    url: string;
    size?: number;
    uploaderId: string;
    note?: string;
}) {
    try {
        const version = await (prisma as any).documentVersion.create({
            data: {
                documentId: data.documentId,
                url: data.url,
                size: data.size || null,
                uploaderId: data.uploaderId,
                note: data.note || null,
            },
        });

        // 최신 URL 업데이트
        await (prisma as any).document.update({
            where: { id: data.documentId },
            data: { currentUrl: data.url },
        });

        revalidatePath("/documents");
        return { success: true, data: version };
    } catch (error: any) {
        console.error("Failed to add document version:", error);
        return { success: false, error: "버전 추가에 실패했습니다." };
    }
}

// ─── 문서 삭제 ────────────────────────────────────────────────────────────────

export async function deleteDocument(documentId: string, userId: string) {
    try {
        const doc = await (prisma as any).document.findUnique({
            where: { id: documentId },
        });
        if (!doc) return { success: false, error: "문서를 찾을 수 없습니다." };
        if (doc.uploaderId !== userId) {
            return { success: false, error: "삭제 권한이 없습니다." };
        }
        await (prisma as any).document.delete({ where: { id: documentId } });
        revalidatePath("/documents");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete document:", error);
        return { success: false, error: "문서 삭제에 실패했습니다." };
    }
}

// ─── 자료실 목록 조회 ─────────────────────────────────────────────────────────

export async function getDocuments(userId: string, folderId?: string) {
    try {
        const [folders, documents] = await Promise.all([
            (prisma as any).docFolder.findMany({
                where: { parentId: folderId || null },
                orderBy: { createdAt: "asc" },
            }),
            (prisma as any).document.findMany({
                where: {
                    folderId: folderId || null,
                    OR: [
                        { visibility: "PUBLIC" },
                        { visibility: "PRIVATE", uploaderId: userId },
                    ],
                },
                include: {
                    versions: {
                        orderBy: { createdAt: "desc" },
                        take: 5,
                    },
                },
                orderBy: { updatedAt: "desc" },
            }),
        ]);

        const serialize = (list: any[]) =>
            list.map((d) => ({
                ...d,
                createdAt: d.createdAt.toISOString(),
                updatedAt: d.updatedAt?.toISOString() || null,
                versions: d.versions?.map((v: any) => ({
                    ...v,
                    createdAt: v.createdAt.toISOString(),
                })) || [],
            }));

        return {
            success: true,
            data: {
                folders: folders.map((f: any) => ({
                    ...f,
                    createdAt: f.createdAt.toISOString(),
                })),
                documents: serialize(documents),
            },
        };
    } catch (error: any) {
        console.error("Failed to get documents:", error);
        return { success: false, data: { folders: [], documents: [] } };
    }
}

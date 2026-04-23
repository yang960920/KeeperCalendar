"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

export interface ClientInput {
    name: string;
    bizNo?: string | null;
    ceoName?: string | null;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    memo?: string | null;
}

function normalize(s: string | null | undefined): string {
    return (s || "").replace(/[\s-]/g, "").trim();
}

export async function listClients(options?: { includeDeleted?: boolean; q?: string }) {
    noStore();
    try {
        const where: any = {};
        if (!options?.includeDeleted) where.deletedAt = null;
        if (options?.q?.trim()) {
            const q = options.q.trim();
            where.OR = [
                { name: { contains: q, mode: "insensitive" } },
                { bizNo: { contains: q } },
                { ceoName: { contains: q, mode: "insensitive" } },
                { contactName: { contains: q, mode: "insensitive" } },
            ];
        }
        const items = await prisma.client.findMany({
            where,
            orderBy: [{ deletedAt: "asc" }, { name: "asc" }],
        });
        return { success: true, data: items };
    } catch (error) {
        console.error("Error listing clients:", error);
        return { success: false, error: "거래처 목록을 불러오지 못했습니다." };
    }
}

export async function getClient(id: string) {
    noStore();
    try {
        const client = await prisma.client.findUnique({ where: { id } });
        if (!client) return { success: false, error: "거래처를 찾을 수 없습니다." };
        return { success: true, data: client };
    } catch (error) {
        console.error("Error getting client:", error);
        return { success: false, error: "거래처 조회 중 오류가 발생했습니다." };
    }
}

export async function createClient(input: ClientInput, createdById: string) {
    try {
        const name = input.name?.trim();
        if (!name) return { success: false, error: "상호는 필수입니다." };

        const bizNoClean = normalize(input.bizNo);
        // 중복 체크: 사업자번호가 있을 때만 (상호 + 사업자번호 조합)
        if (bizNoClean) {
            const dup = await prisma.client.findFirst({
                where: {
                    name,
                    bizNo: bizNoClean,
                    deletedAt: null,
                },
            });
            if (dup) {
                return { success: false, error: "동일한 상호·사업자번호 거래처가 이미 존재합니다." };
            }
        }

        const created = await prisma.client.create({
            data: {
                name,
                bizNo: bizNoClean || null,
                ceoName: input.ceoName?.trim() || null,
                contactName: input.contactName?.trim() || null,
                email: input.email?.trim() || null,
                phone: input.phone?.trim() || null,
                address: input.address?.trim() || null,
                memo: input.memo?.trim() || null,
                createdById,
            },
        });
        revalidatePath("/clients");
        return { success: true, data: created };
    } catch (error) {
        console.error("Error creating client:", error);
        return { success: false, error: "거래처 등록 중 오류가 발생했습니다." };
    }
}

export async function updateClient(id: string, input: ClientInput) {
    try {
        const name = input.name?.trim();
        if (!name) return { success: false, error: "상호는 필수입니다." };

        const bizNoClean = normalize(input.bizNo);
        if (bizNoClean) {
            const dup = await prisma.client.findFirst({
                where: {
                    name,
                    bizNo: bizNoClean,
                    deletedAt: null,
                    NOT: { id },
                },
            });
            if (dup) {
                return { success: false, error: "동일한 상호·사업자번호 거래처가 이미 존재합니다." };
            }
        }

        const updated = await prisma.client.update({
            where: { id },
            data: {
                name,
                bizNo: bizNoClean || null,
                ceoName: input.ceoName?.trim() || null,
                contactName: input.contactName?.trim() || null,
                email: input.email?.trim() || null,
                phone: input.phone?.trim() || null,
                address: input.address?.trim() || null,
                memo: input.memo?.trim() || null,
            },
        });
        revalidatePath("/clients");
        return { success: true, data: updated };
    } catch (error) {
        console.error("Error updating client:", error);
        return { success: false, error: "거래처 수정 중 오류가 발생했습니다." };
    }
}

export async function softDeleteClient(id: string) {
    try {
        await prisma.client.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        revalidatePath("/clients");
        return { success: true };
    } catch (error) {
        console.error("Error deleting client:", error);
        return { success: false, error: "거래처 삭제 중 오류가 발생했습니다." };
    }
}

export async function restoreClient(id: string) {
    try {
        await prisma.client.update({
            where: { id },
            data: { deletedAt: null },
        });
        revalidatePath("/clients");
        return { success: true };
    } catch (error) {
        console.error("Error restoring client:", error);
        return { success: false, error: "거래처 복원 중 오류가 발생했습니다." };
    }
}

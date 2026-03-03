"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

// 싱글톤 패턴으로 PrismaClient 생성
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * 모든 사원 목록을 가져옵니다.
 */
export async function getEmployees() {
    try {
        const users = await prisma.user.findMany({
            include: {
                department: true,
            },
            orderBy: {
                createdAt: 'desc',
            }
        });
        return { success: true, data: users };
    } catch (error) {
        console.error("Error fetching employees:", error);
        return { success: false, error: "사원 목록을 불러오는 중 오류가 발생했습니다." };
    }
}

/**
 * 새로운 사원을 등록합니다.
 */
export async function createEmployee(data: {
    name: string;
    birthDate: string;
    role: "CREATOR" | "PARTICIPANT" | "NONE";
}) {
    try {
        // ID 중복 체킹
        const existingUser = await prisma.user.findUnique({
            where: { id: data.name },
        });

        if (existingUser) {
            return { success: false, error: "이미 존재하는 이름(ID)입니다." };
        }

        const newUser = await prisma.user.create({
            data: {
                id: data.name,
                name: data.name,
                password: data.birthDate,
                role: data.role === "NONE" ? "PARTICIPANT" : data.role,
            },
        });

        revalidatePath("/admin/employees");
        return { success: true, data: newUser };
    } catch (error) {
        console.error("Error creating employee:", error);
        return { success: false, error: "사원 등록 중 서버 오류가 발생했습니다." };
    }
}

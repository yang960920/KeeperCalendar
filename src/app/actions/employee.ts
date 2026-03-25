"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

/**
 * 모든 사원 목록을 가져옵니다.
 */
export async function getEmployees() {
    noStore();
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
 * 모든 부서 목록을 가져옵니다.
 */
export async function getDepartments() {
    noStore();
    try {
        const deps = await prisma.department.findMany({
            orderBy: { name: 'asc' }
        });
        return { success: true, data: deps };
    } catch (error) {
        console.error("Error fetching departments:", error);
        return { success: false, error: "부서 목록을 불러오는 중 오류가 발생했습니다." };
    }
}

/**
 * [TEMP/ADMIN] 기본 부서를 초기 세팅합니다.
 * (UI가 없으므로 임시로 호출할 수 있는 서버 액션)
 */
export async function seedDepartments() {
    try {
        const departments = ['대표이사 (CEO)', '경영지원본부', 'R&D센터', '사업총괄본부'];

        for (const name of departments) {
            await prisma.department.upsert({
                where: { name },
                update: {},
                create: { name },
            });
        }

        revalidatePath("/admin/employees");
        return { success: true, message: "부서 시딩 완료" };
    } catch (error) {
        console.error("Error seeding departments:", error);
        return { success: false, error: "부서 시딩 실패" };
    }
}

/**
 * 새로운 사원을 등록합니다.
 */
export async function createEmployee(data: {
    name: string;
    birthDate: string;
    role: "CREATOR" | "PARTICIPANT" | "NONE";
    departmentId?: string;
    resumeUrl?: string;
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
                departmentId: data.departmentId === "none" ? null : data.departmentId,
                resumeUrl: data.resumeUrl || null,
            },
        });

        revalidatePath("/admin/employees");
        return { success: true, data: newUser };
    } catch (error) {
        console.error("Error creating employee:", error);
        return { success: false, error: "사원 등록 중 서버 오류가 발생했습니다." };
    }
}

/**
 * 사원 정보를 수정합니다.
 */
export async function updateEmployee(id: string, data: {
    name?: string;
    role?: "CREATOR" | "PARTICIPANT";
    departmentId?: string | null;
    resumeUrl?: string | null;
}) {
    try {
        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.role && { role: data.role }),
                ...(data.departmentId !== undefined && {
                    departmentId: data.departmentId === "none" ? null : data.departmentId
                }),
                ...(data.resumeUrl !== undefined && { resumeUrl: data.resumeUrl }),
            }
        });
        revalidatePath("/admin/employees");
        return { success: true, data: updatedUser };
    } catch (error) {
        console.error("Error updating employee:", error);
        return { success: false, error: "사원 정보 수정 중 오류가 발생했습니다." };
    }
}

/**
 * 사원을 삭제합니다.
 */
export async function deleteEmployee(id: string) {
    try {
        await prisma.user.delete({
            where: { id }
        });
        revalidatePath("/admin/employees");
        return { success: true };
    } catch (error) {
        console.error("Error deleting employee:", error);
        return { success: false, error: "사원 삭제 중 오류가 발생했습니다. 할당된 업무나 프로젝트가 있는지 확인하세요." };
    }
}
/**
 * 일반 사원 로그인 (ID, PW 검증)
 * 로그인 성공 시 → ActivityLog LOGIN 기록 + 자동 출근 처리
 */
export async function loginUser(id: string, password: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            include: { department: true }
        });

        if (!user) {
            return { success: false, error: "존재하지 않는 아이디(성명)입니다." };
        }

        if (user.password !== password) {
            return { success: false, error: "비밀번호가 일치하지 않습니다." };
        }

        // 로그인 성공 → ActivityLog에 LOGIN 기록
        try {
            await prisma.activityLog.create({
                data: {
                    action: "LOGIN",
                    entityType: "USER",
                    entityId: user.id,
                    details: `${user.name} 로그인`,
                    userId: user.id,
                },
            });
        } catch (logError) {
            console.error("[Login] ActivityLog 기록 실패 (무시):", logError);
        }

        // 자동 출근 처리 (하루 1회)
        try {
            const { autoClockIn } = await import("@/app/actions/attendance");
            await autoClockIn(user.id);
        } catch (clockError) {
            console.error("[Login] 자동 출근 실패 (무시):", clockError);
        }

        // 보안상 비밀번호는 제외하고 반환
        const { password: _, ...userWithoutPassword } = user;
        return { success: true, data: userWithoutPassword };
    } catch (error) {
        console.error("Login Error:", error);
        return { success: false, error: "로그인 처리 중 서버 오류가 발생했습니다." };
    }
}

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import bcrypt from "bcryptjs";
import { createSession, destroySession } from "@/lib/session";

const BCRYPT_ROUNDS = 10;

function looksHashed(value: string): boolean {
    return /^\$2[aby]\$/.test(value);
}

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
        const departments = ['대표이사 (CEO)', '경영지원본부', 'R&D센터', '사업총괄본부', '동탄사업부', '포천사업부'];

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
/**
 * 다음 사원번호를 자동 생성합니다. (H-001, H-002, ...)
 */
async function generateEmployeeCode(): Promise<string> {
    const lastUser = await prisma.user.findFirst({
        where: { employeeCode: { not: null } },
        orderBy: { employeeCode: "desc" },
        select: { employeeCode: true },
    });

    if (!lastUser?.employeeCode) {
        return "H-001";
    }

    const lastNum = parseInt(lastUser.employeeCode.split("-")[1], 10);
    return `H-${String(lastNum + 1).padStart(3, "0")}`;
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

        const employeeCode = await generateEmployeeCode();

        const hashedPassword = await bcrypt.hash(data.birthDate, BCRYPT_ROUNDS);

        const newUser = await prisma.user.create({
            data: {
                id: data.name,
                name: data.name,
                password: hashedPassword,
                employeeCode,
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
 * 기존 사원 중 사원번호가 없는 사원에게 일괄 부여합니다.
 * 입사일(createdAt) 순으로 번호를 부여합니다.
 */
export async function assignEmployeeCodes() {
    try {
        const usersWithoutCode = await prisma.user.findMany({
            where: { employeeCode: null },
            orderBy: { createdAt: "asc" },
        });

        if (usersWithoutCode.length === 0) {
            return { success: true, message: "모든 사원에게 사원번호가 이미 부여되어 있습니다.", assigned: 0 };
        }

        // 현재 가장 높은 번호 확인
        const lastUser = await prisma.user.findFirst({
            where: { employeeCode: { not: null } },
            orderBy: { employeeCode: "desc" },
            select: { employeeCode: true },
        });

        let nextNum = lastUser?.employeeCode
            ? parseInt(lastUser.employeeCode.split("-")[1], 10) + 1
            : 1;

        for (const user of usersWithoutCode) {
            await prisma.user.update({
                where: { id: user.id },
                data: { employeeCode: `H-${String(nextNum).padStart(3, "0")}` },
            });
            nextNum++;
        }

        revalidatePath("/admin/employees");
        return { success: true, message: `${usersWithoutCode.length}명에게 사원번호를 부여했습니다.`, assigned: usersWithoutCode.length };
    } catch (error) {
        console.error("Error assigning employee codes:", error);
        return { success: false, error: "사원번호 부여 중 오류가 발생했습니다." };
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

        let passwordOk = false;
        if (looksHashed(user.password)) {
            passwordOk = await bcrypt.compare(password, user.password);
        } else {
            // 레거시 평문 데이터: 일치 시 즉시 해시로 전환
            if (user.password === password) {
                passwordOk = true;
                const migrated = await bcrypt.hash(password, BCRYPT_ROUNDS);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { password: migrated },
                });
            }
        }

        if (!passwordOk) {
            return { success: false, error: "비밀번호가 일치하지 않습니다." };
        }

        // 서버 세션 쿠키 발급 (HttpOnly, 12h)
        await createSession(user.id, false);

        // 로그인 성공 → ActivityLog 기록 + 자동 출근을 fire-and-forget으로 처리
        // (인증 응답을 빠르게 반환하기 위해 await하지 않음)
        import("@/app/actions/attendance").then(({ autoClockIn }) => {
            Promise.allSettled([
                prisma.activityLog.create({
                    data: {
                        action: "LOGIN",
                        entityType: "USER",
                        entityId: user.id,
                        details: `${user.name} 로그인`,
                        userId: user.id,
                    },
                }),
                autoClockIn(user.id),
            ]).catch((err) => console.error("Login side-effects error:", err));
        });

        // 보안상 비밀번호는 제외하고 반환
        const { password: _, ...userWithoutPassword } = user;
        return { success: true, data: userWithoutPassword };
    } catch (error) {
        console.error("Login Error:", error);
        return { success: false, error: "로그인 처리 중 서버 오류가 발생했습니다." };
    }
}

/**
 * 로그아웃: 서버 세션 쿠키 삭제
 */
export async function logoutUser() {
    await destroySession();
    return { success: true };
}

/**
 * 관리자 비밀번호 초기화 (생년월일 6자리로 리셋)
 * - 관리자 세션이 있는 경우에만 허용
 */
export async function resetEmployeePassword(targetUserId: string, birthDate: string) {
    try {
        const { requireSession } = await import("@/lib/session");
        const session = await requireSession();
        if (!session.isAdmin) {
            return { success: false, error: "관리자만 사용할 수 있습니다." };
        }

        if (!/^\d{6}$/.test(birthDate)) {
            return { success: false, error: "생년월일 6자리를 입력하세요." };
        }

        const hashed = await bcrypt.hash(birthDate, BCRYPT_ROUNDS);
        await prisma.user.update({
            where: { id: targetUserId },
            data: { password: hashed },
        });
        return { success: true };
    } catch (error) {
        console.error("Failed to reset password:", error);
        return { success: false, error: "비밀번호 초기화에 실패했습니다." };
    }
}

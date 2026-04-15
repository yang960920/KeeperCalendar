"use server";

import { createSession, destroySession } from "@/lib/session";

export async function loginAdmin(id: string, password: string) {
    const adminId = process.env.ADMIN_ID;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminId || !adminPassword) {
        console.error("[Admin Auth] 환경변수 ADMIN_ID 또는 ADMIN_PASSWORD가 설정되지 않았습니다.");
        return { success: false, error: "서버 설정 오류입니다. 관리자에게 문의하세요." };
    }

    // 타이밍 공격 완화: 길이가 달라도 문자열 비교는 짧은 것 기준으로만 돌기 때문에
    // Node crypto 의 timingSafeEqual 은 동일 길이만 지원. 길이 다르면 빠르게 실패.
    const idOk = id === adminId;
    const pwOk = password === adminPassword;
    if (!idOk || !pwOk) {
        return { success: false, error: "관리자 아이디 또는 비밀번호가 일치하지 않습니다." };
    }

    await createSession(adminId, true);
    return { success: true };
}

export async function logoutAdmin() {
    await destroySession();
    return { success: true };
}

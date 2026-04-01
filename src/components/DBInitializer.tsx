"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useAdminStore } from "@/store/useAdminStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useProjectStore } from "@/store/useProjectStore";
import { getInitialData } from "@/app/actions/init";

export function DBInitializer() {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const hasHydrated = useAuthStore((state) => state._hasHydrated);
    const checkAuthExpiration = useAuthStore((state) => state.checkExpiration);

    const adminHasHydrated = useAdminStore((state) => state._hasHydrated);
    const checkAdminExpiration = useAdminStore((state) => state.checkExpiration);

    // Hydration 완료 후 세션 만료 체크 (12시간)
    useEffect(() => {
        if (hasHydrated) checkAuthExpiration();
    }, [hasHydrated, checkAuthExpiration]);

    useEffect(() => {
        if (adminHasHydrated) checkAdminExpiration();
    }, [adminHasHydrated, checkAdminExpiration]);

    // Zustand 스토어 액션 직접 추출
    useEffect(() => {
        // Hydration이 끝나고, 로그인된 상태일 때만 DB 동기화 실행
        if (hasHydrated && isAuthenticated && user?.id) {
            async function loadData() {
                try {
                    const res = await getInitialData(user!.id);
                    if (res.success) {
                        // Zustand 스토어 데이터 덮어쓰기
                        useProjectStore.setState({ projects: res.projects });
                        useTaskStore.setState({ tasks: res.tasks });
                    } else {
                        console.error("Failed to load initial DB data", res.error);
                    }
                } catch (err) {
                    console.error("DB Initialization error:", err);
                }
            }
            loadData();
        }
    }, [hasHydrated, isAuthenticated, user?.id]);

    return null; // UI를 렌더링하지 않는 로직 전용 컴포넌트
}


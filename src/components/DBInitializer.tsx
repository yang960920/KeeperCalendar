"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useProjectStore } from "@/store/useProjectStore";
import { getInitialData } from "@/app/actions/init";

export function DBInitializer() {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    // Zustand 스토어 액션 직접 추출
    useEffect(() => {
        if (isAuthenticated && user?.id) {
            async function loadData() {
                const res = await getInitialData(user!.id);
                if (res.success) {
                    // Zustand 스토어 초기화
                    useProjectStore.setState({ projects: res.projects });
                    useTaskStore.setState({ tasks: res.tasks });
                } else {
                    console.error("Failed to load initial DB data", res.error);
                }
            }
            loadData();
        }
    }, [isAuthenticated, user?.id]);

    return null; // UI를 렌더링하지 않는 로직 전용 컴포넌트
}

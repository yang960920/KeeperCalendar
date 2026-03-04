"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { DBInitializer } from "@/components/DBInitializer";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    // Auth Store 직접 연결 (useStore 대신 직접 구독하여 hydration 타이밍 확보)
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const hasHydrated = useAuthStore((state) => state._hasHydrated);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || !hasHydrated) return;

        // zustand store에서 hydrate 처리가 끝난 후
        // 로그인 안 한 사용자가 login이 아닌 다른 페이지에 접속하려 할 때
        // (단, /admin 경로는 자체 인증 시스템을 사용하므로 제외)
        if (isAuthenticated === false && pathname !== "/login" && !pathname.startsWith("/admin")) {
            router.push("/login");
        }
    }, [isAuthenticated, hasHydrated, pathname, router, mounted]);

    // 마운트 + Hydration 완료 전까지 렌더링 방지 (깜빡임 및 빈 화면 완화)
    if (!mounted || !hasHydrated) {
        return null;
    }

    return (
        <>
            <DBInitializer />
            {children}
        </>
    );
}

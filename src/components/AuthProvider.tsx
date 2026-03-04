"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { DBInitializer } from "@/components/DBInitializer";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    // Auth Store 연결 (Hydration 에러 방지를 위한 useStore 커스텀 훅 사용)
    const isAuthenticated = useStore(useAuthStore, (state) => state.isAuthenticated);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // zustand store에서 hydrate 처리가 끝난 후
        // 로그인 안 한 사용자가 login이 아닌 다른 페이지에 접속하려 할 때
        // (단, /admin 경로는 자체 인증 시스템을 사용하므로 제외)
        if (isAuthenticated === false && pathname !== "/login" && !pathname.startsWith("/admin")) {
            router.push("/login");
        }
    }, [isAuthenticated, pathname, router, mounted]);

    // 마운트되기 전 렌더링 방지 (깜빡임 완화용)
    if (!mounted) {
        return null;
    }

    return (
        <>
            <DBInitializer />
            {children}
        </>
    );
}

"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Columns3 } from "lucide-react";

export default function KanbanPage() {
    const user = useStore(useAuthStore, (s) => s.user);

    if (!user) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
                로그인 후 이용 가능합니다.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-8 flex flex-col">
            <header className="border-b pb-5 mb-6">
                <div className="flex items-center gap-2">
                    <Columns3 className="h-6 w-6 text-orange-400" />
                    <h1 className="text-2xl font-extrabold tracking-tight text-primary">
                        칸반 보드
                    </h1>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    내가 담당한 모든 프로젝트 업무를 한눈에 관리하세요.
                </p>
            </header>

            <div className="flex-1">
                <KanbanBoard />
            </div>
        </div>
    );
}

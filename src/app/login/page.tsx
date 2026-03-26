"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useProjectStore } from "@/store/useProjectStore";
import { loginUser } from "@/app/actions/employee";
import { getInitialData } from "@/app/actions/init";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
    const login = useAuthStore((state) => state.login);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const router = useRouter();

    const [id, setId] = useState("");
    const [password, setPassword] = useState("");

    // 로그인된 사용자가 접근하면 루트로 이동
    useEffect(() => {
        if (isAuthenticated) {
            router.push("/");
        }
    }, [isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await loginUser(id, password);
            if (res.success && res.data) {
                // 로그인 성공, Zustand 상태 업데이트
                login({
                    id: res.data.id,
                    name: res.data.name,
                    role: res.data.role as any, // "CREATOR" | "PARTICIPANT"
                });

                // 강제 DB 동기화 (Hydration)
                const initRes = await getInitialData(res.data.id);
                if (initRes.success) {
                    useProjectStore.setState({ projects: initRes.projects });
                    useTaskStore.setState({ tasks: initRes.tasks });
                }

                router.push("/");
            } else {
                alert(res.error || "로그인에 실패했습니다.");
            }
        } catch (error) {
            console.error(error);
            alert("서버 오류가 발생했습니다.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
            <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-lg border">
                {/* 관리자 페이지 바로가기 */}
                <div className="mb-6">
                    <Link href="/admin/login">
                        <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">관리자 로그인 페이지로 이동</span>
                        </div>
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-primary mb-2">Keeper Calendar</h1>
                    <p className="text-sm text-muted-foreground">업무일지 시스템 로그인이 필요합니다</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="id">아이디 (성명)</Label>
                        <Input
                            id="id"
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            required
                            placeholder="예: 양현준"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">비밀번호 (생년월일 6자리)</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="예: 960920"
                        />
                    </div>

                    <Button type="submit" className="w-full mt-6">
                        로그인
                    </Button>
                </form>
            </div>
        </div>
    );
}

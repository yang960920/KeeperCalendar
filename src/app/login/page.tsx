"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { loginUser } from "@/app/actions/employee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";

const LOGIN_TIMEOUT_MS = 20_000; // 20초 타임아웃
const STATUS_MESSAGES = [
    { delay: 0, text: "서버에 연결하고 있습니다..." },
    { delay: 3_000, text: "데이터베이스를 준비하고 있습니다..." },
    { delay: 8_000, text: "첫 접속 시 시간이 걸릴 수 있습니다..." },
    { delay: 15_000, text: "거의 완료되었습니다..." },
];

export default function LoginPage() {
    const login = useAuthStore((state) => state.login);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    const [id, setId] = useState("");
    const [password, setPassword] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const statusTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const clearTimers = useCallback(() => {
        statusTimers.current.forEach(clearTimeout);
        statusTimers.current = [];
    }, []);

    // 이미 로그인된 사용자가 /login 에 직접 접근하면 루트로 이동
    // (로그인 직후 전환은 handleSubmit 안에서 window.location.replace 로 처리)
    useEffect(() => {
        if (isAuthenticated) {
            window.location.replace("/");
        }
    }, [isAuthenticated]);

    // 컴포넌트 언마운트 시 타이머 정리
    useEffect(() => clearTimers, [clearTimers]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        setStatusMessage(STATUS_MESSAGES[0].text);

        // 단계별 상태 메시지 표시
        clearTimers();
        STATUS_MESSAGES.forEach(({ delay, text }) => {
            if (delay > 0) {
                statusTimers.current.push(setTimeout(() => setStatusMessage(text), delay));
            }
        });

        // 타임아웃 처리
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

        try {
            const res = await Promise.race([
                loginUser(id, password),
                new Promise<never>((_, reject) => {
                    controller.signal.addEventListener("abort", () =>
                        reject(new Error("TIMEOUT"))
                    );
                }),
            ]);

            clearTimeout(timeoutId);
            clearTimers();

            if (res.success && res.data) {
                setStatusMessage("로그인 성공!");
                login({
                    id: res.data.id,
                    name: res.data.name,
                    role: res.data.role as any,
                });
                // 콜드 스타트 시 router.replace(소프트 네비)는 RSC 응답을 기다리다 멈춰 보일 수 있음.
                // 하드 네비게이션으로 강제 이동시켜 브라우저가 "/" 진입 진행을 보여주도록 함.
                window.location.replace("/");
                return;
            } else {
                alert(res.error || "로그인에 실패했습니다.");
                setIsSubmitting(false);
                setStatusMessage("");
            }
        } catch (error: any) {
            clearTimeout(timeoutId);
            clearTimers();

            if (error?.message === "TIMEOUT") {
                alert("서버 응답이 지연되고 있습니다. 다시 시도해주세요.");
            } else {
                console.error(error);
                alert("서버 오류가 발생했습니다.");
            }
            setIsSubmitting(false);
            setStatusMessage("");
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
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <img src="/hanmir-logo.png" alt="HanmirWorks" className="h-10 w-10 drop-shadow-sm" />
                        <h1 className="text-2xl font-bold">
                            <span className="bg-gradient-to-r from-[#2563eb] to-[#f97316] bg-clip-text text-transparent">
                                HanmirWorks
                            </span>
                        </h1>
                    </div>
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

                    <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                로그인 중...
                            </span>
                        ) : "로그인"}
                    </Button>

                    {isSubmitting && statusMessage && (
                        <p className="text-center text-sm text-muted-foreground mt-3 animate-pulse">
                            {statusMessage}
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}

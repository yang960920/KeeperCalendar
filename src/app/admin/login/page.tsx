"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminStore } from "@/store/useAdminStore";
import { loginAdmin } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
    const adminLogin = useAdminStore((state) => state.adminLogin);
    const isAdminAuthenticated = useAdminStore((state) => state.isAdminAuthenticated);
    const router = useRouter();

    // 관리자 로그인된 사용자가 접근하면 루트로 이동
    useEffect(() => {
        if (isAdminAuthenticated) {
            router.push("/admin/achievement");
        }
    }, [isAdminAuthenticated, router]);

    const [id, setId] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await loginAdmin(id, password);
            if (result.success) {
                adminLogin();
                router.push("/admin/achievement");
            } else {
                alert(result.error || "관리자 아이디 또는 비밀번호가 일치하지 않습니다.");
            }
        } catch (error) {
            console.error(error);
            alert("서버 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-foreground p-4">
            <div className="w-full max-w-md p-8 bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2">Admin Dashboard</h1>
                    <p className="text-sm text-zinc-400">관리자 로그인이 필요합니다</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="id" className="text-zinc-300">아이디</Label>
                        <Input
                            id="id"
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            required
                            placeholder="관리자 아이디를 입력하세요"
                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-zinc-300">비밀번호</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="비밀번호를 입력하세요"
                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                    </div>

                    <Button type="submit" className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading}>
                        {loading ? "로그인 중..." : "로그인"}
                    </Button>
                </form>

                <div className="mt-4 text-center">
                    <button
                        onClick={() => router.push("/login")}
                        className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        ← 직원 로그인으로 돌아가기
                    </button>
                </div>
            </div>
        </div>
    );
}

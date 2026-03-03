"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminStore } from "@/store/useAdminStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
    const adminLogin = useAdminStore((state) => state.adminLogin);
    const router = useRouter();

    const [id, setId] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // 관리자 하드코딩 인증
        if (id === "hanmirco" && password === "victorhan77#") {
            adminLogin();
            router.push("/admin/achievement"); // 기본 대시보드 탭으로 리디렉트
        } else {
            alert("관리자 아이디 또는 비밀번호가 일치하지 않습니다.");
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

                    <Button type="submit" className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white">
                        로그인
                    </Button>
                </form>
            </div>
        </div>
    );
}

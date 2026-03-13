"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, LayoutDashboardIcon, FolderKanbanIcon, Settings, UserCircle, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { getUserProfile } from "@/app/actions/settings";

export const Navigation = () => {
    const pathname = usePathname() || "/";
    const user = useStore(useAuthStore, (state) => state.user);
    const logout = useAuthStore((state) => state.logout);

    // 로그인 및 관리자 페이지에서는 네비게이션을 숨김
    if (pathname === "/login" || pathname.startsWith("/admin")) return null;

    return (
        <nav className="w-64 border-r bg-card flex flex-col h-full flex-shrink-0">
            <div className="p-6 border-b">
                <h1 className="text-xl font-extrabold tracking-tight text-primary">Keeper Calendar</h1>
            </div>

            <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
                <Link
                    href="/"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                        pathname === "/" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <LayoutDashboardIcon className="h-4 w-4" />
                    <span>월별 일지</span>
                </Link>

                <Link
                    href="/projects"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                        pathname.startsWith("/projects") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <FolderKanbanIcon className="h-4 w-4" />
                    <span>프로젝트</span>
                </Link>

                <Link
                    href="/yearly"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                        pathname === "/yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <CalendarIcon className="h-4 w-4" />
                    <span>연간 히트맵</span>
                </Link>

                <Link
                    href="/settings"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                        pathname === "/settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <Settings className="h-4 w-4" />
                    <span>Keeper Settings</span>
                </Link>
            </div>

            {/* 하단 유저 프로필 및 로그아웃 영역 */}
            {user && (
                <div className="p-4 border-t bg-muted/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <ProfileAvatar userId={user.id} />
                            <div className="flex flex-col truncate">
                                <span className="text-sm font-semibold truncate">{user.name}</span>
                                <span className="text-[10px] text-muted-foreground truncate">
                                    {user.role === "CREATOR" ? "생성자(Admin)" : "참여자(User)"}
                                </span>
                            </div>
                        </div>
                        <button onClick={logout} className="p-2 text-muted-foreground hover:text-red-500 transition-colors" title="로그아웃">
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

// 프로필 아바타 컴포넌트 — auth store에서 직접 읽음
function ProfileAvatar({ userId }: { userId: string }) {
    const user = useStore(useAuthStore, (s) => s.user);
    const setProfileImage = useAuthStore((s) => s.setProfileImage);

    // 최초 마운트 시 DB에서 이미지 로드 (store에 없을 때만)
    useEffect(() => {
        if (user?.profileImageUrl) return;
        getUserProfile(userId).then(res => {
            if (res.success && res.data?.profileImageUrl) {
                setProfileImage(res.data.profileImageUrl);
            }
        });
    }, [userId, user?.profileImageUrl, setProfileImage]);

    if (user?.profileImageUrl) {
        return (
            <img
                src={user.profileImageUrl}
                alt="프로필"
                className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/20"
            />
        );
    }
    return <UserCircle className="h-8 w-8 text-muted-foreground" />;
}

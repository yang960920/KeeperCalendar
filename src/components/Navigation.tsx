"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarIcon, LayoutDashboardIcon, FolderKanbanIcon, Settings, UserCircle, LogOut, ShieldCheck, Columns3, CalendarCheck, FileText, FolderOpen, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useAdminStore } from "@/store/useAdminStore";
import { useStore } from "@/hooks/useStore";
import { getUserProfile } from "@/app/actions/settings";
import { getUnreadChatCount } from "@/app/actions/chat";
import { NotificationBell } from "@/components/NotificationBell";

export const Navigation = () => {
    const pathname = usePathname() || "/";
    const user = useStore(useAuthStore, (state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const isAdminAuth = useStore(useAdminStore, (state) => state.isAdminAuthenticated);

    // 메신저 미읽음 카운트
    const [unreadChatCount, setUnreadChatCount] = useState(0);

    useEffect(() => {
        if (!user) return;
        const fetchCount = () => {
            getUnreadChatCount(user.id).then(res => {
                if (res.success && 'count' in res) {
                    setUnreadChatCount(res.count);
                }
            });
        };
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [user]);

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
                    <Home className="h-4 w-4" />
                    <span>오피스 홈</span>
                </Link>

                <Link
                    href="/monthly"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                        pathname === "/monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
                    href="/kanban"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                        pathname === "/kanban" || pathname.startsWith("/kanban") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <Columns3 className="h-4 w-4" />
                    <span>칸반 보드</span>
                </Link>

                <Link
                    href="/calendar"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                        pathname === "/calendar" || pathname.startsWith("/calendar") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <CalendarCheck className="h-4 w-4" />
                    <span>공유 캘린더</span>
                </Link>

                <Link
                    href="/approvals"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                        pathname === "/approvals" || pathname.startsWith("/approvals") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <FileText className="h-4 w-4" />
                    <span>전자결재</span>
                </Link>

                <Link
                    href="/documents"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                        pathname === "/documents" || pathname.startsWith("/documents") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <FolderOpen className="h-4 w-4" />
                    <span>자료실</span>
                </Link>

                <Link
                    href="/chat"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                        pathname === "/chat" || pathname.startsWith("/chat") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <MessageCircle className="h-4 w-4" />
                    <span>메신저</span>
                    {unreadChatCount > 0 && (
                        <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                            {unreadChatCount > 99 ? '99+' : unreadChatCount}
                        </span>
                    )}
                </Link>

                <Link
                    href="/settings"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                        pathname === "/settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                </Link>

                {/* Admin 탭 — admin 인증 상태일 때만 노출 */}
                {isAdminAuth && (
                    <Link
                        href="/admin/achievement"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Admin</span>
                    </Link>
                )}
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
                        <div className="flex items-center gap-1">
                            <NotificationBell />
                            <button onClick={logout} className="p-2 text-muted-foreground hover:text-red-500 transition-colors" title="로그아웃">
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
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

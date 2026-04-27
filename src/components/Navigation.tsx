"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Home, CalendarIcon, LayoutDashboardIcon, FolderKanbanIcon, Settings, UserCircle, LogOut,
    ShieldCheck, Columns3, CalendarCheck, FileText, FolderOpen, MessageCircle, Building2, Receipt,
    Briefcase, Users, ClipboardList, ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useAdminStore } from "@/store/useAdminStore";
import { useStore } from "@/hooks/useStore";
import { getUserProfile } from "@/app/actions/settings";
import { getUnreadChatCount } from "@/app/actions/chat";
import { logoutUser } from "@/app/actions/employee";
import { NotificationBell } from "@/components/NotificationBell";

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
};

type NavGroup = {
    id: string;
    label: string;
    icon: LucideIcon;
    items: NavItem[];
};

type NavEntry = { kind: "item"; item: NavItem } | { kind: "group"; group: NavGroup };

const STORAGE_KEY = "nav.openGroups.v1";
const DEFAULT_OPEN: string[] = ["work"];

function isActive(href: string, pathname: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
}

const ENTRIES: NavEntry[] = [
    { kind: "item", item: { href: "/", label: "오피스 홈", icon: Home } },
    {
        kind: "group",
        group: {
            id: "work",
            label: "내 업무",
            icon: Briefcase,
            items: [
                { href: "/monthly", label: "월별 일지", icon: LayoutDashboardIcon },
                { href: "/yearly", label: "연간 히트맵", icon: CalendarIcon },
                { href: "/projects", label: "프로젝트", icon: FolderKanbanIcon },
                { href: "/kanban", label: "칸반 보드", icon: Columns3 },
            ],
        },
    },
    {
        kind: "group",
        group: {
            id: "collab",
            label: "협업",
            icon: Users,
            items: [
                { href: "/calendar", label: "공유 캘린더", icon: CalendarCheck },
                { href: "/chat", label: "메신저", icon: MessageCircle },
            ],
        },
    },
    {
        kind: "group",
        group: {
            id: "finance",
            label: "결재 & 거래",
            icon: ClipboardList,
            items: [
                { href: "/approvals", label: "전자결재", icon: FileText },
                { href: "/transaction-statements", label: "거래명세표", icon: Receipt },
                { href: "/clients", label: "거래처 관리", icon: Building2 },
            ],
        },
    },
    { kind: "item", item: { href: "/documents", label: "자료실", icon: FolderOpen } },
    { kind: "item", item: { href: "/settings", label: "Settings", icon: Settings } },
];

export const Navigation = () => {
    const pathname = usePathname() || "/";
    const user = useStore(useAuthStore, (state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const isAdminAuth = useStore(useAdminStore, (state) => state.isAdminAuthenticated);

    // 메신저 미읽음 카운트
    const [unreadChatCount, setUnreadChatCount] = useState(0);

    // 사용자가 토글한 그룹 펼침 상태 (localStorage 영속화)
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

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

    // 펼침 상태 복원: 저장값이 있으면 그것을, 없으면 DEFAULT_OPEN 사용
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved !== null) {
                const arr = JSON.parse(saved);
                if (Array.isArray(arr)) setOpenGroups(new Set(arr.filter((v): v is string => typeof v === "string")));
            } else {
                setOpenGroups(new Set(DEFAULT_OPEN));
            }
        } catch {
            // localStorage 접근 실패는 무시 — 기본 닫힘 상태로 진행
        }
    }, []);

    const toggleGroup = (id: string) => {
        setOpenGroups(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
            } catch {
                // ignore
            }
            return next;
        });
    };

    // 로그인 및 관리자 페이지에서는 네비게이션을 숨김
    if (pathname === "/login" || pathname.startsWith("/admin")) return null;

    const isGroupActive = (group: NavGroup) =>
        group.items.some(it => isActive(it.href, pathname));

    // 현재 경로가 그룹 내부면 강제 펼침 (사용자 토글 상태와 OR)
    const isGroupOpen = (group: NavGroup) =>
        openGroups.has(group.id) || isGroupActive(group);

    const renderItem = (item: NavItem, badge?: number) => {
        const active = isActive(item.href, pathname);
        const Icon = item.icon;
        return (
            <Link
                key={item.href}
                href={item.href}
                className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
            >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {badge !== undefined && badge > 0 && (
                    <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}
            </Link>
        );
    };

    const itemBadge = (href: string): number | undefined =>
        href === "/chat" ? unreadChatCount : undefined;

    return (
        <nav className="w-64 border-r bg-card flex flex-col h-full flex-shrink-0">
            <div className="p-6 border-b">
                <Link href="/" className="flex items-center gap-2.5 group">
                    <img
                        src="/hanmir-logo.png"
                        alt="HanmirWorks"
                        className="h-8 w-8 flex-shrink-0 drop-shadow-sm transition-transform group-hover:scale-105"
                    />
                    <h1 className="text-xl font-extrabold tracking-tight">
                        <span className="bg-gradient-to-r from-[#2563eb] to-[#f97316] bg-clip-text text-transparent">
                            HanmirWorks
                        </span>
                    </h1>
                </Link>
            </div>

            <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
                {ENTRIES.map((entry) => {
                    if (entry.kind === "item") {
                        return renderItem(entry.item, itemBadge(entry.item.href));
                    }
                    const group = entry.group;
                    const open = isGroupOpen(group);
                    const GroupIcon = group.icon;
                    // 그룹이 닫혀 있을 때 헤더에 합산 배지 노출 (현재는 메신저만 해당)
                    const collapsedBadge = !open
                        ? group.items.reduce((sum, it) => sum + (itemBadge(it.href) ?? 0), 0)
                        : 0;
                    return (
                        <div key={group.id} className="space-y-1">
                            <button
                                type="button"
                                onClick={() => toggleGroup(group.id)}
                                aria-expanded={open}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                    "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <GroupIcon className="h-4 w-4" />
                                <span className="flex-1 text-left">{group.label}</span>
                                {collapsedBadge > 0 && (
                                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                                        {collapsedBadge > 99 ? '99+' : collapsedBadge}
                                    </span>
                                )}
                                <ChevronRight
                                    className={cn(
                                        "h-4 w-4 transition-transform duration-200",
                                        open && "rotate-90"
                                    )}
                                />
                            </button>
                            {open && (
                                <div className="ml-3.5 pl-3 border-l border-border/60 space-y-1">
                                    {group.items.map(it => renderItem(it, itemBadge(it.href)))}
                                </div>
                            )}
                        </div>
                    );
                })}

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
                            <button
                                onClick={async () => {
                                    try { await logoutUser(); } catch { /* ignore */ }
                                    logout();
                                }}
                                className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                                title="로그아웃"
                            >
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

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { getUserProfile } from "@/app/actions/settings";
import { getDashboardStats } from "@/app/actions/dashboard";
import { getMyNotifications, markAsRead, markAllAsRead } from "@/app/actions/notification";
import { UserCircle, CalendarCheck, Bell, FolderOpen, CheckCheck, Megaphone, Clock, AlertTriangle, X } from "lucide-react";
import { WidgetPagination, paginate } from "./WidgetPagination";

interface Stats {
    todayTaskCount: number;
    unreadNotifications: number;
    activeProjects: number;
}

interface NotificationItem {
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

export function UserProfileCard() {
    const user = useStore(useAuthStore, (s) => s.user);
    const setProfileImage = useAuthStore((s) => s.setProfileImage);
    const router = useRouter();
    const [stats, setStats] = useState<Stats>({ todayTaskCount: 0, unreadNotifications: 0, activeProjects: 0 });

    // 알림 팝업 상태
    const [showNotifPopup, setShowNotifPopup] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [notifPage, setNotifPage] = useState(1);
    const [loadingNotif, setLoadingNotif] = useState(false);

    useEffect(() => {
        if (!user) return;
        if (!user.profileImageUrl) {
            getUserProfile(user.id).then((res) => {
                if (res.success && res.data?.profileImageUrl) {
                    setProfileImage(res.data.profileImageUrl);
                }
            });
        }
        getDashboardStats(user.id).then((res) => {
            if (res.success && res.data) {
                setStats({
                    todayTaskCount: res.data.todayTasks.length,
                    unreadNotifications: res.data.unreadNotifications,
                    activeProjects: res.data.activeProjects,
                });
            }
        });
    }, [user, user?.profileImageUrl, setProfileImage]);

    const handleAlarmClick = useCallback(async () => {
        if (!user) return;
        setShowNotifPopup((prev) => !prev);
        if (!showNotifPopup) {
            setLoadingNotif(true);
            const res = await getMyNotifications(user.id);
            if (res.success) setNotifications(res.data);
            setLoadingNotif(false);
            setNotifPage(1);
        }
    }, [user, showNotifPopup]);

    const handleRead = async (id: string) => {
        await markAsRead(id);
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        setStats((prev) => ({ ...prev, unreadNotifications: Math.max(0, prev.unreadNotifications - 1) }));
    };

    const handleReadAll = async () => {
        if (!user) return;
        await markAllAsRead(user.id);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setStats((prev) => ({ ...prev, unreadNotifications: 0 }));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "NUDGE": return <Megaphone className="h-3.5 w-3.5 text-red-500" />;
            case "DEADLINE": return <Clock className="h-3.5 w-3.5 text-amber-500" />;
            default: return <AlertTriangle className="h-3.5 w-3.5 text-blue-500" />;
        }
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "방금 전";
        if (mins < 60) return `${mins}분 전`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}시간 전`;
        return `${Math.floor(hours / 24)}일 전`;
    };

    if (!user) return null;

    const { items: notifItems, totalPages: notifTotalPages, currentPage: notifCurrentPage } = paginate(notifications, notifPage);
    const displayCount = stats.unreadNotifications > 99 ? "99+" : stats.unreadNotifications;

    return (
        <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col gap-4 h-full relative">
            {/* 프로필 영역 */}
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => router.push("/settings")}>
                {user.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="프로필" className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20" />
                ) : (
                    <UserCircle className="h-12 w-12 text-muted-foreground" />
                )}
                <div className="flex flex-col">
                    <span className="text-base font-bold">{user.name}</span>
                    <span className="text-xs text-muted-foreground">
                        {user.role === "CREATOR" ? "생성자(Creator)" : "참여자(Participant)"}
                    </span>
                </div>
            </div>

            {/* 빠른 통계 */}
            <div className="grid grid-cols-3 gap-2 mt-auto">
                <button onClick={() => {}} className="focus:outline-none">
                    <StatBadge icon={CalendarCheck} label="오늘 할 일" value={stats.todayTaskCount} color="text-blue-400" />
                </button>
                <button onClick={handleAlarmClick} className="focus:outline-none relative">
                    <StatBadge icon={Bell} label="안 읽은 알림" value={displayCount} color="text-amber-400" />
                </button>
                <button onClick={() => router.push("/projects")} className="focus:outline-none">
                    <StatBadge icon={FolderOpen} label="진행 프로젝트" value={stats.activeProjects} color="text-emerald-400" />
                </button>
            </div>

            {/* 알림 팝업 */}
            {showNotifPopup && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifPopup(false)} />
                    <div className="absolute left-0 bottom-0 translate-y-full w-full max-h-[360px] bg-background border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden mt-1">
                        {/* 헤더 */}
                        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-card">
                            <div className="flex items-center gap-2">
                                <Bell className="h-4 w-4 text-amber-400" />
                                <h4 className="text-sm font-semibold">알림</h4>
                                {stats.unreadNotifications > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                        {displayCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {stats.unreadNotifications > 0 && (
                                    <button onClick={handleReadAll} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                                        <CheckCheck className="h-3 w-3" /> 모두 읽음
                                    </button>
                                )}
                                <button onClick={() => setShowNotifPopup(false)} className="p-1 hover:bg-muted rounded">
                                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                            </div>
                        </div>

                        {/* 알림 목록 */}
                        <div className="flex-1 overflow-y-auto">
                            {loadingNotif ? (
                                <div className="p-6 text-center text-sm text-muted-foreground">로딩 중...</div>
                            ) : notifItems.length === 0 ? (
                                <div className="p-6 text-center text-sm text-muted-foreground">알림이 없습니다</div>
                            ) : (
                                notifItems.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`px-4 py-2.5 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer flex gap-2.5 ${!n.isRead ? "bg-amber-500/5" : ""}`}
                                        onClick={() => !n.isRead && handleRead(n.id)}
                                    >
                                        <div className="mt-0.5">{getIcon(n.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs ${!n.isRead ? "font-semibold" : ""}`}>{n.title}</p>
                                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{n.message}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(n.createdAt)}</p>
                                        </div>
                                        {!n.isRead && <div className="mt-1"><div className="h-2 w-2 rounded-full bg-amber-400" /></div>}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* 페이지네이션 */}
                        <div className="px-4 py-1.5 bg-card border-t">
                            <WidgetPagination currentPage={notifCurrentPage} totalPages={notifTotalPages} onPageChange={setNotifPage} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function StatBadge({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
    return (
        <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-lg font-bold">{value}</span>
            <span className="text-[10px] text-muted-foreground">{label}</span>
        </div>
    );
}

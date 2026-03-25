"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { getUserProfile } from "@/app/actions/settings";
import { getDashboardStats } from "@/app/actions/dashboard";
import { UserCircle, CalendarCheck, Bell, FolderOpen, Briefcase } from "lucide-react";

interface Stats {
    todayTaskCount: number;
    unreadNotifications: number;
    activeProjects: number;
}

export function UserProfileCard() {
    const user = useStore(useAuthStore, (s) => s.user);
    const setProfileImage = useAuthStore((s) => s.setProfileImage);
    const [stats, setStats] = useState<Stats>({ todayTaskCount: 0, unreadNotifications: 0, activeProjects: 0 });

    useEffect(() => {
        if (!user) return;

        // 프로필 이미지
        if (!user.profileImageUrl) {
            getUserProfile(user.id).then((res) => {
                if (res.success && res.data?.profileImageUrl) {
                    setProfileImage(res.data.profileImageUrl);
                }
            });
        }

        // 통계 데이터
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

    if (!user) return null;

    return (
        <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col gap-4">
            {/* 프로필 영역 */}
            <div className="flex items-center gap-3">
                {user.profileImageUrl ? (
                    <img
                        src={user.profileImageUrl}
                        alt="프로필"
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20"
                    />
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
            <div className="grid grid-cols-3 gap-2">
                <StatBadge icon={CalendarCheck} label="오늘 할 일" value={stats.todayTaskCount} color="text-blue-400" />
                <StatBadge icon={Bell} label="안 읽은 알림" value={stats.unreadNotifications} color="text-amber-400" />
                <StatBadge icon={FolderOpen} label="진행 프로젝트" value={stats.activeProjects} color="text-emerald-400" />
            </div>
        </div>
    );
}

function StatBadge({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
    return (
        <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-lg font-bold">{value}</span>
            <span className="text-[10px] text-muted-foreground">{label}</span>
        </div>
    );
}

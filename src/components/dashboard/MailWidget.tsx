"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { getDashboardStats } from "@/app/actions/dashboard";
import { Mail, Bell } from "lucide-react";
import { format } from "date-fns";

interface NotificationItem {
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

export function MailWidget() {
    const user = useStore(useAuthStore, (s) => s.user);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    useEffect(() => {
        if (!user) return;
        getDashboardStats(user.id).then((res) => {
            if (res.success && res.data) {
                setNotifications(
                    res.data.recentNotifications.map((n: any) => ({
                        ...n,
                        createdAt: n.createdAt.toISOString ? n.createdAt.toISOString() : n.createdAt,
                    }))
                );
            }
        });
    }, [user]);

    return (
        <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                <Mail className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-bold">알림</h3>
                <span className="text-[10px] text-muted-foreground ml-auto">향후 메일 위젯으로 교체 예정</span>
            </div>

            {notifications.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    <div className="text-center space-y-2">
                        <Bell className="h-8 w-8 mx-auto opacity-30" />
                        <p>새로운 알림이 없습니다</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 space-y-2 overflow-y-auto">
                    {notifications.map((n) => (
                        <div
                            key={n.id}
                            className={`p-2.5 rounded-lg text-sm transition-colors ${
                                n.isRead ? "bg-muted/30" : "bg-blue-500/10 border border-blue-500/20"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{n.title}</p>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{n.message}</p>
                                </div>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                    {formatTime(n.createdAt)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function formatTime(dateStr: string) {
    try {
        const d = new Date(dateStr);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return format(d, "HH:mm");
        }
        return format(d, "MM-dd");
    } catch {
        return "";
    }
}

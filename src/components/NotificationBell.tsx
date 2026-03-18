"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bell, Check, CheckCheck, Megaphone, Clock, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { getMyNotifications, markAsRead, markAllAsRead, getUnreadCount } from "@/app/actions/notification";
import { Button } from "@/components/ui/button";

interface NotificationItem {
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    senderId?: string;
    createdAt: string;
}

export function NotificationBell() {
    const user = useAuthStore((s) => s.user);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unread, setUnread] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchUnread = useCallback(async () => {
        if (!user) return;
        const count = await getUnreadCount(user.id);
        setUnread(count);
    }, [user]);

    // 30초마다 읽지 않은 알림 수 폴링
    useEffect(() => {
        fetchUnread();
        const interval = setInterval(fetchUnread, 30000);
        return () => clearInterval(interval);
    }, [fetchUnread]);

    const handleOpen = async () => {
        if (!user) return;
        setIsOpen(!isOpen);
        if (!isOpen) {
            setLoading(true);
            const res = await getMyNotifications(user.id);
            if (res.success) {
                setNotifications(res.data);
            }
            setLoading(false);
        }
    };

    const handleRead = async (id: string) => {
        await markAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnread(prev => Math.max(0, prev - 1));
    };

    const handleReadAll = async () => {
        if (!user) return;
        await markAllAsRead(user.id);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnread(0);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "NUDGE": return <Megaphone className="h-4 w-4 text-red-500" />;
            case "DEADLINE": return <Clock className="h-4 w-4 text-amber-500" />;
            default: return <AlertTriangle className="h-4 w-4 text-blue-500" />;
        }
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "방금 전";
        if (mins < 60) return `${mins}분 전`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}시간 전`;
        const days = Math.floor(hours / 24);
        return `${days}일 전`;
    };

    if (!user) return null;

    return (
        <div className="relative">
            <button
                onClick={handleOpen}
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {unread > 99 ? "99+" : unread}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    {/* 배경 오버레이 */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    {/* 드롭다운 */}
                    <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] bg-background border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
                        {/* 헤더 */}
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <h3 className="font-semibold text-sm">알림</h3>
                            {unread > 0 && (
                                <button
                                    onClick={handleReadAll}
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                    <CheckCheck className="h-3 w-3" />
                                    모두 읽음
                                </button>
                            )}
                        </div>

                        {/* 알림 목록 */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center text-sm text-muted-foreground">로딩 중...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-sm text-muted-foreground">알림이 없습니다.</div>
                            ) : (
                                notifications.map(n => (
                                    <div
                                        key={n.id}
                                        className={`px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer flex gap-3 ${
                                            !n.isRead ? "bg-primary/5" : ""
                                        }`}
                                        onClick={() => !n.isRead && handleRead(n.id)}
                                    >
                                        <div className="mt-0.5">{getIcon(n.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!n.isRead ? "font-semibold" : ""}`}>
                                                {n.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                                        </div>
                                        {!n.isRead && (
                                            <div className="mt-1">
                                                <div className="h-2 w-2 rounded-full bg-primary" />
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

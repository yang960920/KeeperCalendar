"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import {
    CalendarCheck,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Users,
    Clock,
    Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCalendarEvents, deleteCalendarEvent, respondToEvent } from "@/app/actions/calendar-event";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { CreateEventDialog } from "@/components/CreateEventDialog";

// ─── 카테고리 색상 맵 ─────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    MEETING:    { label: "회의",  bg: "bg-blue-500/20",    text: "text-blue-400",   dot: "bg-blue-400" },
    FIELD_WORK: { label: "외근",  bg: "bg-emerald-500/20", text: "text-emerald-400",dot: "bg-emerald-400" },
    TRAINING:   { label: "교육",  bg: "bg-purple-500/20",  text: "text-purple-400", dot: "bg-purple-400" },
    VACATION:   { label: "휴가",  bg: "bg-amber-500/20",   text: "text-amber-400",  dot: "bg-amber-400" },
    OTHER:      { label: "기타",  bg: "bg-slate-500/20",   text: "text-slate-400",  dot: "bg-slate-400" },
};

const RESPONSE_CONFIG: Record<string, { label: string; color: string }> = {
    ACCEPTED:  { label: "수락",  color: "text-emerald-400" },
    DECLINED:  { label: "거절",  color: "text-red-400" },
    TENTATIVE: { label: "미정",  color: "text-amber-400" },
    PENDING:   { label: "미응답", color: "text-muted-foreground" },
    CREATOR:   { label: "주최자", color: "text-primary" },
};

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface CalendarEventData {
    id: string;
    title: string;
    description?: string;
    category: string;
    startTime: string;
    endTime: string;
    isAllDay: boolean;
    location?: string;
    creatorId: string;
    creatorName?: string;
    requiresRsvp: boolean;
    recurrenceType: string;
    attendees: { userId: string; response: string }[];
    myResponse: string;
}

// ─── EventDetailPopover ───────────────────────────────────────────────────────

function EventDetailPopover({
    event,
    currentUserId,
    onClose,
    onDelete,
    onRespond,
}: {
    event: CalendarEventData;
    currentUserId: string;
    onClose: () => void;
    onDelete: (id: string) => void;
    onRespond: (id: string, response: "ACCEPTED" | "DECLINED" | "TENTATIVE") => void;
}) {
    const cat = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.OTHER;
    const isCreator = event.creatorId === currentUserId;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-card border rounded-2xl shadow-2xl p-5 w-full max-w-sm"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Badge className={`${cat.bg} ${cat.text} border-0 text-xs`}>
                                {cat.label}
                            </Badge>
                            {event.requiresRsvp ? (
                                <Badge className="bg-indigo-500/20 text-indigo-400 border-0 text-[10px]">참석확인</Badge>
                            ) : event.attendees.length > 0 ? (
                                <Badge className="bg-slate-500/20 text-slate-400 border-0 text-[10px]">공지</Badge>
                            ) : null}
                        </div>
                        <h3 className="font-bold text-base leading-tight">{event.title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground text-lg leading-none ml-2"
                    >
                        ×
                    </button>
                </div>

                {/* 상세 정보 */}
                <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                            {event.isAllDay
                                ? "종일"
                                : `${format(new Date(event.startTime), "M/d HH:mm")} ~ ${format(new Date(event.endTime), "HH:mm")}`}
                        </span>
                    </div>
                    {event.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{event.location}</span>
                        </div>
                    )}
                    {event.description && (
                        <p className="text-muted-foreground text-xs bg-muted/50 rounded-lg p-2.5">
                            {event.description}
                        </p>
                    )}
                </div>

                {/* 참석자 목록 */}
                {event.attendees.length > 0 && (
                    <div className="mb-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                            <Users className="h-3.5 w-3.5" />
                            <span>
                                {event.requiresRsvp ? "참석자" : "대상자"} {event.attendees.length}명
                                {event.requiresRsvp && (
                                    <span className="ml-1.5 text-[10px]">
                                        (수락 {event.attendees.filter(a => a.response === "ACCEPTED").length} / 거절 {event.attendees.filter(a => a.response === "DECLINED").length} / 미응답 {event.attendees.filter(a => a.response === "PENDING").length})
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {event.attendees.map((a) => {
                                if (event.requiresRsvp) {
                                    const resp = RESPONSE_CONFIG[a.response] || RESPONSE_CONFIG.PENDING;
                                    return (
                                        <div
                                            key={a.userId}
                                            className="inline-flex items-center gap-1 bg-muted/60 rounded-full px-2 py-0.5 text-xs"
                                        >
                                            <span className="font-medium">{a.userId}</span>
                                            <span className={`${resp.color} text-[10px]`}>({resp.label})</span>
                                        </div>
                                    );
                                }
                                return (
                                    <div
                                        key={a.userId}
                                        className="inline-flex items-center bg-muted/60 rounded-full px-2 py-0.5 text-xs"
                                    >
                                        <span className="font-medium">{a.userId}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 액션 버튼 */}
                <div className="flex items-center gap-2 flex-wrap">
                    {!isCreator && event.requiresRsvp && (
                        <>
                            <Button
                                size="sm"
                                variant={event.myResponse === "ACCEPTED" ? "default" : "outline"}
                                className="flex-1 h-7 text-xs"
                                onClick={() => onRespond(event.id, "ACCEPTED")}
                            >
                                수락
                            </Button>
                            <Button
                                size="sm"
                                variant={event.myResponse === "TENTATIVE" ? "default" : "outline"}
                                className="flex-1 h-7 text-xs"
                                onClick={() => onRespond(event.id, "TENTATIVE")}
                            >
                                미정
                            </Button>
                            <Button
                                size="sm"
                                variant={event.myResponse === "DECLINED" ? "destructive" : "outline"}
                                className="flex-1 h-7 text-xs"
                                onClick={() => onRespond(event.id, "DECLINED")}
                            >
                                거절
                            </Button>
                        </>
                    )}
                    {!isCreator && !event.requiresRsvp && (
                        <p className="text-[11px] text-muted-foreground flex-1">공지 일정 (참석 확인 불필요)</p>
                    )}
                    {isCreator && (
                        <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs ml-auto"
                            onClick={() => { onDelete(event.id); onClose(); }}
                        >
                            삭제
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── SharedCalendar (main) ────────────────────────────────────────────────────

export function SharedCalendar() {
    const user = useStore(useAuthStore, (s) => s.user);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEventData[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    const loadEvents = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const result = await getCalendarEvents(user.id, year, month);
            if (result.success) {
                setEvents(result.data as CalendarEventData[]);
            }
        } finally {
            setIsLoading(false);
        }
    }, [user, year, month]);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    // 캘린더 날짜 배열
    const calendarDays = useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        const days = eachDayOfInterval({ start, end });
        // 앞에 빈 칸 채우기 (월요일 시작)
        const startDayOfWeek = (getDay(start) + 6) % 7; // 0=월, 6=일
        const blank = Array.from({ length: startDayOfWeek }, () => null);
        return [...blank, ...days];
    }, [currentDate]);

    // 필터링된 이벤트
    const filteredEvents = useMemo(() => {
        if (categoryFilter === "ALL") return events;
        return events.filter((e) => e.category === categoryFilter);
    }, [events, categoryFilter]);

    // 날짜별 이벤트 맵
    const eventsByDay = useMemo(() => {
        const map: Record<string, CalendarEventData[]> = {};
        for (const event of filteredEvents) {
            const dateKey = format(new Date(event.startTime), "yyyy-MM-dd");
            if (!map[dateKey]) map[dateKey] = [];
            map[dateKey].push(event);
        }
        return map;
    }, [filteredEvents]);

    const handleDelete = async (id: string) => {
        if (!user) return;
        const result = await deleteCalendarEvent(id, user.id);
        if (result.success) {
            setEvents((prev) => prev.filter((e) => e.id !== id));
        }
    };

    const handleRespond = async (id: string, response: "ACCEPTED" | "DECLINED" | "TENTATIVE") => {
        if (!user) return;
        const result = await respondToEvent(id, user.id, response);
        if (result.success) {
            setEvents((prev) =>
                prev.map((e) =>
                    e.id === id ? { ...e, myResponse: response } : e
                )
            );
            setSelectedEvent((prev) =>
                prev?.id === id ? { ...prev, myResponse: response } : prev
            );
        }
    };

    if (!user) return null;

    const weekdays = ["월", "화", "수", "목", "금", "토", "일"];

    return (
        <div className="flex flex-col h-full">
            {/* 헤더: 월 이동 + 일정 생성 버튼 */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setCurrentDate((d) => subMonths(d, 1))}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <h2 className="text-lg font-bold w-32 text-center">
                        {format(currentDate, "yyyy년 M월", { locale: ko })}
                    </h2>
                    <button
                        onClick={() => setCurrentDate((d) => addMonths(d, 1))}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="text-xs text-muted-foreground hover:text-foreground border rounded-md px-2 py-1 transition-colors"
                    >
                        오늘
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {/* 카테고리 필터 */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFilterMenu(!showFilterMenu)}
                            className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors ${
                                categoryFilter !== "ALL"
                                    ? "border-primary text-primary bg-primary/10"
                                    : "text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                            }`}
                        >
                            <Filter className="h-3.5 w-3.5" />
                            {categoryFilter === "ALL"
                                ? "전체"
                                : CATEGORY_CONFIG[categoryFilter]?.label || categoryFilter}
                        </button>
                        {showFilterMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                                <div className="absolute right-0 top-full mt-1 z-50 bg-card border rounded-lg shadow-lg py-1 min-w-[120px]">
                                    <button
                                        onClick={() => { setCategoryFilter("ALL"); setShowFilterMenu(false); }}
                                        className={`w-full text-left text-xs px-3 py-1.5 hover:bg-muted transition-colors ${
                                            categoryFilter === "ALL" ? "text-primary font-semibold" : ""
                                        }`}
                                    >
                                        전체 보기
                                    </button>
                                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                                        <button
                                            key={key}
                                            onClick={() => { setCategoryFilter(key); setShowFilterMenu(false); }}
                                            className={`w-full text-left text-xs px-3 py-1.5 hover:bg-muted transition-colors flex items-center gap-2 ${
                                                categoryFilter === key ? "text-primary font-semibold" : ""
                                            }`}
                                        >
                                            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                            {cfg.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <CreateEventDialog
                        currentUserId={user.id}
                        onCreated={loadEvents}
                    />
                </div>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 mb-1">
                {weekdays.map((d, i) => (
                    <div
                        key={d}
                        className={`text-center text-xs font-semibold py-2 ${
                            i === 5 ? "text-blue-400" : i === 6 ? "text-red-400" : "text-muted-foreground"
                        }`}
                    >
                        {d}
                    </div>
                ))}
            </div>

            {/* 캘린더 그리드 */}
            <div className="grid grid-cols-7 flex-1 gap-px bg-border rounded-xl overflow-hidden">
                {calendarDays.map((day, idx) => {
                    if (!day) {
                        return <div key={`blank-${idx}`} className="bg-background min-h-[100px]" />;
                    }
                    const dateKey = format(day, "yyyy-MM-dd");
                    const dayEvents = eventsByDay[dateKey] || [];
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const dayOfWeek = (getDay(day) + 6) % 7; // 0=월,6=일

                    return (
                        <div
                            key={dateKey}
                            className={`bg-background p-1.5 min-h-[100px] flex flex-col ${
                                !isCurrentMonth ? "opacity-40" : ""
                            }`}
                        >
                            <span
                                className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                                    isToday
                                        ? "bg-primary text-primary-foreground"
                                        : dayOfWeek === 5
                                        ? "text-blue-400"
                                        : dayOfWeek === 6
                                        ? "text-red-400"
                                        : "text-muted-foreground"
                                }`}
                            >
                                {format(day, "d")}
                            </span>

                            <div className="flex flex-col gap-0.5 flex-1">
                                {dayEvents.slice(0, 2).map((event) => {
                                    const cat = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.OTHER;
                                    return (
                                        <button
                                            key={event.id}
                                            onClick={() => setSelectedEvent(event)}
                                            className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate ${cat.bg} ${cat.text} hover:brightness-110 transition-all`}
                                        >
                                            {event.title}
                                        </button>
                                    );
                                })}
                                {dayEvents.length > 2 && (
                                    <span className="text-[9px] text-muted-foreground px-1">
                                        +{dayEvents.length - 2}개 더
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 일정 상세 팝오버 */}
            {selectedEvent && (
                <EventDetailPopover
                    event={selectedEvent}
                    currentUserId={user.id}
                    onClose={() => setSelectedEvent(null)}
                    onDelete={handleDelete}
                    onRespond={handleRespond}
                />
            )}
        </div>
    );
}

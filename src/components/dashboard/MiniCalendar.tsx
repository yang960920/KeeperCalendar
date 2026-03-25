"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { getTaskDatesForMonth } from "@/app/actions/dashboard";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

export function MiniCalendar() {
    const user = useStore(useAuthStore, (s) => s.user);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [taskDates, setTaskDates] = useState<Set<string>>(new Set());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    useEffect(() => {
        if (!user) return;
        getTaskDatesForMonth(user.id, year, month).then((res) => {
            if (res.success && res.data) {
                setTaskDates(new Set(res.data));
            }
        });
    }, [user, year, month]);

    const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month, 1));
    const goToday = () => setCurrentDate(new Date());

    // 달력 생성
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0=일요일
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const weeks: (number | null)[][] = [];
    let week: (number | null)[] = Array(firstDay).fill(null);

    for (let d = 1; d <= daysInMonth; d++) {
        week.push(d);
        if (week.length === 7) {
            weeks.push(week);
            week = [];
        }
    }
    if (week.length > 0) {
        while (week.length < 7) week.push(null);
        weeks.push(week);
    }

    const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

    return (
        <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-orange-400" />
                <h3 className="text-sm font-bold">일정</h3>
            </div>

            {/* 월 네비게이션 */}
            <div className="flex items-center justify-between mb-2">
                <button onClick={prevMonth} className="p-1 hover:bg-muted rounded transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold">{year}년 {month}월</span>
                <div className="flex items-center gap-1">
                    <button onClick={goToday} className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors">
                        오늘
                    </button>
                    <button onClick={nextMonth} className="p-1 hover:bg-muted rounded transition-colors">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
                {dayLabels.map((d, i) => (
                    <div
                        key={d}
                        className={`text-center text-[10px] font-medium py-0.5 ${
                            i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"
                        }`}
                    >
                        {d}
                    </div>
                ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="flex-1">
                {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-0.5">
                        {week.map((day, di) => {
                            if (!day) return <div key={di} className="h-7" />;

                            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                            const isToday = dateStr === todayStr;
                            const hasTask = taskDates.has(dateStr);

                            return (
                                <div
                                    key={di}
                                    className={`relative h-7 flex items-center justify-center text-xs rounded cursor-default transition-colors ${
                                        isToday
                                            ? "bg-primary text-primary-foreground font-bold"
                                            : "hover:bg-muted"
                                    } ${di === 0 ? "text-red-400" : di === 6 ? "text-blue-400" : ""}`}
                                >
                                    {day}
                                    {hasTask && !isToday && (
                                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

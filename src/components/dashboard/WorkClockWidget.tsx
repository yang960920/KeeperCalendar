"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { getTodayAttendance, clockOut } from "@/app/actions/attendance";
import { Clock, LogIn, LogOut, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";

type AttendanceStatus = "NOT_CLOCKED_IN" | "CLOCKED_IN" | "CLOCKED_OUT";

export function WorkClockWidget() {
    const user = useStore(useAuthStore, (s) => s.user);
    const [time, setTime] = useState(new Date());
    const [status, setStatus] = useState<AttendanceStatus>("NOT_CLOCKED_IN");
    const [clockInTime, setClockInTime] = useState<Date | null>(null);
    const [clockOutTimeStr, setClockOutTimeStr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!user) return;
        getTodayAttendance(user.id).then((res) => {
            if (res.success && res.data) {
                const ci = new Date(res.data.clockIn);
                setClockInTime(ci);
                if (res.data.clockOut) {
                    const co = new Date(res.data.clockOut);
                    setClockOutTimeStr(co.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
                    setStatus("CLOCKED_OUT");
                } else {
                    setStatus("CLOCKED_IN");
                }
            } else {
                setStatus("NOT_CLOCKED_IN");
            }
        });
    }, [user]);

    const handleClockOut = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await clockOut(user.id);
            if (res.success) {
                setStatus("CLOCKED_OUT");
                setClockOutTimeStr(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
            } else {
                alert(res.error);
            }
        } finally {
            setLoading(false);
        }
    }, [user]);

    const getElapsedTime = () => {
        if (!clockInTime || status !== "CLOCKED_IN") return null;
        const diffMs = time.getTime() - clockInTime.getTime();
        const hours = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        return `${hours}시간 ${mins}분`;
    };

    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();
    const elapsed = getElapsedTime();

    // 아날로그 시계 각도
    const hourDeg = ((hours % 12) + minutes / 60) * 30;
    const minDeg = (minutes + seconds / 60) * 6;
    const secDeg = seconds * 6;

    return (
        <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold">근무 체크</h3>
                <div className="ml-auto"><StatusBadge status={status} /></div>
            </div>

            {/* 아날로그 + 디지털 시계 */}
            <div className="flex items-center justify-center gap-4 flex-1">
                {/* 아날로그 시계 (SVG) */}
                <div className="relative">
                    <svg width="120" height="120" viewBox="0 0 120 120" className="drop-shadow-lg">
                        {/* 외곽 */}
                        <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/20" />
                        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/10" />

                        {/* 시간 눈금 */}
                        {Array.from({ length: 12 }).map((_, i) => {
                            const angle = (i * 30 - 90) * (Math.PI / 180);
                            const x1 = 60 + 48 * Math.cos(angle);
                            const y1 = 60 + 48 * Math.sin(angle);
                            const x2 = 60 + 42 * Math.cos(angle);
                            const y2 = 60 + 42 * Math.sin(angle);
                            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={i % 3 === 0 ? "2.5" : "1"} className="text-muted-foreground" stroke="currentColor" />;
                        })}

                        {/* 분 눈금 */}
                        {Array.from({ length: 60 }).map((_, i) => {
                            if (i % 5 === 0) return null;
                            const angle = (i * 6 - 90) * (Math.PI / 180);
                            const x1 = 60 + 48 * Math.cos(angle);
                            const y1 = 60 + 48 * Math.sin(angle);
                            const x2 = 60 + 46 * Math.cos(angle);
                            const y2 = 60 + 46 * Math.sin(angle);
                            return <line key={`m${i}`} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="0.5" className="text-muted-foreground/30" stroke="currentColor" />;
                        })}

                        {/* 시침 */}
                        <line
                            x1="60" y1="60"
                            x2={60 + 28 * Math.cos((hourDeg - 90) * (Math.PI / 180))}
                            y2={60 + 28 * Math.sin((hourDeg - 90) * (Math.PI / 180))}
                            strokeWidth="3" strokeLinecap="round" className="text-foreground" stroke="currentColor"
                        />
                        {/* 분침 */}
                        <line
                            x1="60" y1="60"
                            x2={60 + 38 * Math.cos((minDeg - 90) * (Math.PI / 180))}
                            y2={60 + 38 * Math.sin((minDeg - 90) * (Math.PI / 180))}
                            strokeWidth="2" strokeLinecap="round" className="text-foreground" stroke="currentColor"
                        />
                        {/* 초침 */}
                        <line
                            x1="60" y1="60"
                            x2={60 + 42 * Math.cos((secDeg - 90) * (Math.PI / 180))}
                            y2={60 + 42 * Math.sin((secDeg - 90) * (Math.PI / 180))}
                            strokeWidth="1" strokeLinecap="round" className="text-cyan-400" stroke="currentColor"
                        />
                        {/* 중심 점 */}
                        <circle cx="60" cy="60" r="3" className="fill-cyan-400" />
                        <circle cx="60" cy="60" r="1.5" className="fill-background" />
                    </svg>
                </div>

                {/* 디지털 시계 + 정보 */}
                <div className="flex flex-col items-center gap-1.5">
                    <div className="text-2xl font-mono font-bold tracking-wider">
                        <span>{String(hours).padStart(2, "0")}</span>
                        <span className="animate-pulse">:</span>
                        <span>{String(minutes).padStart(2, "0")}</span>
                        <span className="text-muted-foreground text-lg">:{String(seconds).padStart(2, "0")}</span>
                    </div>

                    {elapsed && <p className="text-[11px] text-primary/70">근무 {elapsed}</p>}

                    <div className="space-y-0.5 text-[11px] text-muted-foreground">
                        {clockInTime && (
                            <span className="flex items-center gap-1">
                                <LogIn className="h-3 w-3 text-emerald-400" /> 출근 {clockInTime.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                        )}
                        {clockOutTimeStr && (
                            <span className="flex items-center gap-1">
                                <LogOut className="h-3 w-3 text-orange-400" /> 퇴근 {clockOutTimeStr}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* 하단 */}
            <div className="mt-auto pt-2">
                {status === "CLOCKED_IN" && (
                    <Button variant="outline" size="sm" onClick={handleClockOut} disabled={loading} className="w-full text-xs">
                        <LogOut className="h-3 w-3 mr-1" />
                        {loading ? "처리 중..." : "퇴근하기"}
                    </Button>
                )}
                {status === "NOT_CLOCKED_IN" && (
                    <div className="w-full text-center text-xs text-muted-foreground">
                        <Coffee className="h-4 w-4 mx-auto mb-1 opacity-50" />
                        로그인 시 자동 출근됩니다
                    </div>
                )}
                {status === "CLOCKED_OUT" && (
                    <div className="w-full text-center text-xs text-emerald-400">✓ 오늘 근무 완료</div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
    if (status === "CLOCKED_IN") return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">출근 중</span>;
    if (status === "CLOCKED_OUT") return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/20 text-orange-400">퇴근</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-500/20 text-zinc-400">출근 전</span>;
}

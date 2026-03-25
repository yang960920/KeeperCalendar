"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { getTodayAttendance } from "@/app/actions/attendance";
import { clockOut } from "@/app/actions/attendance";
import { Clock, LogIn, LogOut, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";

type AttendanceStatus = "NOT_CLOCKED_IN" | "CLOCKED_IN" | "CLOCKED_OUT";

export function WorkClockWidget() {
    const user = useStore(useAuthStore, (s) => s.user);
    const [time, setTime] = useState(new Date());
    const [status, setStatus] = useState<AttendanceStatus>("NOT_CLOCKED_IN");
    const [clockInTime, setClockInTime] = useState<string | null>(null);
    const [clockOutTime, setClockOutTime] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // 실시간 시계
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 출퇴근 상태 조회
    useEffect(() => {
        if (!user) return;
        getTodayAttendance(user.id).then((res) => {
            if (res.success && res.data) {
                const ci = new Date(res.data.clockIn);
                setClockInTime(ci.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
                if (res.data.clockOut) {
                    const co = new Date(res.data.clockOut);
                    setClockOutTime(co.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
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
                const co = new Date();
                setClockOutTime(co.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
            } else {
                alert(res.error);
            }
        } finally {
            setLoading(false);
        }
    }, [user]);

    const hours = time.getHours().toString().padStart(2, "0");
    const minutes = time.getMinutes().toString().padStart(2, "0");
    const seconds = time.getSeconds().toString().padStart(2, "0");

    return (
        <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold">근무 체크</h3>
            </div>

            {/* 상태 뱃지 */}
            <div className="flex justify-center mb-2">
                <StatusBadge status={status} />
            </div>

            {/* 시계 */}
            <div className="text-center mb-3">
                <div className="text-3xl font-mono font-bold tracking-wider">
                    <span>{hours}</span>
                    <span className="animate-pulse">:</span>
                    <span>{minutes}</span>
                    <span className="animate-pulse">:</span>
                    <span className="text-muted-foreground">{seconds}</span>
                </div>
            </div>

            {/* 출퇴근 시간 */}
            <div className="flex justify-center gap-4 text-xs text-muted-foreground mb-3">
                {clockInTime && (
                    <span className="flex items-center gap-1">
                        <LogIn className="h-3 w-3 text-emerald-400" /> 출근 {clockInTime}
                    </span>
                )}
                {clockOutTime && (
                    <span className="flex items-center gap-1">
                        <LogOut className="h-3 w-3 text-orange-400" /> 퇴근 {clockOutTime}
                    </span>
                )}
            </div>

            {/* 퇴근 버튼 */}
            <div className="mt-auto flex gap-2">
                {status === "CLOCKED_IN" && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClockOut}
                        disabled={loading}
                        className="w-full text-xs"
                    >
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
                    <div className="w-full text-center text-xs text-emerald-400">
                        ✓ 오늘 근무 완료
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
    if (status === "CLOCKED_IN") {
        return <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400">출근 중</span>;
    }
    if (status === "CLOCKED_OUT") {
        return <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/20 text-orange-400">퇴근</span>;
    }
    return <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-500/20 text-zinc-400">출근 전</span>;
}

"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DayRecord {
    clockIn: string;
    clockOut: string | null;
    status: string;
}

interface UserMonthlyData {
    userId: string;
    name: string;
    department: string;
    days: Record<number, DayRecord | null>;
    summary: {
        totalWorkTime: string;
        totalMinutes: number;
        lateCount: number;
        absentCount: number;
    };
}

export function MonthlyAttendanceTable({
    data,
    daysInMonth,
    year,
    month,
    onYearChange,
    onMonthChange,
}: {
    data: UserMonthlyData[];
    daysInMonth: number;
    year: number;
    month: number;
    onYearChange: (y: number) => void;
    onMonthChange: (m: number) => void;
}) {
    const [selectedUser, setSelectedUser] = useState<string | null>(null);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    const formatTime = (iso: string | null) => {
        if (!iso) return "-";
        return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    };

    const getDayCellClass = (record: DayRecord | null) => {
        if (!record) return "text-zinc-600";
        if (record.status === "LATE") return "text-amber-400";
        return "text-emerald-400";
    };

    const handleCSVDownload = () => {
        const rows: string[] = [];
        rows.push(`이름,부서,${Array.from({ length: daysInMonth }, (_, i) => `${i + 1}일 출근`).join(",")},${Array.from({ length: daysInMonth }, (_, i) => `${i + 1}일 퇴근`).join(",")},총 근무시간,지각,결근`);

        for (const user of data) {
            const clockIns = Array.from({ length: daysInMonth }, (_, i) => formatTime(user.days[i + 1]?.clockIn || null));
            const clockOuts = Array.from({ length: daysInMonth }, (_, i) => formatTime(user.days[i + 1]?.clockOut || null));
            rows.push(`${user.name},${user.department},${clockIns.join(",")},${clockOuts.join(",")},${user.summary.totalWorkTime},${user.summary.lateCount},${user.summary.absentCount}`);
        }

        const bom = "\uFEFF";
        const blob = new Blob([bom + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `근태리포트_${year}년${month}월.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const selectedUserData = selectedUser ? data.find(d => d.userId === selectedUser) : null;

    return (
        <div className="space-y-4">
            {/* 상단: 연/월 선택 + CSV */}
            <div className="flex items-center gap-3">
                <select
                    value={year}
                    onChange={(e) => onYearChange(Number(e.target.value))}
                    className="bg-zinc-900 border border-zinc-700 text-sm rounded-lg px-3 py-2"
                >
                    {years.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select
                    value={month}
                    onChange={(e) => onMonthChange(Number(e.target.value))}
                    className="bg-zinc-900 border border-zinc-700 text-sm rounded-lg px-3 py-2"
                >
                    {months.map(m => <option key={m} value={m}>{m}월</option>)}
                </select>

                <select
                    value={selectedUser || ""}
                    onChange={(e) => setSelectedUser(e.target.value || null)}
                    className="bg-zinc-900 border border-zinc-700 text-sm rounded-lg px-3 py-2 flex-1"
                >
                    <option value="">전체 직원</option>
                    {data.map(u => <option key={u.userId} value={u.userId}>{u.name} ({u.department})</option>)}
                </select>

                <Button variant="outline" size="sm" onClick={handleCSVDownload} className="text-xs gap-1">
                    <Download className="h-3.5 w-3.5" />
                    CSV 다운로드
                </Button>
            </div>

            {/* 직원별 상세 또는 전체 요약 */}
            {selectedUserData ? (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold">{selectedUserData.name} ({selectedUserData.department}) — {year}년 {month}월</h3>

                    {/* 요약 */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold">{selectedUserData.summary.totalWorkTime}</p>
                            <p className="text-[11px] text-zinc-500">총 근무시간</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-amber-400">{selectedUserData.summary.lateCount}회</p>
                            <p className="text-[11px] text-zinc-500">지각</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-red-400">{selectedUserData.summary.absentCount}회</p>
                            <p className="text-[11px] text-zinc-500">결근</p>
                        </div>
                    </div>

                    {/* 날짜별 상세 테이블 */}
                    <div className="border border-zinc-800 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-zinc-900/80 text-zinc-400 text-xs">
                                    <th className="text-left px-4 py-2 font-medium">날짜</th>
                                    <th className="text-center px-4 py-2 font-medium">출근</th>
                                    <th className="text-center px-4 py-2 font-medium">퇴근</th>
                                    <th className="text-center px-4 py-2 font-medium">상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                                    const record = selectedUserData.days[day];
                                    const dayDate = new Date(year, month - 1, day);
                                    const dow = dayDate.getDay();
                                    const isWeekend = dow === 0 || dow === 6;
                                    const dayLabel = ["일", "월", "화", "수", "목", "금", "토"][dow];

                                    return (
                                        <tr key={day} className={`border-t border-zinc-800/50 ${isWeekend ? "opacity-30" : ""}`}>
                                            <td className="px-4 py-2">{month}/{day} ({dayLabel})</td>
                                            <td className={`px-4 py-2 text-center ${getDayCellClass(record)}`}>{record ? formatTime(record.clockIn) : isWeekend ? "주말" : "-"}</td>
                                            <td className="px-4 py-2 text-center text-orange-400">{record ? formatTime(record.clockOut) : "-"}</td>
                                            <td className="px-4 py-2 text-center text-xs">
                                                {isWeekend ? "—" : record ? (record.status === "LATE" ? "🟡 지각" : "🟢 출근") : "🔴 결근"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* 전체 직원 요약 테이블 */
                <div className="border border-zinc-800 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-zinc-900/80 text-zinc-400 text-xs">
                                <th className="text-left px-4 py-3 font-medium">이름</th>
                                <th className="text-left px-4 py-3 font-medium">부서</th>
                                <th className="text-center px-4 py-3 font-medium">총 근무시간</th>
                                <th className="text-center px-4 py-3 font-medium">지각</th>
                                <th className="text-center px-4 py-3 font-medium">결근</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map(user => (
                                <tr
                                    key={user.userId}
                                    onClick={() => setSelectedUser(user.userId)}
                                    className="border-t border-zinc-800/50 hover:bg-zinc-900/30 transition-colors cursor-pointer"
                                >
                                    <td className="px-4 py-3 font-medium">{user.name}</td>
                                    <td className="px-4 py-3 text-zinc-400">{user.department}</td>
                                    <td className="px-4 py-3 text-center">{user.summary.totalWorkTime}</td>
                                    <td className="px-4 py-3 text-center text-amber-400">{user.summary.lateCount}회</td>
                                    <td className="px-4 py-3 text-center text-red-400">{user.summary.absentCount}회</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

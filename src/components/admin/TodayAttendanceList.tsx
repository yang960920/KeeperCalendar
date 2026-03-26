"use client";

import { Users, Clock, UserCheck, UserX, LogOut as LogOutIcon } from "lucide-react";

interface AttendanceItem {
    userId: string;
    name: string;
    department: string;
    clockIn: string | null;
    clockOut: string | null;
    status: string;
    deviceId: string | null;
}

interface Summary {
    total: number;
    present: number;
    late: number;
    absent: number;
    clockedOut: number;
}

export function TodayAttendanceList({ data, summary, onRefresh }: { data: AttendanceItem[]; summary: Summary; onRefresh: () => void }) {
    const formatTime = (iso: string | null) => {
        if (!iso) return "-";
        return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PRESENT":
                return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400">🟢 근무중</span>;
            case "LATE":
                return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-400">🟡 지각</span>;
            case "CLOCKED_OUT":
                return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-500/20 text-zinc-400">⚪ 퇴근</span>;
            case "ABSENT":
            default:
                return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/20 text-red-400">🔴 미출근</span>;
        }
    };

    return (
        <div className="space-y-4">
            {/* 요약 패널 */}
            <div className="grid grid-cols-5 gap-3">
                <SummaryCard icon={Users} label="전체" value={summary.total} color="text-zinc-300" />
                <SummaryCard icon={UserCheck} label="출근" value={summary.present} color="text-emerald-400" />
                <SummaryCard icon={Clock} label="지각" value={summary.late} color="text-amber-400" />
                <SummaryCard icon={UserX} label="미출근" value={summary.absent} color="text-red-400" />
                <SummaryCard icon={LogOutIcon} label="퇴근" value={summary.clockedOut} color="text-zinc-400" />
            </div>

            {/* 새로고침 */}
            <div className="flex justify-end">
                <button onClick={onRefresh} className="text-xs text-indigo-400 hover:underline">↻ 새로고침</button>
            </div>

            {/* 테이블 */}
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-zinc-900/80 text-zinc-400 text-xs">
                            <th className="text-left px-4 py-3 font-medium">이름</th>
                            <th className="text-left px-4 py-3 font-medium">부서</th>
                            <th className="text-center px-4 py-3 font-medium">출근</th>
                            <th className="text-center px-4 py-3 font-medium">퇴근</th>
                            <th className="text-center px-4 py-3 font-medium">상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.userId} className="border-t border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                                <td className="px-4 py-3 font-medium">{item.name}</td>
                                <td className="px-4 py-3 text-zinc-400">{item.department}</td>
                                <td className="px-4 py-3 text-center text-emerald-400">{formatTime(item.clockIn)}</td>
                                <td className="px-4 py-3 text-center text-orange-400">{formatTime(item.clockOut)}</td>
                                <td className="px-4 py-3 text-center">{getStatusBadge(item.status)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <Icon className={`h-5 w-5 mx-auto mb-1.5 ${color}`} />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{label}</p>
        </div>
    );
}

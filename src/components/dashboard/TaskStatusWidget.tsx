"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { getDashboardStats, getRecentTasks } from "@/app/actions/dashboard";
import { ClipboardList, AlertTriangle } from "lucide-react";
import { WidgetPagination, paginate } from "./WidgetPagination";

interface TaskStats {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    urgent: number;
}

interface RecentTask {
    id: string;
    title: string;
    status: string;
    project: { name: string } | null;
    assignees: { id: string; name: string }[];
}

export function TaskStatusWidget() {
    const user = useStore(useAuthStore, (s) => s.user);
    const [stats, setStats] = useState<TaskStats>({ total: 0, todo: 0, inProgress: 0, done: 0, urgent: 0 });
    const [allTasks, setAllTasks] = useState<RecentTask[]>([]);
    const [filter, setFilter] = useState<string | null>(null);
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (!user) return;
        getDashboardStats(user.id).then((res) => {
            if (res.success && res.data) setStats(res.data.taskStats);
        });
        getRecentTasks(user.id).then((res) => {
            if (res.success && res.data) setAllTasks(res.data as any);
        });
    }, [user]);

    const filteredTasks = filter ? allTasks.filter((t) => t.status === filter) : allTasks;
    const { items: pageItems, totalPages, currentPage } = paginate(filteredTasks, page, 4);

    const handleFilter = (status: string | null) => {
        setFilter((prev) => (prev === status ? null : status));
        setPage(1);
    };

    return (
        <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-bold">업무 현황</h3>
            </div>

            {/* 상태 뱃지 */}
            <div className="flex flex-wrap gap-1.5 mb-2">
                <FilterBadge label="전체" value={stats.total} active={filter === null} onClick={() => handleFilter(null)} className="bg-zinc-700/50 text-zinc-200" />
                <FilterBadge label="대기" value={stats.todo} active={filter === "TODO"} onClick={() => handleFilter("TODO")} className="bg-slate-600/50 text-slate-200" />
                <FilterBadge label="진행" value={stats.inProgress} active={filter === "IN_PROGRESS"} onClick={() => handleFilter("IN_PROGRESS")} className="bg-blue-600/30 text-blue-300" />
                <FilterBadge label="완료" value={stats.done} active={filter === "DONE"} onClick={() => handleFilter("DONE")} className="bg-emerald-600/30 text-emerald-300" />
                {stats.urgent > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-600/30 text-red-300">
                        <AlertTriangle className="h-3 w-3" /> 긴급 {stats.urgent}
                    </span>
                )}
            </div>

            {/* 업무 리스트 */}
            <div className="flex-1 space-y-1 overflow-y-auto">
                {pageItems.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm hover:bg-muted/60 transition-colors cursor-pointer">
                        <StatusDot status={task.status} />
                        <div className="flex-1 min-w-0">
                            <p className="truncate text-xs font-medium">{task.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{task.project?.name}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                            {task.assignees.map((a) => a.name).join(", ")}
                        </span>
                    </div>
                ))}
            </div>

            <WidgetPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
    );
}

function FilterBadge({ label, value, active, onClick, className }: { label: string; value: number; active: boolean; onClick: () => void; className: string }) {
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all ${className} ${
                active ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "opacity-70 hover:opacity-100"
            }`}
        >
            {label} {value}
        </button>
    );
}

function StatusDot({ status }: { status: string }) {
    const color = status === "DONE" ? "bg-emerald-400" : status === "IN_PROGRESS" ? "bg-blue-400" : "bg-zinc-400";
    return <span className={`h-2 w-2 rounded-full shrink-0 ${color}`} />;
}

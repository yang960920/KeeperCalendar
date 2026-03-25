"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { getDashboardStats } from "@/app/actions/dashboard";
import { ListChecks, Circle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface TodayTask {
    id: string;
    title: string;
    status: string;
    priority: string;
    project: { name: string } | null;
    assignees: { id: string; name: string }[];
}

export function TodayTaskWidget() {
    const user = useStore(useAuthStore, (s) => s.user);
    const [tasks, setTasks] = useState<TodayTask[]>([]);

    useEffect(() => {
        if (!user) return;
        getDashboardStats(user.id).then((res) => {
            if (res.success && res.data) {
                setTasks(res.data.todayTasks as any);
            }
        });
    }, [user]);

    const todayStr = format(new Date(), "M/d (eee)");

    return (
        <div className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 rounded-xl border border-amber-500/30 shadow-sm p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                <ListChecks className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold">{todayStr} 해야할 업무</h3>
            </div>

            {tasks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    <div className="text-center space-y-1">
                        <CheckCircle2 className="h-8 w-8 mx-auto opacity-30" />
                        <p>오늘 예정된 업무가 없습니다</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 space-y-1.5 overflow-y-auto">
                    {tasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-2 p-2 rounded-lg bg-black/20 text-sm">
                            {task.status === "DONE" ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                                <Circle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium truncate ${task.status === "DONE" ? "line-through text-muted-foreground" : ""}`}>
                                    {task.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                    {task.project?.name}{task.assignees.length > 0 ? ` · ${task.assignees.map(a => a.name).join(", ")}` : ""}
                                </p>
                            </div>
                            {task.priority === "HIGH" && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 shrink-0">긴급</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

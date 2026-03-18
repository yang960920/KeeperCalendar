"use client";

import React, { useState, useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { ListChecks, Search, ChevronDown, ChevronRight, AlertTriangle, Clock, CheckCircle2, Bell, Megaphone } from "lucide-react";
import { useTaskStore, Task, SubTask } from "@/store/useTaskStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { sendNudge, getNudgeCount } from "@/app/actions/notification";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FilterType = "all" | "completed" | "delayed" | "approaching";

const FILTER_CONFIG: { key: FilterType; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "all", label: "전체", icon: <ListChecks className="h-3.5 w-3.5" />, color: "" },
    { key: "completed", label: "완료", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-emerald-500" },
    { key: "delayed", label: "지연", icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-red-500" },
    { key: "approaching", label: "마감 임박", icon: <Clock className="h-3.5 w-3.5" />, color: "text-amber-500" },
];

function getTaskStatus(task: Task): { label: string; className: string } {
    const isCompleted = task.done >= task.planned && task.planned > 0;
    if (isCompleted) return { label: "완료", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };

    if (task.endDate) {
        const daysLeft = differenceInDays(new Date(task.endDate), new Date());
        if (daysLeft < 0) return { label: `${Math.abs(daysLeft)}일 지연`, className: "bg-red-500/10 text-red-600 dark:text-red-400" };
        if (daysLeft <= 3) return { label: `D-${daysLeft}`, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
    }

    return { label: "진행중", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" };
}

function SubTaskStatusBadge({ status }: { status?: string }) {
    const config: Record<string, { label: string; className: string }> = {
        DONE: { label: "완료", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
        IN_PROGRESS: { label: "진행중", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
        TODO: { label: "대기", className: "bg-zinc-500/10 text-zinc-500" },
    };
    const c = config[status || "TODO"] || config.TODO;
    return <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${c.className}`}>{c.label}</span>;
}

interface ProjectTaskListDialogProps {
    projectId: string;
}

export const ProjectTaskListDialog = ({ projectId }: ProjectTaskListDialogProps) => {
    const tasks = useStore(useTaskStore, (s) => s.tasks) || [];
    const user = useStore(useAuthStore, (s) => s.user);
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState<FilterType>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [nudgeCounts, setNudgeCounts] = useState<Record<string, number>>({});
    const [nudging, setNudging] = useState<string | null>(null);

    // 프로젝트 전체 업무 (월 제한 없음)
    const projectTasks = useMemo(() => {
        return tasks.filter((t) => t.projectId === projectId)
            .sort((a, b) => (a.date > b.date ? 1 : -1));
    }, [tasks, projectId]);

    // 필터 적용
    const filteredTasks = useMemo(() => {
        const now = new Date();
        let result = projectTasks;

        // 필터
        switch (filter) {
            case "completed":
                result = result.filter((t) => t.done >= t.planned && t.planned > 0);
                break;
            case "delayed":
                result = result.filter((t) => {
                    if (!t.endDate) return false;
                    return differenceInDays(new Date(t.endDate), now) < 0 && !(t.done >= t.planned && t.planned > 0);
                });
                break;
            case "approaching":
                result = result.filter((t) => {
                    if (!t.endDate) return false;
                    const daysLeft = differenceInDays(new Date(t.endDate), now);
                    return daysLeft >= 0 && daysLeft <= 3 && !(t.done >= t.planned && t.planned > 0);
                });
                break;
        }

        // 검색
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            result = result.filter((t) =>
                t.title.toLowerCase().includes(lower) ||
                (t.content && t.content.toLowerCase().includes(lower))
            );
        }

        return result;
    }, [projectTasks, filter, searchTerm]);

    // 필터별 카운트
    const counts = useMemo(() => {
        const now = new Date();
        return {
            all: projectTasks.length,
            completed: projectTasks.filter((t) => t.done >= t.planned && t.planned > 0).length,
            delayed: projectTasks.filter((t) => {
                if (!t.endDate) return false;
                return differenceInDays(new Date(t.endDate), now) < 0 && !(t.done >= t.planned && t.planned > 0);
            }).length,
            approaching: projectTasks.filter((t) => {
                if (!t.endDate) return false;
                const d = differenceInDays(new Date(t.endDate), now);
                return d >= 0 && d <= 3 && !(t.done >= t.planned && t.planned > 0);
            }).length,
        };
    }, [projectTasks]);

    const toggleExpand = (taskId: string) => {
        setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
    };

    const handleNudge = async (task: Task) => {
        if (!user || nudging) return;
        const recipientIds = task.assigneeIds?.length
            ? task.assigneeIds.filter(id => id !== user.id)
            : task.assigneeId && task.assigneeId !== user.id
                ? [task.assigneeId]
                : [];

        if (recipientIds.length === 0) {
            alert("독촉할 담당자가 없습니다.");
            return;
        }

        setNudging(task.id);
        try {
            const result = await sendNudge({
                senderId: user.id,
                taskId: task.id,
                taskTitle: task.title,
                projectId: projectId,
                recipientIds,
            });

            if (result.success) {
                alert(`📢 ${recipientIds.join(", ")}님에게 독촉 알림을 보냈습니다.`);
                // 독촉 횟수 갱신
                const count = await getNudgeCount(task.id);
                setNudgeCounts(prev => ({ ...prev, [task.id]: count }));
            } else {
                alert(result.error || "독촉 알림 전송 실패");
            }
        } catch {
            alert("독촉 알림 전송 중 오류가 발생했습니다.");
        } finally {
            setNudging(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                    <ListChecks className="h-3.5 w-3.5" />
                    전체 업무 리스트
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] h-[90vh] sm:max-w-[95vw] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ListChecks className="h-5 w-5" />
                        프로젝트 전체 업무 리스트
                    </DialogTitle>
                </DialogHeader>

                {/* 필터 + 검색 */}
                <div className="flex items-center gap-2 flex-wrap">
                    {FILTER_CONFIG.map((f) => (
                        <Button
                            key={f.key}
                            variant={filter === f.key ? "default" : "outline"}
                            size="sm"
                            className={`gap-1.5 text-xs ${filter !== f.key ? f.color : ""}`}
                            onClick={() => { setFilter(f.key); setExpandedTaskId(null); }}
                        >
                            {f.icon}
                            {f.label}
                            <span className={`ml-0.5 text-[10px] ${filter === f.key ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                ({counts[f.key]})
                            </span>
                        </Button>
                    ))}
                    <div className="relative ml-auto">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="업무명 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 h-8 text-xs w-48"
                        />
                    </div>
                </div>

                {/* 테이블 */}
                <div className="flex-1 overflow-y-auto overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm table-fixed min-w-[800px]">
                        <thead className="bg-muted text-muted-foreground sticky top-0">
                            <tr>
                                <th className="px-3 py-2.5 font-medium text-center w-[50px]">#</th>
                                <th className="px-1 py-2.5 font-medium w-[30px]"></th>
                                <th className="px-3 py-2.5 font-medium text-left">제목</th>
                                <th className="px-3 py-2.5 font-medium text-left w-[120px]">담당자</th>
                                <th className="px-3 py-2.5 font-medium text-left w-[110px]">시작일</th>
                                <th className="px-3 py-2.5 font-medium text-left w-[110px]">마감기한</th>
                                <th className="px-3 py-2.5 font-medium text-center w-[90px]">상태</th>
                                <th className="px-2 py-2.5 font-medium text-center w-[40px]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                        해당하는 업무가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                filteredTasks.map((task, idx) => {
                                    const status = getTaskStatus(task);
                                    const isExpanded = expandedTaskId === task.id;
                                    const hasSubTasks = (task.subTasks || []).length > 0;
                                    const isDelayedOrApproaching = task.endDate && differenceInDays(new Date(task.endDate), new Date()) <= 3 && !(task.done >= task.planned && task.planned > 0);

                                    return (
                                        <React.Fragment key={task.id}>
                                            {/* 메인 업무 행 */}
                                            <tr
                                                className={`hover:bg-muted/50 transition-colors ${hasSubTasks ? "cursor-pointer" : ""} ${isExpanded ? "bg-muted/30" : ""}`}
                                                onClick={() => hasSubTasks && toggleExpand(task.id)}
                                            >
                                                <td className="px-3 py-2.5 text-center text-muted-foreground text-xs whitespace-nowrap">{idx + 1}</td>
                                                <td className="px-1 py-2.5 text-center whitespace-nowrap">
                                                    {hasSubTasks && (
                                                        isExpanded
                                                            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                                            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="truncate">
                                                        <span className="font-medium">{task.title}</span>
                                                        {hasSubTasks && (
                                                            <span className="ml-1.5 text-[10px] text-muted-foreground">
                                                                ({(task.subTasks || []).filter(st => st.isCompleted).length}/{(task.subTasks || []).length})
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-xs whitespace-nowrap truncate">
                                                    {task.assigneeNames?.join(", ") || task.assigneeName || task.assigneeId || "-"}
                                                </td>
                                                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                                    {task.date}
                                                </td>
                                                <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                                                    {task.endDate || "-"}
                                                </td>
                                                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${status.className}`}>
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                                    {isDelayedOrApproaching && (
                                                        <button
                                                            onClick={() => handleNudge(task)}
                                                            disabled={nudging === task.id}
                                                            className="p-1 rounded hover:bg-amber-500/10 text-amber-500 transition-colors disabled:opacity-50 relative"
                                                            title="독촉 알림 보내기"
                                                        >
                                                            <Megaphone className="h-3.5 w-3.5" />
                                                            {(nudgeCounts[task.id] || 0) > 0 && (
                                                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] rounded-full min-w-[14px] h-[14px] flex items-center justify-center">
                                                                    {nudgeCounts[task.id]}
                                                                </span>
                                                            )}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* 하위업무 확장 영역 */}
                                            {isExpanded && hasSubTasks && (
                                                <tr>
                                                    <td colSpan={8} className="px-0 py-0 bg-muted/10">
                                                        <div className="pl-14 pr-4 py-2 space-y-1">
                                                            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                                                                하위 업무 ({(task.subTasks || []).length}건)
                                                            </p>
                                                            {(task.subTasks || []).map((st: SubTask) => (
                                                                <div
                                                                    key={st.id}
                                                                    className="flex items-center gap-3 py-1.5 px-3 rounded-md bg-background/50 text-xs"
                                                                >
                                                                    <span className={`flex-1 ${st.isCompleted ? "line-through text-muted-foreground" : "font-medium"}`}>
                                                                        {st.title}
                                                                    </span>
                                                                    <span className="text-muted-foreground shrink-0">
                                                                        {st.assigneeName || st.assigneeId || "-"}
                                                                    </span>
                                                                    <SubTaskStatusBadge status={st.status || (st.isCompleted ? "DONE" : "TODO")} />
                                                                    <span className="text-muted-foreground shrink-0 w-20 text-right">
                                                                        {st.dueDate || "-"}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 하단 요약 */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>총 {filteredTasks.length}건 표시</span>
                    <span className="flex gap-3">
                        <span className="text-emerald-500">완료 {counts.completed}</span>
                        <span className="text-red-500">지연 {counts.delayed}</span>
                        <span className="text-amber-500">임박 {counts.approaching}</span>
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    );
};

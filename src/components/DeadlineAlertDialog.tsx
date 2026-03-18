"use client";

import React, { useState, useMemo } from "react";
import { differenceInDays } from "date-fns";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { useTaskStore, Task } from "@/store/useTaskStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useStore } from "@/hooks/useStore";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeadlineAlertDialogProps {
    dueDays: number; // Settings에서 가져온 D-day 기준
    userId?: string;
}

export function DeadlineAlertDialog({ dueDays, userId }: DeadlineAlertDialogProps) {
    const [open, setOpen] = useState(false);
    const tasks = useStore(useTaskStore, (s) => s.tasks) || [];
    const projects = useStore(useProjectStore, (s) => s.projects) || [];

    // 마감 임박 업무 필터
    const deadlineTasks = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return tasks
            .filter(t => {
                if (!t.endDate) return false;
                const isCompleted = t.done >= t.planned && t.planned > 0;
                if (isCompleted) return false;

                // 내 업무만 (개인 + 내게 할당된 프로젝트 업무)
                if (t.projectId && userId) {
                    const isMine = t.assigneeId === userId ||
                        (t.assigneeIds && t.assigneeIds.includes(userId));
                    const proj = projects.find(p => p.id === t.projectId);
                    const isCreator = proj?.creatorId === userId;
                    if (!isMine && !isCreator) return false;
                }

                const daysLeft = differenceInDays(new Date(t.endDate), today);
                return daysLeft <= dueDays; // D-N 이하 (D-0, D-음수 포함)
            })
            .map(t => {
                const daysLeft = differenceInDays(new Date(t.endDate!), new Date());
                const project = projects.find(p => p.id === t.projectId);
                return { ...t, daysLeft, projectName: project?.title || "개인" };
            })
            .sort((a, b) => a.daysLeft - b.daysLeft); // D-day 오름차순 (지연된 것 먼저)
    }, [tasks, projects, dueDays, userId]);

    const count = deadlineTasks.length;

    const getDayLabel = (days: number) => {
        if (days < 0) return `${Math.abs(days)}일 지연`;
        if (days === 0) return "D-Day";
        return `D-${days}`;
    };

    const getDayColor = (days: number) => {
        if (days < 0) return "text-red-500 bg-red-500/10";
        if (days === 0) return "text-red-500 bg-red-500/10 font-bold";
        if (days <= 1) return "text-orange-500 bg-orange-500/10";
        return "text-amber-500 bg-amber-500/10";
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant={count > 0 ? "destructive" : "outline"}
                    size="sm"
                    className="gap-1.5 relative"
                >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    마감 임박
                    {count > 0 && (
                        <span className="ml-1 bg-white/20 text-xs px-1.5 py-0.5 rounded-full font-bold">
                            {count}
                        </span>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] sm:max-w-[90vw] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        마감 임박 업무 (D-{dueDays} 이내)
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                            총 {count}건
                        </span>
                    </DialogTitle>
                </DialogHeader>

                {count === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mb-3 text-emerald-500/50" />
                        <p className="text-sm">마감 임박한 업무가 없습니다 🎉</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto border rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground sticky top-0">
                                <tr>
                                    <th className="px-3 py-2.5 text-center w-[80px]">D-Day</th>
                                    <th className="px-3 py-2.5 text-left">업무명</th>
                                    <th className="px-3 py-2.5 text-left w-[150px]">프로젝트</th>
                                    <th className="px-3 py-2.5 text-left w-[120px]">담당자</th>
                                    <th className="px-3 py-2.5 text-center w-[100px]">마감일</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deadlineTasks.map((task, i) => (
                                    <tr key={task.id} className="border-t hover:bg-muted/30 transition-colors">
                                        <td className="px-3 py-3 text-center">
                                            <span className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold ${getDayColor(task.daysLeft)}`}>
                                                {getDayLabel(task.daysLeft)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 font-medium">{task.title}</td>
                                        <td className="px-3 py-3 text-muted-foreground text-xs">{task.projectName}</td>
                                        <td className="px-3 py-3 text-xs">
                                            {task.assigneeNames?.join(", ") || task.assigneeName || "-"}
                                        </td>
                                        <td className="px-3 py-3 text-center text-xs text-muted-foreground">
                                            {task.endDate}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

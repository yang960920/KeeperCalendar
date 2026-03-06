"use client";

import React, { useMemo } from "react";
import { Flag } from "lucide-react";
import { Task } from "@/store/useTaskStore";

interface ProjectProgressWidgetProps {
    projectId: string;
    tasks: Task[];
}

export const ProjectProgressWidget = ({ projectId, tasks }: ProjectProgressWidgetProps) => {
    // Task 단위 통계
    const taskStats = useMemo(() => {
        const total = tasks.length;
        const done = tasks.filter(t => t.done >= t.planned && t.planned > 0).length;
        const left = total - done;
        const rate = total > 0 ? Math.round((done / total) * 100) : 0;
        return { total, done, left, rate: Math.min(100, rate) };
    }, [tasks]);

    // SubTask 단위 통계
    const subTaskStats = useMemo(() => {
        let total = 0;
        let done = 0;
        tasks.forEach(t => {
            if (t.subTasks && t.subTasks.length > 0) {
                total += t.subTasks.length;
                done += t.subTasks.filter(st => st.isCompleted).length;
            }
        });
        const left = total - done;
        const rate = total > 0 ? Math.round((done / total) * 100) : 0;
        return { total, done, left, rate: Math.min(100, rate) };
    }, [tasks]);

    const ProgressRow = ({ label, rate, total, done, left, badgeColor, valueColor, leftColor }: {
        label: string; rate: number; total: number; done: number; left: number;
        badgeColor: string; valueColor: string; leftColor: string;
    }) => (
        <div className="flex items-start justify-center md:justify-end gap-4 md:gap-10">
            {/* Status */}
            <div className="flex flex-col items-center">
                <div className="bg-foreground text-background text-xs font-semibold px-4 py-1.5 rounded-md mb-2">
                    {label}
                </div>
                <div className="text-2xl font-bold mb-2">{rate}%</div>
                <div className="relative w-28 h-1 bg-muted rounded-full flex items-center">
                    <div
                        className="absolute z-10 text-[10px] transform -translate-x-1/2 -translate-y-1/2 mt-1"
                        style={{ left: `${rate}%` }}
                    >
                        🏃
                    </div>
                    <div
                        className="h-full bg-foreground rounded-full transition-all duration-500"
                        style={{ width: `${rate}%` }}
                    />
                    <div className="absolute right-0 text-red-500 transform translate-x-1/2 -translate-y-1/2 mt-1.5">
                        <Flag size={12} fill="currentColor" />
                    </div>
                </div>
            </div>

            {/* Total */}
            <div className="flex flex-col items-center">
                <div className="bg-foreground text-background text-xs font-semibold px-5 py-1.5 rounded-md mb-2">
                    Total
                </div>
                <div className="text-2xl font-bold">{total}</div>
            </div>

            {/* Done */}
            <div className="flex flex-col items-center">
                <div className={`${badgeColor} text-black text-xs font-semibold px-5 py-1.5 rounded-md mb-2`}>
                    Done
                </div>
                <div className={`text-2xl font-bold ${valueColor}`}>{done}</div>
            </div>

            {/* Left */}
            <div className="flex flex-col items-center">
                <div className={`${leftColor} text-black text-xs font-semibold px-5 py-1.5 rounded-md mb-2`}>
                    Left
                </div>
                <div className="text-2xl font-bold text-muted-foreground">{left}</div>
            </div>
        </div>
    );

    return (
        <div className="w-full flex flex-col gap-4 py-5 px-4 md:px-8 border rounded-lg bg-card/50">
            {/* Task 단위 */}
            <ProgressRow
                label="Task Status"
                rate={taskStats.rate}
                total={taskStats.total}
                done={taskStats.done}
                left={taskStats.left}
                badgeColor="bg-[#a2c8f2]"
                valueColor="text-[#6eaae5]"
                leftColor="bg-[#eaf5b0]"
            />

            {/* SubTask 단위 (SubTask가 있는 경우만) */}
            {subTaskStats.total > 0 && (
                <>
                    <div className="border-t border-border/30" />
                    <ProgressRow
                        label="SubTask Progress"
                        rate={subTaskStats.rate}
                        total={subTaskStats.total}
                        done={subTaskStats.done}
                        left={subTaskStats.left}
                        badgeColor="bg-[#c4b5fd]"
                        valueColor="text-[#8b5cf6]"
                        leftColor="bg-[#fde68a]"
                    />
                </>
            )}
        </div>
    );
};

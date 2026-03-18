"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTaskStore, Task } from "@/store/useTaskStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { EditTaskDialog } from "@/components/EditTaskDialog";
import { CalendarGrid } from "@/components/CalendarGrid";
import { DeadlineAlertDialog } from "@/components/DeadlineAlertDialog";
import { getUserSettings } from "@/app/actions/settings";

interface MonthlyTaskListProps {
    year: string;
    month: string;
}

export const MonthlyTaskList = ({ year, month }: MonthlyTaskListProps) => {
    const tasks = useStore(useTaskStore, (state) => state.tasks) || [];
    const projects = useStore(useProjectStore, (state) => state.projects) || [];
    const currentUser = useStore(useAuthStore, (state) => state.user);
    const [mounted, setMounted] = useState(false);

    // 검색어 및 다이얼로그 상태
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // 알림 설정
    const [notifyDueDate, setNotifyDueDate] = useState(true);
    const [notifyDueDays, setNotifyDueDays] = useState(1);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 사용자 설정 로드
    useEffect(() => {
        if (!currentUser) return;
        getUserSettings(currentUser.id).then((res: any) => {
            if (res.success && res.data) {
                setNotifyDueDate(res.data.notifyDueDate ?? true);
                setNotifyDueDays(res.data.notifyDueDays ?? 1);
            }
        });
    }, [currentUser]);

    // 선택된 연/월 및 검색어에 해당하는 데이터만 필터링
    const filteredTasks = useMemo(() => {
        const targetPrefix = `${year}-${month.padStart(2, "0")}`;

        let result = tasks.filter((task) => {
            if (!task.date.startsWith(targetPrefix)) return false;

            // 1. 개인 업무인지 확인
            if (!task.projectId) return true;

            // 프로젝트 업무일 경우 권한 확인
            if (!currentUser) return false;

            // 2. 내가 할당받은 업무인지 확인 (복수 담당자 지원)
            if (task.assigneeId === currentUser.id) return true;
            if (task.assigneeIds && task.assigneeIds.includes(currentUser.id)) return true;

            // 3. 내가 만든 프로젝트의 업무인지 확인 (생성자 교차 연동)
            const parentProject = projects.find((p: any) => p.id === task.projectId);
            if (parentProject && parentProject.creatorId === currentUser.id) return true;

            return false;
        });

        if (searchTerm.trim() !== "") {
            const lowerSearchTerm = searchTerm.toLowerCase();
            result = result.filter(
                (task) =>
                    task.title.toLowerCase().includes(lowerSearchTerm) ||
                    (task.content && task.content.toLowerCase().includes(lowerSearchTerm))
            );
        }

        return result.sort((a, b) => (a.date > b.date ? 1 : -1)); // 날짜 오름차순
    }, [tasks, projects, currentUser, year, month, searchTerm]);

    const handleRowClick = (task: Task) => {
        setSelectedTask(task);
        setIsEditDialogOpen(true);
    };

    if (!mounted) {
        return (
            <div className="bg-card border rounded-xl min-h-[200px] flex items-center justify-center text-muted-foreground p-6">
                업무 일지 리스트를 불러오는 중입니다...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* 검색 바 + 마감 임박 뱃지 */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 md:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="업무명 또는 내용 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-full"
                    />
                </div>
                {notifyDueDate && (
                    <DeadlineAlertDialog dueDays={notifyDueDays} userId={currentUser?.id} />
                )}
            </div>

            <div className="mt-6">
                <CalendarGrid
                    year={year}
                    month={month}
                    tasks={filteredTasks}
                    onTaskClick={handleRowClick}
                />
            </div>

            {/* 수정 컴포넌트 마운트 */}
            <EditTaskDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                task={selectedTask}
            />
        </div>
    );
};

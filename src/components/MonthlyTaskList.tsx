"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTaskStore, Task } from "@/store/useTaskStore";
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
    const currentUser = useStore(useAuthStore, (state) => state.user);
    const [mounted, setMounted] = useState(false);

    // 검색어 및 다이얼로그 상태
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // store에서 실시간으로 task를 가져와야 하위업무 추가 시 즉시 반영됨
    const selectedTask = useMemo(
        () => (selectedTaskId ? tasks.find(t => t.id === selectedTaskId) ?? null : null),
        [tasks, selectedTaskId]
    );

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

            if (!currentUser) return false;

            // 월별 일지는 "본인이 담당자로 지정된 업무"만 표시.
            // 프로젝트 참여자/생성자라는 이유로 다른 사람 담당 업무가 섞이지 않도록
            // 관리자 전체 열람 권한과 무관하게 담당자 기준만 적용한다.
            if (task.assigneeId === currentUser.id) return true;
            if (task.assigneeIds && task.assigneeIds.includes(currentUser.id)) return true;

            // 과거 데이터 호환: 개인 업무(프로젝트 없음)이고 생성자가 본인이면 포함
            if (!task.projectId && task.createdById === currentUser.id) return true;

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
    }, [tasks, currentUser, year, month, searchTerm]);

    const handleRowClick = (task: Task) => {
        setSelectedTaskId(task.id);
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
                    currentUserId={currentUser?.id}
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

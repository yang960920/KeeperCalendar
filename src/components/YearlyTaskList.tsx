"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTaskStore, Task } from "@/store/useTaskStore";
import { useStore } from "@/hooks/useStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { EditTaskDialog } from "@/components/EditTaskDialog";

const PAGE_SIZE = 10;

interface YearlyTaskListProps {
    year: string;
    month?: string;
}

export const YearlyTaskList = ({ year, month }: YearlyTaskListProps) => {
    const tasks = useStore(useTaskStore, (state) => state.tasks) || [];
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
    const [page, setPage] = useState(1);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 선택된 연도 및 검색어에 해당하는 데이터만 필터링
    const filteredTasks = useMemo(() => {
        let result = tasks.filter((task) => task.date.startsWith(year));

        // 월 필터
        if (month) {
            const mm = month.padStart(2, "0");
            result = result.filter((task) => task.date.substring(5, 7) === mm);
        }

        if (searchTerm.trim() !== "") {
            const lowerSearchTerm = searchTerm.toLowerCase();
            result = result.filter(
                (task) =>
                    task.title.toLowerCase().includes(lowerSearchTerm) ||
                    (task.content && task.content.toLowerCase().includes(lowerSearchTerm))
            );
        }

        return result.sort((a, b) => (a.date > b.date ? 1 : -1)); // 날짜 오름차순
    }, [tasks, year, month, searchTerm]);

    // 필터 변경 시 페이지 리셋
    useEffect(() => { setPage(1); }, [year, month, searchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
    const paginatedTasks = filteredTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleRowClick = (task: Task) => {
        setSelectedTaskId(task.id);
        setIsEditDialogOpen(true);
    };

    if (!mounted) {
        return (
            <div className="bg-card border rounded-xl min-h-[200px] flex items-center justify-center text-muted-foreground p-6">
                연간 업무 일지 리스트를 불러오는 중입니다...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* 검색 바 */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="업무명 또는 내용 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full md:max-w-sm"
                />
            </div>

            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-medium">날짜</th>
                                <th className="px-4 py-3 font-medium">카테고리</th>
                                <th className="px-4 py-3 font-medium w-full">업무명</th>
                                <th className="px-4 py-3 font-medium whitespace-nowrap text-right">계획 / 실행</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y relative">
                            {paginatedTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                        검색 결과 또는 등록된 업무 일지가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                paginatedTasks.map((task) => (
                                    <tr
                                        key={task.id}
                                        className="hover:bg-muted/50 transition-colors cursor-pointer group"
                                        onClick={() => handleRowClick(task)}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                            {task.date}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                {task.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-foreground group-hover:text-primary transition-colors">
                                            {task.title}
                                            {task.content && <p className="text-xs text-muted-foreground mt-0.5 font-normal truncate max-w-sm">{task.content}</p>}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-muted-foreground">
                                            {task.planned} / <span className={task.done >= task.planned ? "text-green-500 font-semibold" : ""}>{task.done}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                        <p className="text-xs text-muted-foreground">
                            총 {filteredTasks.length}건 중 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredTasks.length)}건
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, i) =>
                                    typeof p === 'string' ? (
                                        <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                                    ) : (
                                        <Button
                                            key={p}
                                            variant={page === p ? "default" : "ghost"}
                                            size="icon"
                                            className="h-8 w-8 text-xs"
                                            onClick={() => setPage(p)}
                                        >
                                            {p}
                                        </Button>
                                    )
                                )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
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

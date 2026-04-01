"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
    AlertCircle,
    CalendarClock,
    CheckSquare,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Filter,
    Loader2,
    Search,
    Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    getTasksByProjectForKanban,
    getMyTasksForKanban,
    updateTaskStatusByKanban,
} from "@/app/actions/task";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";

// ─── Types ───────────────────────────────────────────────────────────────────

type KanbanStatus = "TODO" | "IN_PROGRESS" | "DONE";
type KanbanPriority = "LOW" | "MEDIUM" | "HIGH";

interface KanbanTask {
    id: string;
    title: string;
    description: string | null;
    status: KanbanStatus;
    priority: KanbanPriority;
    assignees: { id: string; name: string }[];
    projectName?: string;
    projectId?: string;
    dueDate: string | null;
    endDate: string | null;
    subTaskTotal: number;
    subTaskDone: number;
    isUrgent: boolean;
    urgencyStatus?: string;
}

const COLUMN_CONFIG: {
    id: KanbanStatus;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    dotColor: string;
}[] = [
    {
        id: "TODO",
        label: "할 일",
        color: "text-slate-400",
        bgColor: "bg-slate-500/10",
        borderColor: "border-slate-500/20",
        dotColor: "bg-slate-400",
    },
    {
        id: "IN_PROGRESS",
        label: "진행 중",
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        dotColor: "bg-blue-400",
    },
    {
        id: "DONE",
        label: "완료",
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        dotColor: "bg-emerald-400",
    },
];

const PRIORITY_CONFIG: Record<
    KanbanPriority,
    { label: string; color: string; bg: string }
> = {
    HIGH: {
        label: "긴급",
        color: "text-red-400",
        bg: "bg-red-500/10 border-red-500/30",
    },
    MEDIUM: {
        label: "보통",
        color: "text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/30",
    },
    LOW: {
        label: "낮음",
        color: "text-slate-400",
        bg: "bg-slate-500/10 border-slate-500/30",
    },
};

// ─── KanbanCard ──────────────────────────────────────────────────────────────

function KanbanCard({
    task,
    isDragging = false,
}: {
    task: KanbanTask;
    isDragging?: boolean;
}) {
    const pc = PRIORITY_CONFIG[task.priority];
    const subProgress =
        task.subTaskTotal > 0
            ? Math.round((task.subTaskDone / task.subTaskTotal) * 100)
            : null;
    const isOverdue =
        task.endDate && task.status !== "DONE"
            ? new Date(task.endDate) < new Date()
            : false;

    return (
        <div
            className={`bg-card border rounded-xl p-3.5 shadow-sm transition-all duration-200 ${
                isDragging
                    ? "shadow-xl rotate-2 scale-105 border-primary/50 opacity-90"
                    : "hover:shadow-md hover:border-primary/30"
            }`}
        >
            {/* 헤더: 우선순위 + 마감일 */}
            <div className="flex items-center justify-between mb-2">
                <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold px-1.5 py-0 h-4 ${pc.bg} ${pc.color} border`}
                >
                    {pc.label}
                </Badge>
                <div className="flex items-center gap-1.5">
                    {task.isUrgent && (
                        <AlertCircle className="h-3 w-3 text-red-400" />
                    )}
                    {task.endDate && (
                        <span
                            className={`text-[10px] flex items-center gap-0.5 ${
                                isOverdue
                                    ? "text-red-400 font-semibold"
                                    : "text-muted-foreground"
                            }`}
                        >
                            <CalendarClock className="h-2.5 w-2.5" />
                            {format(new Date(task.endDate), "M/d", {
                                locale: ko,
                            })}
                        </span>
                    )}
                </div>
            </div>

            {/* 제목 */}
            <p className="text-sm font-medium leading-snug mb-2.5 line-clamp-2">
                {task.title}
            </p>

            {/* 프로젝트명 (통합 칸반에서만) */}
            {task.projectName && (
                <p className="text-[10px] text-muted-foreground mb-2 truncate">
                    📁 {task.projectName}
                </p>
            )}

            {/* 하위업무 진행률 */}
            {subProgress !== null && (
                <div className="mb-2.5">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                            <CheckSquare className="h-2.5 w-2.5" />
                            {task.subTaskDone}/{task.subTaskTotal}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                            {subProgress}%
                        </span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${subProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* 담당자 아바타 */}
            {task.assignees.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                    {task.assignees.slice(0, 3).map((a) => (
                        <span
                            key={a.id}
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[9px] font-bold ring-1 ring-primary/30"
                            title={a.name}
                        >
                            {a.name.charAt(0)}
                        </span>
                    ))}
                    {task.assignees.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">
                            +{task.assignees.length - 3}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── SortableKanbanCard ───────────────────────────────────────────────────────

function SortableKanbanCard({ task }: { task: KanbanTask }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id, data: { type: "task", status: task.status } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <KanbanCard task={task} />
        </div>
    );
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 8;

function KanbanColumn({
    config,
    tasks,
}: {
    config: (typeof COLUMN_CONFIG)[number];
    tasks: KanbanTask[];
}) {
    const [page, setPage] = useState(1);

    const totalPages = Math.ceil(tasks.length / ITEMS_PER_PAGE) || 1;
    const paginatedTasks = tasks.slice(
        (page - 1) * ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE
    );

    // tasks 변경(필터/검색/DnD) 시 페이지 리셋
    useEffect(() => {
        setPage(1);
    }, [tasks.length]);

    return (
        <div
            className={`flex flex-col rounded-xl border ${config.borderColor} ${config.bgColor} min-h-[400px]`}
        >
            {/* 칼럼 헤더 */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-inherit">
                <span
                    className={`w-2 h-2 rounded-full ${config.dotColor}`}
                />
                <h3 className={`text-sm font-bold ${config.color}`}>
                    {config.label}
                </h3>
                <span
                    className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}
                >
                    {tasks.length}
                </span>
            </div>

            {/* 카드 영역 */}
            <SortableContext
                items={paginatedTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="flex flex-col gap-2.5 p-3 flex-1">
                    {tasks.length === 0 && (
                        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground/50 py-8">
                            업무 없음
                        </div>
                    )}
                    {paginatedTasks.map((task) => (
                        <SortableKanbanCard key={task.id} task={task} />
                    ))}
                </div>
            </SortableContext>

            {/* 페이지네이션 컨트롤 */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 px-3 py-2 border-t border-inherit">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {page} / {totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                </div>
            )}
        </div>
    );
}

// ─── KanbanBoard (main) ───────────────────────────────────────────────────────

interface KanbanBoardProps {
    projectId?: string; // 특정 프로젝트 보드 (없으면 내 전체 업무)
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
    const user = useStore(useAuthStore, (s) => s.user);

    const [tasks, setTasks] = useState<KanbanTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
    const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // 토스트 자동 닫힘
    useEffect(() => {
        if (!toastMsg) return;
        const t = setTimeout(() => setToastMsg(null), 3000);
        return () => clearTimeout(t);
    }, [toastMsg]);

    // 필터
    const [searchQuery, setSearchQuery] = useState("");
    const [priorityFilter, setPriorityFilter] = useState<KanbanPriority[]>([]);

    // 센서: 5px 이동 후 드래그 시작 (클릭과 구분)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    // ─ 데이터 로드
    const loadTasks = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const result = projectId
                ? await getTasksByProjectForKanban(projectId)
                : await getMyTasksForKanban(user.id);

            if (result.success) {
                setTasks(result.data as KanbanTask[]);
            }
        } finally {
            setIsLoading(false);
        }
    }, [user, projectId]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    // ─ 필터 적용
    const filteredTasks = useMemo(() => {
        return tasks.filter((t) => {
            if (
                searchQuery &&
                !t.title.toLowerCase().includes(searchQuery.toLowerCase())
            )
                return false;
            if (priorityFilter.length > 0 && !priorityFilter.includes(t.priority))
                return false;
            return true;
        });
    }, [tasks, searchQuery, priorityFilter]);

    const columnTasks = useMemo(
        () =>
            COLUMN_CONFIG.reduce(
                (acc, col) => {
                    acc[col.id] = filteredTasks.filter((t) => t.status === col.id);
                    return acc;
                },
                {} as Record<KanbanStatus, KanbanTask[]>
            ),
        [filteredTasks]
    );

    // ─ DnD 핸들러
    function handleDragStart(event: DragStartEvent) {
        const task = tasks.find((t) => t.id === event.active.id);
        if (task) setActiveTask(task);
    }

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // overId가 칼럼 ID인지 태스크 ID인지 확인
        const overIsColumn = COLUMN_CONFIG.some((c) => c.id === overId);
        const overTask = tasks.find((t) => t.id === overId);

        const targetStatus: KanbanStatus | null = overIsColumn
            ? (overId as KanbanStatus)
            : overTask
            ? overTask.status
            : null;

        if (!targetStatus) return;

        setTasks((prev) =>
            prev.map((t) =>
                t.id === activeId ? { ...t, status: targetStatus } : t
            )
        );
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveTask(null);

        if (!over || !user) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeTask = tasks.find((t) => t.id === activeId);
        if (!activeTask) return;

        // 현재 상태(낙관적 업데이트 후 상태) 확인
        const currentTask = tasks.find((t) => t.id === activeId);
        if (!currentTask) return;

        const newStatus = currentTask.status;
        const originalStatus = active.data.current?.status as KanbanStatus;

        if (newStatus === originalStatus) return; // 변화 없음

        // 서버 업데이트
        const result = await updateTaskStatusByKanban(activeId, newStatus, user.id);
        if (!result.success) {
            setToastMsg({ type: "error", message: result.error || "잠시 후 다시 시도해주세요." });
            // 롤백
            setTasks((prev) =>
                prev.map((t) =>
                    t.id === activeId ? { ...t, status: originalStatus } : t
                )
            );
        } else {
            setToastMsg({
                type: "success",
                message: `"${currentTask.title}"을(를) ${
                    newStatus === "TODO" ? "할 일" : newStatus === "IN_PROGRESS" ? "진행 중" : "완료"
                }로 이동했습니다.`,
            });
        }
    }

    const togglePriority = (p: KanbanPriority) => {
        setPriorityFilter((prev) =>
            prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
        );
    };

    if (!user) return null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 h-full relative">
            {/* 인라인 토스트 */}
            {toastMsg && (
                <div
                    className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2 ${
                        toastMsg.type === "success"
                            ? "bg-emerald-600 text-white"
                            : "bg-red-600 text-white"
                    }`}
                >
                    {toastMsg.message}
                </div>
            )}
            {/* 필터 바 */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="업무 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-sm"
                    />
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5">
                            <Filter className="h-3.5 w-3.5" />
                            우선순위
                            {priorityFilter.length > 0 && (
                                <span className="bg-primary text-primary-foreground rounded-full text-[10px] px-1.5 py-0">
                                    {priorityFilter.length}
                                </span>
                            )}
                            <ChevronDown className="h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {(["HIGH", "MEDIUM", "LOW"] as KanbanPriority[]).map((p) => (
                            <DropdownMenuCheckboxItem
                                key={p}
                                checked={priorityFilter.includes(p)}
                                onCheckedChange={() => togglePriority(p)}
                            >
                                <span className={PRIORITY_CONFIG[p].color}>
                                    {PRIORITY_CONFIG[p].label}
                                </span>
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                    <Users className="h-3.5 w-3.5" />
                    <span>총 {filteredTasks.length}개 업무</span>
                </div>
            </div>

            {/* 칸반 보드 */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                    {COLUMN_CONFIG.map((col) => (
                        <KanbanColumn
                            key={col.id}
                            config={col}
                            tasks={columnTasks[col.id] || []}
                        />
                    ))}
                </div>

                {/* 드래그 중 오버레이 */}
                <DragOverlay>
                    {activeTask ? (
                        <KanbanCard task={activeTask} isDragging />
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}

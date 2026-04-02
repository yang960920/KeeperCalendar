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
    ArrowDownWideNarrow,
    CalendarClock,
    CheckSquare,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    Filter,
    FolderOpen,
    Loader2,
    Search,
    TrendingUp,
    Users,
    X,
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    getTasksByProjectForKanban,
    getMyTasksForKanban,
    updateTaskStatusByKanban,
    getTaskDetailsForModal,
} from "@/app/actions/task";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";

// ─── Types ───────────────────────────────────────────────────────────────────

type KanbanStatus = "TODO" | "IN_PROGRESS" | "DONE";
type KanbanPriority = "LOW" | "MEDIUM" | "HIGH";
type SortOption = "default" | "dueDate" | "priority" | "title";
type SpecialFilter = "overdue" | "dueSoon" | "urgent";

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
    { label: string; color: string; bg: string; order: number }
> = {
    HIGH: {
        label: "긴급",
        color: "text-red-400",
        bg: "bg-red-500/10 border-red-500/30",
        order: 0,
    },
    MEDIUM: {
        label: "보통",
        color: "text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/30",
        order: 1,
    },
    LOW: {
        label: "낮음",
        color: "text-slate-400",
        bg: "bg-slate-500/10 border-slate-500/30",
        order: 2,
    },
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "default", label: "기본순" },
    { value: "dueDate", label: "마감일순" },
    { value: "priority", label: "우선순위순" },
    { value: "title", label: "이름순" },
];

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function getDaysUntilDue(endDate: string | null): number | null {
    if (!endDate) return null;
    const due = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function sortTasks(tasks: KanbanTask[], option: SortOption): KanbanTask[] {
    const sorted = [...tasks];
    switch (option) {
        case "dueDate":
            return sorted.sort((a, b) => {
                if (!a.endDate && !b.endDate) return 0;
                if (!a.endDate) return 1;
                if (!b.endDate) return -1;
                return a.endDate.localeCompare(b.endDate);
            });
        case "priority":
            return sorted.sort(
                (a, b) => PRIORITY_CONFIG[a.priority].order - PRIORITY_CONFIG[b.priority].order
            );
        case "title":
            return sorted.sort((a, b) => a.title.localeCompare(b.title));
        default:
            return sorted;
    }
}

// ─── 통계 요약 바 ────────────────────────────────────────────────────────────

function StatsSummary({ tasks }: { tasks: KanbanTask[] }) {
    const stats = useMemo(() => {
        const total = tasks.length;
        const done = tasks.filter((t) => t.status === "DONE").length;
        const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
        const overdue = tasks.filter(
            (t) => t.status !== "DONE" && t.endDate && new Date(t.endDate) < new Date()
        ).length;
        const dueSoon = tasks.filter((t) => {
            if (t.status === "DONE") return false;
            const d = getDaysUntilDue(t.endDate);
            return d !== null && d >= 0 && d <= 3;
        }).length;
        const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

        return { total, done, inProgress, overdue, dueSoon, completionRate };
    }, [tasks]);

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div>
                    <p className="text-[10px] text-muted-foreground">완료율</p>
                    <p className="text-sm font-bold text-primary">{stats.completionRate}%</p>
                </div>
                <div className="ml-auto h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${stats.completionRate}%` }}
                    />
                </div>
            </div>
            <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2">
                <CheckSquare className="h-4 w-4 text-emerald-400" />
                <div>
                    <p className="text-[10px] text-muted-foreground">완료</p>
                    <p className="text-sm font-bold">{stats.done}<span className="text-muted-foreground font-normal text-xs">/{stats.total}</span></p>
                </div>
            </div>
            <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2">
                <Loader2 className="h-4 w-4 text-blue-400" />
                <div>
                    <p className="text-[10px] text-muted-foreground">진행 중</p>
                    <p className="text-sm font-bold">{stats.inProgress}</p>
                </div>
            </div>
            {stats.overdue > 0 && (
                <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <div>
                        <p className="text-[10px] text-red-400">지연</p>
                        <p className="text-sm font-bold text-red-400">{stats.overdue}</p>
                    </div>
                </div>
            )}
            {stats.dueSoon > 0 && (
                <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <div>
                        <p className="text-[10px] text-amber-400">마감 임박</p>
                        <p className="text-sm font-bold text-amber-400">{stats.dueSoon}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── 태스크 상세 다이얼로그 ──────────────────────────────────────────────────

function TaskDetailDialog({
    taskId,
    open,
    onOpenChange,
}: {
    taskId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!taskId || !open) return;
        setLoading(true);
        getTaskDetailsForModal(taskId).then((res) => {
            if (res.success) setTask(res.data);
            setLoading(false);
        });
    }, [taskId, open]);

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                ) : task ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-base leading-tight pr-6">{task.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 mt-2">
                            {/* 상태 + 우선순위 */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                    {task.status === "TODO" ? "할 일" : task.status === "IN_PROGRESS" ? "진행 중" : "완료"}
                                </Badge>
                                {task.endDate && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <CalendarClock className="h-3 w-3" />
                                        마감: {task.endDate}
                                    </span>
                                )}
                            </div>

                            {/* 담당자 */}
                            {task.assigneeNames && task.assigneeNames.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                    {task.assigneeNames.map((name: string, i: number) => (
                                        <Badge key={i} variant="secondary" className="text-[10px]">{name}</Badge>
                                    ))}
                                </div>
                            )}

                            {/* 내용 */}
                            {task.content && (
                                <div className="bg-muted/40 rounded-lg p-3 text-sm whitespace-pre-wrap">
                                    {task.content}
                                </div>
                            )}

                            {/* 하위업무 */}
                            {task.subTasks && task.subTasks.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                                        하위업무 ({task.subTasks.filter((s: any) => s.isCompleted).length}/{task.subTasks.length})
                                    </p>
                                    <div className="space-y-1">
                                        {task.subTasks.map((st: any) => (
                                            <div
                                                key={st.id}
                                                className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                                                    st.isCompleted ? "text-muted-foreground line-through" : ""
                                                }`}
                                            >
                                                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] ${
                                                    st.isCompleted ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "border-muted-foreground/30"
                                                }`}>
                                                    {st.isCompleted && "✓"}
                                                </span>
                                                {st.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 첨부 파일 */}
                            {task.fileUrl && (
                                <a
                                    href={task.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline"
                                >
                                    📎 첨부 파일 보기
                                </a>
                            )}
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">업무를 찾을 수 없습니다.</p>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ─── KanbanCard ──────────────────────────────────────────────────────────────

function KanbanCard({
    task,
    isDragging = false,
    onClick,
}: {
    task: KanbanTask;
    isDragging?: boolean;
    onClick?: () => void;
}) {
    const pc = PRIORITY_CONFIG[task.priority];
    const subProgress =
        task.subTaskTotal > 0
            ? Math.round((task.subTaskDone / task.subTaskTotal) * 100)
            : null;
    const daysUntilDue = getDaysUntilDue(task.endDate);
    const isOverdue = task.status !== "DONE" && daysUntilDue !== null && daysUntilDue < 0;
    const isDueSoon = task.status !== "DONE" && daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 3;

    return (
        <div
            onClick={onClick}
            className={`bg-card border rounded-xl p-3.5 shadow-sm transition-all duration-200 ${
                isDragging
                    ? "shadow-xl rotate-2 scale-105 border-primary/50 opacity-90"
                    : "hover:shadow-md hover:border-primary/30 cursor-pointer"
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
                                    : isDueSoon
                                    ? "text-amber-400 font-semibold"
                                    : "text-muted-foreground"
                            }`}
                        >
                            <CalendarClock className="h-2.5 w-2.5" />
                            {isOverdue
                                ? `D+${Math.abs(daysUntilDue!)}`
                                : daysUntilDue === 0
                                ? "오늘"
                                : daysUntilDue !== null && daysUntilDue <= 3
                                ? `D-${daysUntilDue}`
                                : format(new Date(task.endDate), "M/d", { locale: ko })}
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

function SortableKanbanCard({ task, onCardClick }: { task: KanbanTask; onCardClick: (id: string) => void }) {
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
            <KanbanCard
                task={task}
                onClick={() => {
                    if (!isDragging) onCardClick(task.id);
                }}
            />
        </div>
    );
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 8;

function KanbanColumn({
    config,
    tasks,
    onCardClick,
}: {
    config: (typeof COLUMN_CONFIG)[number];
    tasks: KanbanTask[];
    onCardClick: (id: string) => void;
}) {
    const [page, setPage] = useState(1);

    const totalPages = Math.ceil(tasks.length / ITEMS_PER_PAGE) || 1;
    const paginatedTasks = tasks.slice(
        (page - 1) * ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE
    );

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
                        <SortableKanbanCard key={task.id} task={task} onCardClick={onCardClick} />
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
    projectId?: string;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
    const user = useStore(useAuthStore, (s) => s.user);

    const [tasks, setTasks] = useState<KanbanTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
    const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // 상세 다이얼로그
    const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // 필터
    const [searchQuery, setSearchQuery] = useState("");
    const [priorityFilter, setPriorityFilter] = useState<KanbanPriority[]>([]);
    const [projectFilter, setProjectFilter] = useState<string>("ALL");
    const [specialFilter, setSpecialFilter] = useState<SpecialFilter | null>(null);
    const [sortOption, setSortOption] = useState<SortOption>("default");

    // 토스트 자동 닫힘
    useEffect(() => {
        if (!toastMsg) return;
        const t = setTimeout(() => setToastMsg(null), 3000);
        return () => clearTimeout(t);
    }, [toastMsg]);

    // 센서
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

    // ─ 프로젝트 목록 (크로스 프로젝트 칸반에서만)
    const projectOptions = useMemo(() => {
        if (projectId) return [];
        const map = new Map<string, string>();
        for (const t of tasks) {
            if (t.projectId && t.projectName) {
                map.set(t.projectId, t.projectName);
            }
        }
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [tasks, projectId]);

    // ─ 필터 적용
    const filteredTasks = useMemo(() => {
        let result = tasks.filter((t) => {
            // 텍스트 검색
            if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            // 우선순위 필터
            if (priorityFilter.length > 0 && !priorityFilter.includes(t.priority)) return false;
            // 프로젝트 필터
            if (projectFilter !== "ALL" && t.projectId !== projectFilter) return false;
            // 특수 필터
            if (specialFilter === "overdue") {
                return t.status !== "DONE" && t.endDate && new Date(t.endDate) < new Date();
            }
            if (specialFilter === "dueSoon") {
                if (t.status === "DONE") return false;
                const d = getDaysUntilDue(t.endDate);
                return d !== null && d >= 0 && d <= 3;
            }
            if (specialFilter === "urgent") {
                return t.isUrgent;
            }
            return true;
        });

        result = sortTasks(result, sortOption);
        return result;
    }, [tasks, searchQuery, priorityFilter, projectFilter, specialFilter, sortOption]);

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

    // 활성 필터 개수
    const activeFilterCount = [
        searchQuery ? 1 : 0,
        priorityFilter.length > 0 ? 1 : 0,
        projectFilter !== "ALL" ? 1 : 0,
        specialFilter ? 1 : 0,
    ].reduce((a, b) => a + b, 0);

    const clearAllFilters = () => {
        setSearchQuery("");
        setPriorityFilter([]);
        setProjectFilter("ALL");
        setSpecialFilter(null);
        setSortOption("default");
    };

    // ─ 카드 클릭
    const handleCardClick = (taskId: string) => {
        setDetailTaskId(taskId);
        setDetailOpen(true);
    };

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
        const currentTask = tasks.find((t) => t.id === activeId);
        if (!currentTask) return;

        const newStatus = currentTask.status;
        const originalStatus = active.data.current?.status as KanbanStatus;

        if (newStatus === originalStatus) return;

        const result = await updateTaskStatusByKanban(activeId, newStatus, user.id);
        if (!result.success) {
            setToastMsg({ type: "error", message: result.error || "잠시 후 다시 시도해주세요." });
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
            {/* 토스트 */}
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

            {/* 통계 요약 */}
            <StatsSummary tasks={tasks} />

            {/* 필터 바 */}
            <div className="flex items-center gap-2 flex-wrap">
                {/* 검색 */}
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="업무 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-sm"
                    />
                </div>

                {/* 프로젝트 필터 (크로스 프로젝트 칸반에서만) */}
                {!projectId && projectOptions.length > 1 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5">
                                <FolderOpen className="h-3.5 w-3.5" />
                                {projectFilter === "ALL"
                                    ? "전체 프로젝트"
                                    : projectOptions.find((p) => p.id === projectFilter)?.name || "프로젝트"}
                                <ChevronDown className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuCheckboxItem
                                checked={projectFilter === "ALL"}
                                onCheckedChange={() => setProjectFilter("ALL")}
                            >
                                전체 프로젝트
                            </DropdownMenuCheckboxItem>
                            {projectOptions.map((p) => (
                                <DropdownMenuCheckboxItem
                                    key={p.id}
                                    checked={projectFilter === p.id}
                                    onCheckedChange={() => setProjectFilter(projectFilter === p.id ? "ALL" : p.id)}
                                >
                                    {p.name}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {/* 우선순위 필터 */}
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

                {/* 특수 필터 토글 */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setSpecialFilter(specialFilter === "overdue" ? null : "overdue")}
                        className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                            specialFilter === "overdue"
                                ? "bg-red-500/10 border-red-500/30 text-red-400"
                                : "border-transparent text-muted-foreground hover:bg-muted"
                        }`}
                    >
                        지연
                    </button>
                    <button
                        onClick={() => setSpecialFilter(specialFilter === "dueSoon" ? null : "dueSoon")}
                        className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                            specialFilter === "dueSoon"
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                : "border-transparent text-muted-foreground hover:bg-muted"
                        }`}
                    >
                        마감 임박
                    </button>
                    <button
                        onClick={() => setSpecialFilter(specialFilter === "urgent" ? null : "urgent")}
                        className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                            specialFilter === "urgent"
                                ? "bg-red-500/10 border-red-500/30 text-red-400"
                                : "border-transparent text-muted-foreground hover:bg-muted"
                        }`}
                    >
                        긴급
                    </button>
                </div>

                {/* 정렬 */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 ml-auto">
                            <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                            <span className="text-xs">{SORT_OPTIONS.find((s) => s.value === sortOption)?.label}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {SORT_OPTIONS.map((s) => (
                            <DropdownMenuCheckboxItem
                                key={s.value}
                                checked={sortOption === s.value}
                                onCheckedChange={() => setSortOption(s.value)}
                            >
                                {s.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* 필터 초기화 */}
                {activeFilterCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs text-muted-foreground"
                        onClick={clearAllFilters}
                    >
                        <X className="h-3 w-3" />
                        필터 초기화
                    </Button>
                )}

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{filteredTasks.length}개</span>
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
                            onCardClick={handleCardClick}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeTask ? (
                        <KanbanCard task={activeTask} isDragging />
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* 태스크 상세 다이얼로그 */}
            <TaskDetailDialog
                taskId={detailTaskId}
                open={detailOpen}
                onOpenChange={setDetailOpen}
            />
        </div>
    );
}

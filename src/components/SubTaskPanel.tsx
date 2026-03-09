"use client";

import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { Check, Plus, Trash2, Pencil, ChevronRight, Calendar, User, Search, Filter, MessageSquare, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubTask } from "@/store/useTaskStore";
import { SubTaskFormPanel } from "@/components/SubTaskFormPanel";
import { useAuthStore } from "@/store/useAuthStore";
import { addSubTaskComment, getSubTaskComments, deleteSubTaskComment } from "@/app/actions/subtask-comment";
import { updateSubTask } from "@/app/actions/task";

interface SubTaskPanelProps {
    taskId: string;
    subTasks: SubTask[];
    readonly?: boolean;
    projectParticipants?: string[];
    onToggle: (subTaskId: string) => void;
    onAdd: (data: { title: string; description?: string; assigneeId?: string; dueDate?: string; endDate?: string }) => void;
    onDelete: (subTaskId: string) => void;
    onUpdate: (subTaskId: string, data: { title?: string; description?: string; assigneeId?: string; dueDate?: string; endDate?: string }) => void;
    onClose: () => void;
}

type FilterType = "all" | "incomplete" | "mine" | "done";

// Phase 3: 상태 뱃지 컴포넌트
const StatusBadge = ({ status }: { status?: string }) => {
    const config: Record<string, { label: string; icon: string; className: string }> = {
        TODO: { label: "대기", icon: "⚪", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" },
        IN_PROGRESS: { label: "진행 중", icon: "🔵", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
        DONE: { label: "완료", icon: "✅", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
    };

    const s = config[status || "TODO"] || config.TODO;
    return (
        <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium ${s.className}`}>
            {s.icon} {s.label}
        </span>
    );
};

// Phase 4: 코멘트 섹션
interface Comment {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: string;
}

function CommentSection({ subTaskId }: { subTaskId: string }) {
    const user = useAuthStore((state) => state.user);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (expanded) {
            loadComments();
        }
    }, [expanded, subTaskId]);

    const loadComments = async () => {
        const res = await getSubTaskComments(subTaskId);
        if (res.success && res.data) {
            setComments(res.data);
        }
    };

    const handleAdd = async () => {
        if (!newComment.trim() || !user) return;
        setLoading(true);
        const res = await addSubTaskComment({
            subTaskId,
            content: newComment.trim(),
            authorId: user.id,
        });
        if (res.success && res.data) {
            setComments(prev => [...prev, res.data!]);
            setNewComment("");
        }
        setLoading(false);
    };

    const handleDelete = async (commentId: string) => {
        if (!user) return;
        const res = await deleteSubTaskComment(commentId, user.id);
        if (res.success) {
            setComments(prev => prev.filter(c => c.id !== commentId));
        }
    };

    if (!expanded) {
        return (
            <button
                onClick={() => setExpanded(true)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
                <MessageSquare className="h-3 w-3" />
                코멘트
            </button>
        );
    }

    return (
        <div className="mt-2 border-t pt-2 space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> 코멘트 ({comments.length})
                </span>
                <button onClick={() => setExpanded(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                </button>
            </div>

            {/* 코멘트 목록 */}
            <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                {comments.length === 0 && (
                    <p className="text-[10px] text-muted-foreground">아직 코멘트가 없습니다.</p>
                )}
                {comments.map(c => (
                    <div key={c.id} className="flex items-start gap-1.5 group">
                        <div className="flex-1 bg-muted/50 rounded px-2 py-1">
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] font-semibold">{c.authorName}</span>
                                <span className="text-[9px] text-muted-foreground">
                                    {format(new Date(c.createdAt), "MM/dd HH:mm")}
                                </span>
                            </div>
                            <p className="text-xs">{c.content}</p>
                        </div>
                        {user?.id === c.authorId && (
                            <button
                                onClick={() => handleDelete(c.id)}
                                className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity mt-1"
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* 입력 */}
            <div className="flex items-center gap-1">
                <Input
                    placeholder="코멘트 입력..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAdd()}
                    className="h-7 text-xs"
                />
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={handleAdd}
                    disabled={loading || !newComment.trim()}
                >
                    <Send className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}

export function SubTaskPanel({
    taskId,
    subTasks,
    readonly = false,
    projectParticipants = [],
    onToggle,
    onAdd,
    onDelete,
    onUpdate,
    onClose,
}: SubTaskPanelProps) {
    const user = useAuthStore((state) => state.user);
    const [showForm, setShowForm] = useState(false);
    const [editingSubTask, setEditingSubTask] = useState<SubTask | null>(null);

    // Phase 2: 검색/필터
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState<FilterType>("all");
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    const completedCount = subTasks.filter(st => st.isCompleted).length;
    const totalCount = subTasks.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Phase 2: 필터링된 하위업무
    const filteredSubTasks = useMemo(() => {
        let result = subTasks;

        // 텍스트 검색
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(st =>
                st.title.toLowerCase().includes(lower) ||
                (st.description && st.description.toLowerCase().includes(lower))
            );
        }

        // 필터
        switch (filter) {
            case "incomplete":
                result = result.filter(st => !st.isCompleted);
                break;
            case "done":
                result = result.filter(st => st.isCompleted);
                break;
            case "mine":
                if (user) {
                    result = result.filter(st => st.assigneeId === user.id);
                }
                break;
        }

        return result;
    }, [subTasks, searchTerm, filter, user]);

    // Phase 3: 상태 토글 (3단계 순환: TODO → IN_PROGRESS → DONE)
    const handleStatusToggle = async (st: SubTask) => {
        if (readonly) return;
        const statusOrder: Array<'TODO' | 'IN_PROGRESS' | 'DONE'> = ['TODO', 'IN_PROGRESS', 'DONE'];
        const currentIdx = statusOrder.indexOf((st.status || 'TODO') as any);
        const nextStatus = statusOrder[(currentIdx + 1) % 3];

        // 상태가 DONE이면 isCompleted도 true, 아니면 false
        const isCompleted = nextStatus === 'DONE';

        try {
            await updateSubTask(st.id, {} as any); // status update handled separately
            // 낙관적 업데이트: onToggle 대신 onUpdate 호출
            if (nextStatus === 'DONE' && !st.isCompleted) {
                onToggle(st.id); // 체크박스 토글 (isCompleted + status 동기화)
            } else if (nextStatus !== 'DONE' && st.isCompleted) {
                onToggle(st.id); // 체크 해제
            }
        } catch (error) {
            console.error("Failed to update sub-task status:", error);
        }
    };

    const handleAdd = (data: { title: string; description?: string; assigneeId?: string; dueDate?: string; endDate?: string }) => {
        // "none" 협업자 선택 시 미지정으로 처리
        if (data.assigneeId === "none") data.assigneeId = undefined;
        onAdd(data);
        setShowForm(false);
    };

    const handleUpdate = (data: { title?: string; description?: string; assigneeId?: string; dueDate?: string; endDate?: string }) => {
        if (!editingSubTask) return;
        if (data.assigneeId === "none") data.assigneeId = undefined;
        onUpdate(editingSubTask.id, data);
        setEditingSubTask(null);
    };

    const filterLabels: Record<FilterType, string> = {
        all: "전체",
        incomplete: "미완료",
        mine: "내 담당",
        done: "완료",
    };

    return (
        <div className="flex flex-col h-full">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <h3 className="font-semibold text-sm">📋 하위 업무</h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Phase 2: 검색 + 필터 */}
            <div className="px-4 py-2 border-b space-y-2">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                            placeholder="하위 업무 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-7 text-xs pl-7"
                        />
                    </div>
                    <div className="relative">
                        <Button
                            variant={filter !== "all" ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => setShowFilterMenu(!showFilterMenu)}
                        >
                            <Filter className="h-3 w-3" />
                            {filterLabels[filter]}
                        </Button>
                        {showFilterMenu && (
                            <div className="absolute right-0 top-8 z-50 bg-popover border rounded-md shadow-md py-1 min-w-[100px]">
                                {(Object.keys(filterLabels) as FilterType[]).map(f => (
                                    <button
                                        key={f}
                                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors ${filter === f ? "bg-muted font-semibold" : ""
                                            }`}
                                        onClick={() => {
                                            setFilter(f);
                                            setShowFilterMenu(false);
                                        }}
                                    >
                                        {filterLabels[f]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 프로그레스 바 */}
            {totalCount > 0 && (
                <div className="px-4 py-2 border-b">
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">진행률</span>
                        <span className="font-semibold">{progressPercent}% ({completedCount}/{totalCount})</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                                width: `${progressPercent}%`,
                                backgroundColor: progressPercent === 100 ? '#22c55e' : progressPercent >= 50 ? '#3b82f6' : '#f59e0b',
                            }}
                        />
                    </div>
                </div>
            )}

            {/* 하위 업무 리스트 */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {filteredSubTasks.length === 0 && !showForm && (
                    <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">
                            {searchTerm || filter !== "all"
                                ? "검색/필터 조건에 맞는 하위 업무가 없습니다."
                                : "하위 업무가 없습니다."
                            }
                        </p>
                        {!readonly && !searchTerm && filter === "all" && (
                            <p className="text-xs mt-1">아래 버튼으로 추가해보세요.</p>
                        )}
                    </div>
                )}

                {filteredSubTasks.map(st => (
                    <div
                        key={st.id}
                        className={`group rounded-lg border p-3 transition-all ${st.isCompleted ? "bg-muted/40 opacity-70" : "bg-card hover:border-primary/30"
                            }`}
                    >
                        <div className="flex items-start gap-2">
                            {/* Phase 3: 상태 뱃지 (클릭 시 3단계 토글) */}
                            <button
                                onClick={() => !readonly && onToggle(st.id)}
                                disabled={readonly}
                                className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border flex items-center justify-center transition-colors
                                    ${st.isCompleted
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : st.status === 'IN_PROGRESS'
                                            ? "bg-blue-500 border-blue-500 text-white"
                                            : "border-muted-foreground/30 hover:border-primary"}
                                    ${readonly ? "cursor-default" : "cursor-pointer"}`}
                            >
                                {st.isCompleted && <Check className="h-3 w-3" />}
                                {st.status === 'IN_PROGRESS' && !st.isCompleted && (
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                )}
                            </button>

                            <div className="flex-1 min-w-0">
                                {/* 제목 + 상태 뱃지 */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-sm font-medium ${st.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                                        {st.title}
                                    </span>
                                    <StatusBadge status={st.status || (st.isCompleted ? 'DONE' : 'TODO')} />
                                </div>

                                {/* 설명 */}
                                {st.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{st.description}</p>
                                )}

                                {/* 메타 정보 */}
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {st.assigneeId && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-medium">
                                            <User className="h-2.5 w-2.5" />
                                            {st.assigneeId}
                                        </span>
                                    )}
                                    {st.dueDate && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                            <Calendar className="h-2.5 w-2.5" />
                                            {st.dueDate}{st.endDate && st.endDate !== st.dueDate ? ` ~ ${st.endDate}` : ""}
                                        </span>
                                    )}
                                </div>

                                {/* Phase 4: 코멘트 섹션 */}
                                <CommentSection subTaskId={st.id} />
                            </div>

                            {/* 수정/삭제 */}
                            {!readonly && (
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingSubTask(st)}>
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive"
                                        onClick={() => {
                                            if (confirm("이 하위 업무를 삭제하시겠습니까?")) {
                                                onDelete(st.id);
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* 수정 폼 */}
                {editingSubTask && (
                    <SubTaskFormPanel
                        mode="edit"
                        projectParticipants={projectParticipants}
                        initialData={{
                            title: editingSubTask.title,
                            description: editingSubTask.description,
                            assigneeId: editingSubTask.assigneeId,
                            dueDate: editingSubTask.dueDate,
                            endDate: editingSubTask.endDate,
                        }}
                        onSubmit={handleUpdate}
                        onCancel={() => setEditingSubTask(null)}
                    />
                )}

                {/* 생성 폼 */}
                {showForm && !editingSubTask && (
                    <SubTaskFormPanel
                        mode="create"
                        projectParticipants={projectParticipants}
                        onSubmit={handleAdd}
                        onCancel={() => setShowForm(false)}
                    />
                )}
            </div>

            {/* 추가 버튼 */}
            {!readonly && !showForm && !editingSubTask && (
                <div className="px-4 py-3 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={() => setShowForm(true)}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        하위 업무 추가
                    </Button>
                </div>
            )}
        </div>
    );
}

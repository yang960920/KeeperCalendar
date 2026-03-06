"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Check, Plus, Trash2, Pencil, ChevronRight, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubTask } from "@/store/useTaskStore";
import { SubTaskFormPanel } from "@/components/SubTaskFormPanel";

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
    const [showForm, setShowForm] = useState(false);
    const [editingSubTask, setEditingSubTask] = useState<SubTask | null>(null);

    const completedCount = subTasks.filter(st => st.isCompleted).length;
    const totalCount = subTasks.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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

    return (
        <div className="flex flex-col h-full">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <h3 className="font-semibold text-sm">📋 하위 업무</h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
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
                {subTasks.length === 0 && !showForm && (
                    <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">하위 업무가 없습니다.</p>
                        {!readonly && (
                            <p className="text-xs mt-1">아래 버튼으로 추가해보세요.</p>
                        )}
                    </div>
                )}

                {subTasks.map(st => (
                    <div
                        key={st.id}
                        className={`group rounded-lg border p-3 transition-all ${st.isCompleted ? "bg-muted/40 opacity-70" : "bg-card hover:border-primary/30"
                            }`}
                    >
                        <div className="flex items-start gap-2">
                            {/* 체크박스 */}
                            <button
                                onClick={() => !readonly && onToggle(st.id)}
                                disabled={readonly}
                                className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border flex items-center justify-center transition-colors
                                    ${st.isCompleted
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "border-muted-foreground/30 hover:border-primary"}
                                    ${readonly ? "cursor-default" : "cursor-pointer"}`}
                            >
                                {st.isCompleted && <Check className="h-3 w-3" />}
                            </button>

                            <div className="flex-1 min-w-0">
                                {/* 제목 */}
                                <span className={`text-sm font-medium ${st.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                                    {st.title}
                                </span>

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

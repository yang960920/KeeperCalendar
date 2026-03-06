"use client";

import { useState } from "react";
import { Check, Plus, Trash2, Pencil, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubTask } from "@/store/useTaskStore";

interface SubTaskListProps {
    taskId: string;
    subTasks: SubTask[];
    readonly?: boolean;
    onToggle: (subTaskId: string) => void;
    onAdd: (title: string) => void;
    onDelete: (subTaskId: string) => void;
    onUpdate: (subTaskId: string, title: string) => void;
}

export function SubTaskList({ taskId, subTasks, readonly = false, onToggle, onAdd, onDelete, onUpdate }: SubTaskListProps) {
    const [newTitle, setNewTitle] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");

    const completedCount = subTasks.filter(st => st.isCompleted).length;
    const totalCount = subTasks.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const handleAdd = () => {
        const trimmed = newTitle.trim();
        if (!trimmed) return;
        onAdd(trimmed);
        setNewTitle("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
        }
    };

    const startEdit = (st: SubTask) => {
        setEditingId(st.id);
        setEditTitle(st.title);
    };

    const saveEdit = () => {
        if (editingId && editTitle.trim()) {
            onUpdate(editingId, editTitle.trim());
        }
        setEditingId(null);
        setEditTitle("");
    };

    return (
        <div className="space-y-3">
            {/* 프로그레스 바 */}
            {totalCount > 0 && (
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-medium">📊 진행률</span>
                        <span className="font-semibold">{progressPercent}% ({completedCount}/{totalCount})</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
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

            {/* 하위 업무 목록 */}
            <div className="space-y-1">
                <span className="text-sm font-medium text-muted-foreground">📋 하위 업무</span>
                {subTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground/60 py-2">하위 업무가 없습니다.</p>
                )}
                {subTasks.map(st => (
                    <div key={st.id} className="flex items-center gap-2 group py-1">
                        {/* 체크박스 */}
                        <button
                            onClick={() => !readonly && onToggle(st.id)}
                            disabled={readonly}
                            className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors
                                ${st.isCompleted
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-muted-foreground/30 hover:border-primary"}
                                ${readonly ? "cursor-default" : "cursor-pointer"}`}
                        >
                            {st.isCompleted && <Check className="h-3 w-3" />}
                        </button>

                        {/* 제목 (수정 모드 / 일반 모드) */}
                        {editingId === st.id ? (
                            <div className="flex-1 flex items-center gap-1">
                                <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                                    className="h-7 text-sm"
                                    autoFocus
                                />
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}>
                                    <Save className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <span className={`flex-1 text-sm ${st.isCompleted ? "line-through text-muted-foreground/60" : ""}`}>
                                    {st.title}
                                </span>
                                {/* 수정/삭제 버튼 (참여자만) */}
                                {!readonly && (
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(st)}>
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(st.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* 추가 입력 (참여자만) */}
            {!readonly && (
                <div className="flex items-center gap-2 pt-1">
                    <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="하위 업무 추가..."
                        className="h-8 text-sm"
                    />
                    <Button variant="outline" size="sm" className="h-8 px-3" onClick={handleAdd} disabled={!newTitle.trim()}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> 추가
                    </Button>
                </div>
            )}
        </div>
    );
}

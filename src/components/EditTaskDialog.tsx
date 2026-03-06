"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Task, useTaskStore } from "@/store/useTaskStore";
import { useAuthStore } from "@/store/useAuthStore";
import { deleteTask as deleteTaskAction, addSubTask, toggleSubTask, deleteSubTask, updateSubTask } from "@/app/actions/task";
import { SubTaskList } from "@/components/SubTaskList";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface EditTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: Task | null;
    readonly?: boolean;
}

export const EditTaskDialog = ({ open, onOpenChange, task, readonly = false }: EditTaskDialogProps) => {
    const updateTask = useTaskStore((state) => state.updateTask);
    const deleteTaskLocal = useTaskStore((state) => state.deleteTask);
    const addSubTaskLocal = useTaskStore((state) => state.addSubTaskLocal);
    const toggleSubTaskLocalFn = useTaskStore((state) => state.toggleSubTaskLocal);
    const deleteSubTaskLocalFn = useTaskStore((state) => state.deleteSubTaskLocal);
    const updateSubTaskLocalFn = useTaskStore((state) => state.updateSubTaskLocal);
    const user = useAuthStore((state) => state.user);

    const [date, setDate] = useState("");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("기획");
    const [planned, setPlanned] = useState<string>("1");
    const [done, setDone] = useState<string>("0");
    const [fileUrl, setFileUrl] = useState<string>("");

    // task prop이 바뀔 때 다이얼로그 데이터 초기화
    useEffect(() => {
        if (task) {
            setDate(task.date);
            setTitle(task.title);
            setContent(task.content || "");
            setCategory(task.category);
            setPlanned(String(task.planned));
            setDone(String(task.done));
            setFileUrl(task.fileUrl || "");
        }
    }, [task]);

    // 파일 첨부 핸들러 (임시로 브라우저 메모리에 로컬 Blob URL 생성)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            setFileUrl(url);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!task) return;

        const plannedNum = parseFloat(planned);
        const doneNum = parseFloat(done);

        if (isNaN(plannedNum) || isNaN(doneNum) || plannedNum <= 0) {
            alert("계획량은 0보다 커야 하며, 숫자로 입력해주세요.");
            return;
        }

        if (readonly) {
            // 참여자: 텍스트 내용(결과보고) 및 첨부파일만 업데이트 가능
            updateTask(task.id, {
                content,
                fileUrl,
            });
        } else {
            // 생성자: 모든 필드 변경 가능
            updateTask(task.id, {
                date,
                title,
                content,
                fileUrl,
                category,
                planned: plannedNum,
                done: doneNum,
                weight: 1, // Default
            });
        }

        onOpenChange(false);
    };

    const handleDelete = async () => {
        if (!task) return;
        if (window.confirm("정말 이 업무를 삭제하시겠습니까?")) {
            // DB에서 먼저 삭제
            const res = await deleteTaskAction(task.id, user?.id);
            if (res.success) {
                // 로컬 Zustand에서도 삭제
                deleteTaskLocal(task.id);
                onOpenChange(false);
            } else {
                alert(res.error || "삭제에 실패했습니다.");
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{readonly ? "업무 기록열람 및 결과보고" : "업무 기록(Task) 수정"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="edit-date">날짜 (YYYY-MM-DD)</Label>
                        <Input
                            id="edit-date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                            disabled={readonly}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-title">업무명</Label>
                        <Input
                            id="edit-title"
                            placeholder="예: 주간 기획안 작성"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            disabled={readonly}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-content">업무 상세 및 결과 내용</Label>
                        <Textarea
                            id="edit-content"
                            placeholder={readonly ? "업무 수행 결과를 작성해주세요..." : "상세한 업무 내용을 입력하세요..."}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-file">첨부 파일 (기존 파일 변경)</Label>
                        <Input
                            id="edit-file"
                            type="file"
                            onChange={handleFileChange}
                            className="text-sm cursor-pointer"
                        />
                        {fileUrl && (
                            <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:text-blue-400 underline truncate max-w-full block mt-1"
                            >
                                📎 첨부파일 다운로드 / 보기
                            </a>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-category">카테고리</Label>
                        <Select value={category} onValueChange={setCategory} disabled={readonly}>
                            <SelectTrigger>
                                <SelectValue placeholder="카테고리 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="기획">기획</SelectItem>
                                <SelectItem value="개발">개발</SelectItem>
                                <SelectItem value="디자인">디자인</SelectItem>
                                <SelectItem value="회의">회의</SelectItem>
                                <SelectItem value="영업">영업</SelectItem>
                                <SelectItem value="기타">기타</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-planned">계획량 (목표)</Label>
                            <Input
                                id="edit-planned"
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={planned}
                                onChange={(e) => setPlanned(e.target.value)}
                                required
                                disabled={readonly}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-done">실행량 (달성)</Label>
                            <Input
                                id="edit-done"
                                type="number"
                                step="0.1"
                                min="0"
                                value={done}
                                onChange={(e) => setDone(e.target.value)}
                                required
                                disabled={readonly}
                            />
                        </div>
                    </div>

                    {/* 하위 업무 체크리스트 */}
                    {task && (
                        <div className="border-t pt-4">
                            <SubTaskList
                                taskId={task.id}
                                subTasks={task.subTasks || []}
                                readonly={readonly}
                                onToggle={async (subTaskId) => {
                                    toggleSubTaskLocalFn(task.id, subTaskId);
                                    await toggleSubTask(subTaskId);
                                }}
                                onAdd={async (title) => {
                                    const res = await addSubTask(task.id, title);
                                    if (res.success && res.data) {
                                        addSubTaskLocal(task.id, {
                                            id: res.data.id,
                                            title: res.data.title,
                                            isCompleted: res.data.isCompleted,
                                            completedAt: res.data.completedAt?.toISOString(),
                                        });
                                    }
                                }}
                                onDelete={async (subTaskId) => {
                                    deleteSubTaskLocalFn(task.id, subTaskId);
                                    await deleteSubTask(subTaskId);
                                }}
                                onUpdate={async (subTaskId, title) => {
                                    updateSubTaskLocalFn(task.id, subTaskId, title);
                                    await updateSubTask(subTaskId, title);
                                }}
                            />
                        </div>
                    )}

                    <div className="flex gap-2 mt-4">
                        {!readonly && (
                            <Button type="button" variant="destructive" onClick={handleDelete} className="flex-1">
                                삭제
                            </Button>
                        )}
                        <Button type="submit" className="flex-1">
                            {readonly ? "파일/결과 저장" : "수정 저장"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

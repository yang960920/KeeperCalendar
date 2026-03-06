"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ChevronRight, ListTodo } from "lucide-react";
import { Task, useTaskStore } from "@/store/useTaskStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectStore } from "@/store/useProjectStore";
import { deleteTask as deleteTaskAction, addSubTask, toggleSubTask, deleteSubTask, updateSubTask } from "@/app/actions/task";
import { SubTaskPanel } from "@/components/SubTaskPanel";
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
    const projects = useProjectStore((state) => state.projects);

    const [date, setDate] = useState("");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("기획");
    const [planned, setPlanned] = useState<string>("1");
    const [done, setDone] = useState<string>("0");
    const [fileUrl, setFileUrl] = useState<string>("");
    const [showSubTaskPanel, setShowSubTaskPanel] = useState(false);

    // 프로젝트 참여자 목록
    const project = task?.projectId ? projects.find(p => p.id === task.projectId) : null;
    const projectParticipants = project?.participantIds || [];

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
            setShowSubTaskPanel(false);
        }
    }, [task]);

    // 파일 첨부 핸들러
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
            updateTask(task.id, {
                content,
                fileUrl,
            });
        } else {
            updateTask(task.id, {
                date,
                title,
                content,
                fileUrl,
                category,
                planned: plannedNum,
                done: doneNum,
                weight: 1,
            });
        }

        onOpenChange(false);
    };

    const handleDelete = async () => {
        if (!task) return;
        if (window.confirm("정말 이 업무를 삭제하시겠습니까?")) {
            const res = await deleteTaskAction(task.id, user?.id);
            if (res.success) {
                deleteTaskLocal(task.id);
                onOpenChange(false);
            } else {
                alert(res.error || "삭제에 실패했습니다.");
            }
        }
    };

    const subTaskCount = task?.subTasks?.length || 0;
    const completedSubTasks = task?.subTasks?.filter(st => st.isCompleted).length || 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={`transition-all duration-300 max-h-[90vh] overflow-hidden ${showSubTaskPanel ? "sm:max-w-[900px]" : "sm:max-w-[500px]"
                    }`}
            >
                <div className="flex h-full">
                    {/* 좌측: 기존 업무 수정 폼 */}
                    <div className={`overflow-y-auto transition-all duration-300 ${showSubTaskPanel ? "w-1/2 pr-4 border-r" : "w-full"
                        }`}>
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

                            {/* 하위업무 확인하기 버튼 */}
                            {task && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full gap-2 mt-1"
                                    onClick={() => setShowSubTaskPanel(!showSubTaskPanel)}
                                >
                                    <ListTodo className="h-4 w-4" />
                                    하위업무 확인하기
                                    {subTaskCount > 0 && (
                                        <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                            {completedSubTasks}/{subTaskCount}
                                        </span>
                                    )}
                                    <ChevronRight className={`h-4 w-4 transition-transform ${showSubTaskPanel ? "rotate-180" : ""}`} />
                                </Button>
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
                    </div>

                    {/* 우측: 하위업무 슬라이드 패널 */}
                    {showSubTaskPanel && task && (
                        <div className="w-1/2 pl-4 animate-in slide-in-from-right-4 duration-200">
                            <SubTaskPanel
                                taskId={task.id}
                                subTasks={task.subTasks || []}
                                readonly={readonly}
                                projectParticipants={projectParticipants}
                                onClose={() => setShowSubTaskPanel(false)}
                                onToggle={async (subTaskId) => {
                                    toggleSubTaskLocalFn(task.id, subTaskId);
                                    await toggleSubTask(subTaskId);
                                }}
                                onAdd={async (data) => {
                                    const res = await addSubTask(task.id, data);
                                    if (res.success && res.data) {
                                        addSubTaskLocal(task.id, {
                                            id: res.data.id,
                                            title: res.data.title,
                                            description: res.data.description || undefined,
                                            isCompleted: res.data.isCompleted,
                                            completedAt: res.data.completedAt?.toISOString(),
                                            assigneeId: res.data.assigneeId || undefined,
                                            dueDate: res.data.dueDate?.toISOString().split("T")[0],
                                            endDate: res.data.endDate?.toISOString().split("T")[0],
                                        });
                                    }
                                }}
                                onDelete={async (subTaskId) => {
                                    deleteSubTaskLocalFn(task.id, subTaskId);
                                    await deleteSubTask(subTaskId);
                                }}
                                onUpdate={async (subTaskId, data) => {
                                    // Zustand 로컬 업데이트 (제목만 기존 함수 사용)
                                    if (data.title) {
                                        updateSubTaskLocalFn(task.id, subTaskId, data.title);
                                    }
                                    await updateSubTask(subTaskId, data);
                                }}
                            />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

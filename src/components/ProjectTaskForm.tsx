"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, AlertTriangle, Check } from "lucide-react";
import { useTaskStore } from "@/store/useTaskStore";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { getEmployees } from "@/app/actions/employee";
import { createTask } from "@/app/actions/task";

interface ProjectTaskFormProps {
    projectId: string;
    participants: string[];
    projectEndDate?: string;
    userRole?: "CREATOR" | "PARTICIPANT";
}

export const ProjectTaskForm = ({ projectId, participants, projectEndDate, userRole }: ProjectTaskFormProps) => {
    const addTask = useTaskStore((state) => state.addTask);
    const [open, setOpen] = useState(false);
    const [date, setDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        const today = format(new Date(), "yyyy-MM-dd");
        setDate(today);
        setEndDate(today);
        // 참가자 이름 매핑을 위해 전체 유저 목록 로드
        async function fetchUsers() {
            const res = await getEmployees();
            if (res.success && res.data) {
                setUsers(res.data);
            }
        }
        fetchUsers();
    }, []);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("기획");

    // 초기 생성 시 프로젝트 업무는 담당자가 완료하기 전까지 done=0
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
    const [isUrgent, setIsUrgent] = useState(false);

    // 업무 종료일이 프로젝트 종료일을 초과하는지 확인
    const isTaskEndDateOverProject = () => {
        if (!projectEndDate || !endDate) return false;
        return new Date(endDate) > new Date(projectEndDate);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (assigneeIds.length === 0) {
            alert("업무를 수행할 담당자를 최소 1명 선택해주세요.");
            return;
        }

        // 업무 종료일이 프로젝트 종료일을 넘기는 경우 확인
        if (isTaskEndDateOverProject()) {
            const projectEnd = format(new Date(projectEndDate!), "yyyy.MM.dd");
            const confirmed = confirm(
                `⚠️ 업무 종료일(${endDate})이 프로젝트 종료일(${projectEnd})을 초과합니다.\n\n그래도 생성하시겠습니까?`
            );
            if (!confirmed) return;
        }

        try {
            // DB 연동 (Server Action)
            const result = await createTask({
                date,
                endDate,
                title,
                content,
                category,
                planned: 1,
                projectId,
                assigneeIds,
                isUrgent,
                urgencyStatus: isUrgent
                    ? (userRole === "CREATOR" ? "PENDING_ADMIN" as const : "PENDING_CREATOR" as const)
                    : "NONE" as const,
            });

            if (result.success && result.data) {
                // 로컬 스토어 업데이트
                addTask({
                    id: result.data.id,
                    date,
                    endDate,
                    title,
                    content,
                    category,
                    planned: 1,
                    done: 0,
                    weight: 1,
                    projectId,
                    assigneeId: assigneeIds[0],
                    assigneeIds,
                } as any);

                // Reset and close
                setTitle("");
                setContent("");
                setAssigneeIds([]);
                setOpen(false);
            } else {
                alert(result.error || "업무 생성 실패");
            }
        } catch (error) {
            console.error(error);
            alert("서버 오류가 발생했습니다.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="icon" className="h-14 w-14 rounded-full shadow-lg fixed bottom-8 right-8 z-50">
                    <Plus className="h-6 w-6" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>프로젝트 업무(Task) 할당</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="date">시작일</Label>
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="endDate">종료일 (마감일)</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={endDate}
                                min={date}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                                className={isTaskEndDateOverProject() ? "border-amber-500 ring-1 ring-amber-500" : ""}
                            />
                        </div>
                    </div>

                    {/* 업무 종료일 > 프로젝트 종료일 경고 */}
                    {isTaskEndDateOverProject() && (
                        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <p className="text-xs leading-relaxed">
                                업무 종료일이 프로젝트 종료일({projectEndDate ? format(new Date(projectEndDate), "yyyy.MM.dd") : "-"})을 초과합니다.
                                프로젝트 일정에 맞게 조정하는 것을 권장합니다.
                            </p>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label>담당자 배정 (복수 선택 가능, 필수)</Label>
                        <div className="border rounded-md p-3 max-h-[160px] overflow-y-auto space-y-1">
                            {participants.length === 0 && (
                                <p className="text-xs text-muted-foreground">프로젝트에 참여 중인 팀원이 없습니다.</p>
                            )}
                            {participants.map(pId => {
                                const userObj = users.find(u => u.id === pId);
                                const isChecked = assigneeIds.includes(pId);
                                return (
                                    <label
                                        key={pId}
                                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${isChecked
                                            ? "bg-primary/10 border border-primary/30"
                                            : "hover:bg-muted/50"
                                            }`}
                                    >
                                        <div
                                            className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked
                                                ? "bg-primary border-primary text-primary-foreground"
                                                : "border-muted-foreground/30"
                                                }`}
                                        >
                                            {isChecked && <Check className="h-3 w-3" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={isChecked}
                                            onChange={() => {
                                                setAssigneeIds(prev =>
                                                    isChecked
                                                        ? prev.filter(id => id !== pId)
                                                        : [...prev, pId]
                                                );
                                            }}
                                        />
                                        <span className="text-sm">{userObj ? userObj.name : pId}</span>
                                    </label>
                                );
                            })}
                        </div>
                        {assigneeIds.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                선택됨: {assigneeIds.map(id => {
                                    const u = users.find(usr => usr.id === id);
                                    return u ? u.name : id;
                                }).join(', ')}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="title">업무명</Label>
                        <Input
                            id="title"
                            placeholder="예: 메인 페이지 컴포넌트 개발"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="content">업무 지시 내용</Label>
                        <Textarea
                            id="content"
                            placeholder="상세한 가이드라인을 입력하세요..."
                            value={content}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="category">카테고리</Label>
                        <Select value={category} onValueChange={setCategory}>
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

                    {/* 긴급 업무 토글 */}
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                        <input
                            type="checkbox"
                            id="project-urgent-toggle"
                            checked={isUrgent}
                            onChange={(e) => setIsUrgent(e.target.checked)}
                            className="w-4 h-4 accent-red-500"
                        />
                        <Label htmlFor="project-urgent-toggle" className="flex items-center gap-1.5 cursor-pointer text-sm">
                            <span>🚨</span> 긴급 업무 요청
                        </Label>
                        {isUrgent && (
                            <span className="text-xs text-red-400 ml-auto">
                                {userRole === "CREATOR" ? "관리자 승인 필요" : "부서장 검수 → 관리자 승인 필요"}
                            </span>
                        )}
                    </div>

                    <Button type="submit" className="mt-4">
                        팀원에게 업무 할당하기
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
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
}

export const ProjectTaskForm = ({ projectId, participants }: ProjectTaskFormProps) => {
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
    const [planned, setPlanned] = useState<string>("1");
    // 초기 생성 시 프로젝트 업무는 담당자가 완료하기 전까지 done=0
    const [assigneeId, setAssigneeId] = useState<string>("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!assigneeId) {
            alert("업무를 수행할 담당자를 선택해주세요.");
            return;
        }

        const plannedNum = parseFloat(planned);

        if (isNaN(plannedNum) || plannedNum <= 0) {
            alert("계획량은 0보다 커야 하며, 숫자로 입력해주세요.");
            return;
        }

        try {
            // DB 연동 (Server Action)
            const result = await createTask({
                date,
                endDate,
                title,
                content,
                category,
                planned: plannedNum,
                projectId,
                assigneeId,
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
                    planned: plannedNum,
                    done: 0,
                    weight: 1,
                    projectId,
                    assigneeId,
                } as any);

                // Reset and close
                setTitle("");
                setContent("");
                setAssigneeId("");
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
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="assignee">담당자 배정 (필수)</Label>
                        <Select value={assigneeId} onValueChange={setAssigneeId}>
                            <SelectTrigger id="assignee">
                                <SelectValue placeholder="참여 팀원 중 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                {participants.map(pId => {
                                    const userObj = users.find(u => u.id === pId);
                                    return (
                                        <SelectItem key={pId} value={pId}>
                                            {userObj ? userObj.name : pId}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
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

                    <div className="grid gap-2">
                        <Label htmlFor="planned">목표량</Label>
                        <Input
                            id="planned"
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={planned}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlanned(e.target.value)}
                            required
                        />
                    </div>

                    <Button type="submit" className="mt-4">
                        팀원에게 업무 할당하기
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

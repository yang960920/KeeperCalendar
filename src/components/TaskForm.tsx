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
import { createTask } from "@/app/actions/task";
import { SubTaskInput } from "@/components/SubTaskInput";

export const TaskForm = () => {
    const addTask = useTaskStore((state) => state.addTask);
    const [open, setOpen] = useState(false);

    const [date, setDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        const today = format(new Date(), "yyyy-MM-dd");
        setDate(today);
        setEndDate(today);
    }, []);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("기획");
    const [planned, setPlanned] = useState<string>("1");
    const [done, setDone] = useState<string>("0");
    const [fileUrl, setFileUrl] = useState<string>("");
    const [subTasks, setSubTasks] = useState<{ title: string }[]>([]);

    // 파일 첨부 핸들러 (임시로 브라우저 메모리에 로컬 Blob URL 생성)
    // 추후 서버 S3, Blob 스토리지 업로드 로직으로 교체 필요
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            setFileUrl(url);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const plannedNum = parseFloat(planned);
        const doneNum = parseFloat(done);

        if (isNaN(plannedNum) || isNaN(doneNum) || plannedNum <= 0) {
            alert("계획량은 0보다 커야 하며, 숫자로 입력해주세요.");
            return;
        }

        try {
            // DB 연동 (Server Action) - 개인 업무의 경우 assigneeId가 필수이므로 현재 사용자 ID 연동 필요
            // *단축 처리: useAuthStore를 통해 현재 사용자 정보를 가져와서 assigneeId로 주입 필요!
            const authStoreStr = localStorage.getItem("auth-storage");
            let reqAssigneeId = undefined;
            if (authStoreStr) {
                try {
                    const authState = JSON.parse(authStoreStr).state;
                    if (authState && authState.user) reqAssigneeId = authState.user.id;
                } catch (e) { }
            }

            const result = await createTask({
                date,
                endDate,
                title,
                content,
                category,
                planned: plannedNum,
                assigneeId: reqAssigneeId,
                subTasks: subTasks.length > 0 ? subTasks : undefined,
            });

            if (result.success && result.data) {
                // 로컬 스토어 업데이트
                addTask({
                    id: result.data.id,
                    date,
                    endDate,
                    title,
                    content,
                    fileUrl,
                    category,
                    planned: plannedNum,
                    done: doneNum,
                    weight: 1, // Default
                    projectId: result.data.projectId,
                    assigneeId: result.data.assigneeId || undefined,
                    subTasks: (result.data as any).subTasks?.map((st: any) => ({
                        id: st.id,
                        title: st.title,
                        isCompleted: st.isCompleted,
                        completedAt: st.completedAt || undefined,
                    })) || [],
                } as any);

                // Reset and close
                setTitle("");
                setContent("");
                setFileUrl("");
                setDone("0");
                setSubTasks([]);
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
                    <DialogTitle>새 업무(Task) 등록</DialogTitle>
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
                                min={date} // 종료일은 시작일보다 빠를 수 없음
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="title">업무명</Label>
                        <Input
                            id="title"
                            placeholder="예: 주간 기획안 작성"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="content">업무 내용</Label>
                        <Textarea
                            id="content"
                            placeholder="상세한 업무 내용을 입력하세요..."
                            value={content}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="file">첨부 파일 (고용량 지원 예정)</Label>
                        <Input
                            id="file"
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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="planned">계획량 (목표)</Label>
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
                        <div className="grid gap-2">
                            <Label htmlFor="done">실행량 (달성)</Label>
                            <Input
                                id="done"
                                type="number"
                                step="0.1"
                                min="0"
                                value={done}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDone(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* 하위 업무 입력 (개인 업무) */}
                    <SubTaskInput
                        subTasks={subTasks}
                        onAdd={(title) => setSubTasks(prev => [...prev, { title }])}
                        onRemove={(index) => setSubTasks(prev => prev.filter((_, i) => i !== index))}
                    />

                    <Button type="submit" className="mt-4">
                        업무 일지 저장하기
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

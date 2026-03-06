"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, X } from "lucide-react";
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

interface SubTaskFormPanelProps {
    projectParticipants?: string[];
    initialData?: {
        title: string;
        description?: string;
        assigneeId?: string;
        dueDate?: string;
        endDate?: string;
    };
    onSubmit: (data: {
        title: string;
        description?: string;
        assigneeId?: string;
        dueDate?: string;
        endDate?: string;
    }) => void;
    onCancel: () => void;
    mode: "create" | "edit";
}

export function SubTaskFormPanel({
    projectParticipants = [],
    initialData,
    onSubmit,
    onCancel,
    mode,
}: SubTaskFormPanelProps) {
    const [title, setTitle] = useState(initialData?.title || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [assigneeId, setAssigneeId] = useState(initialData?.assigneeId || "");
    const [dueDate, setDueDate] = useState(initialData?.dueDate || format(new Date(), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(initialData?.endDate || format(new Date(), "yyyy-MM-dd"));
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        async function fetchUsers() {
            const res = await getEmployees();
            if (res.success && res.data) {
                setUsers(res.data);
            }
        }
        fetchUsers();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({
            title: title.trim(),
            description: description.trim() || undefined,
            assigneeId: assigneeId || undefined,
            dueDate,
            endDate,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">
                    {mode === "create" ? "하위 업무 추가" : "하위 업무 수정"}
                </h4>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
                    <X className="h-3.5 w-3.5" />
                </Button>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="st-title" className="text-xs">업무명</Label>
                <Input
                    id="st-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="하위 업무 제목"
                    className="h-8 text-sm"
                    required
                    autoFocus
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="st-desc" className="text-xs">설명</Label>
                <Textarea
                    id="st-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="업무 상세 내용..."
                    rows={2}
                    className="text-sm"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                    <Label htmlFor="st-dueDate" className="text-xs">시작일</Label>
                    <Input
                        id="st-dueDate"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="h-8 text-sm"
                    />
                </div>
                <div className="grid gap-1">
                    <Label htmlFor="st-endDate" className="text-xs">종료일</Label>
                    <Input
                        id="st-endDate"
                        type="date"
                        value={endDate}
                        min={dueDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-8 text-sm"
                    />
                </div>
            </div>

            {projectParticipants.length > 0 && (
                <div className="grid gap-2">
                    <Label htmlFor="st-assignee" className="text-xs">협업자</Label>
                    <Select value={assigneeId} onValueChange={setAssigneeId}>
                        <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="협업자 선택 (선택사항)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">미지정</SelectItem>
                            {projectParticipants.map(pId => {
                                const u = users.find(u => u.id === pId);
                                return (
                                    <SelectItem key={pId} value={pId}>
                                        {u ? u.name : pId}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <Button type="submit" size="sm" className="w-full mt-2">
                {mode === "create" ? "하위 업무 추가" : "수정 저장"}
            </Button>
        </form>
    );
}

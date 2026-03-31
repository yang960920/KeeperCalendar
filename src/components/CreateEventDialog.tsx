"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createCalendarEvent } from "@/app/actions/calendar-event";
import { getEmployees } from "@/app/actions/employee";

const CATEGORY_OPTIONS = [
    { value: "MEETING",    label: "회의" },
    { value: "FIELD_WORK", label: "외근" },
    { value: "TRAINING",   label: "교육" },
    { value: "VACATION",   label: "휴가" },
    { value: "OTHER",      label: "기타" },
];

interface CreateEventDialogProps {
    currentUserId: string;
    onCreated?: () => void;
    defaultDate?: Date;  // 특정 날짜 클릭 시 기본값
}

export function CreateEventDialog({
    currentUserId,
    onCreated,
    defaultDate,
}: CreateEventDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
    const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);

    const today = defaultDate || new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    const [form, setForm] = useState({
        title: "",
        description: "",
        category: "MEETING" as "MEETING" | "FIELD_WORK" | "TRAINING" | "VACATION" | "OTHER",
        startDate: todayStr,
        startTime: "09:00",
        endDate: todayStr,
        endTime: "10:00",
        isAllDay: false,
        location: "",
    });

    useEffect(() => {
        getEmployees().then((res) => {
            if (res.success && res.data) {
                setEmployees(
                    res.data
                        .filter((e: any) => e.id !== currentUserId)
                        .map((e: any) => ({ id: e.id, name: e.name }))
                );
            }
        });
    }, [currentUserId]);

    const toggleAttendee = (id: string) => {
        setSelectedAttendees((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) return;

        setIsLoading(true);
        try {
            const startTime = form.isAllDay
                ? `${form.startDate}T00:00:00.000Z`
                : `${form.startDate}T${form.startTime}:00`;
            const endTime = form.isAllDay
                ? `${form.endDate}T23:59:59.000Z`
                : `${form.endDate}T${form.endTime}:00`;

            const result = await createCalendarEvent({
                title: form.title,
                description: form.description || undefined,
                category: form.category,
                startTime,
                endTime,
                isAllDay: form.isAllDay,
                location: form.location || undefined,
                creatorId: currentUserId,
                attendeeIds: selectedAttendees,
            });

            if (result.success) {
                setOpen(false);
                setForm({
                    title: "",
                    description: "",
                    category: "MEETING",
                    startDate: todayStr,
                    startTime: "09:00",
                    endDate: todayStr,
                    endTime: "10:00",
                    isAllDay: false,
                    location: "",
                });
                setSelectedAttendees([]);
                onCreated?.();
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                    <CalendarPlus className="h-4 w-4" />
                    일정 추가
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>새 일정 만들기</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3 mt-2">
                    {/* 제목 */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">제목 *</label>
                        <Input
                            placeholder="일정 제목"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            required
                        />
                    </div>

                    {/* 카테고리 */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">분류</label>
                        <Select
                            value={form.category}
                            onValueChange={(v) => setForm({ ...form, category: v as any })}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORY_OPTIONS.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>
                                        {c.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 종일 토글 */}
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.isAllDay}
                            onChange={(e) => setForm({ ...form, isAllDay: e.target.checked })}
                            className="rounded"
                        />
                        종일 일정
                    </label>

                    {/* 날짜/시간 */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">시작일</label>
                            <Input
                                type="date"
                                value={form.startDate}
                                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                className="h-9 text-sm"
                            />
                        </div>
                        {!form.isAllDay && (
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">시작 시간</label>
                                <Input
                                    type="time"
                                    value={form.startTime}
                                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                                    className="h-9 text-sm"
                                />
                            </div>
                        )}
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">종료일</label>
                            <Input
                                type="date"
                                value={form.endDate}
                                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                className="h-9 text-sm"
                            />
                        </div>
                        {!form.isAllDay && (
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">종료 시간</label>
                                <Input
                                    type="time"
                                    value={form.endTime}
                                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                                    className="h-9 text-sm"
                                />
                            </div>
                        )}
                    </div>

                    {/* 장소 */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">장소 (선택)</label>
                        <Input
                            placeholder="회의실, 주소 등"
                            value={form.location}
                            onChange={(e) => setForm({ ...form, location: e.target.value })}
                        />
                    </div>

                    {/* 설명 */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">설명 (선택)</label>
                        <textarea
                            placeholder="일정 설명"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full text-sm bg-background border rounded-md px-3 py-2 min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {/* 참석자 */}
                    {employees.length > 0 && (
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block">
                                참석자 초대 ({selectedAttendees.length}명 선택)
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {employees.map((emp) => {
                                    const selected = selectedAttendees.includes(emp.id);
                                    return (
                                        <button
                                            key={emp.id}
                                            type="button"
                                            onClick={() => toggleAttendee(emp.id)}
                                            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                                                selected
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50"
                                            }`}
                                        >
                                            {selected && <X className="inline h-2.5 w-2.5 mr-0.5" />}
                                            {emp.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 제출 */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setOpen(false)}
                        >
                            취소
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={isLoading || !form.title.trim()}
                        >
                            {isLoading ? "저장 중..." : "일정 저장"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

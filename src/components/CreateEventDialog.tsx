"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { format } from "date-fns";
import { CalendarPlus, X, Search, ChevronDown, ChevronRight, Users, Check } from "lucide-react";
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

interface Employee {
    id: string;
    name: string;
    departmentName: string | null;
}

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
    const [employees, setEmployees] = useState<Employee[]>([]);
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
        requiresRsvp: false,
    });

    useEffect(() => {
        getEmployees().then((res) => {
            if (res.success && res.data) {
                setEmployees(
                    res.data
                        .filter((e: any) => e.id !== currentUserId)
                        .map((e: any) => ({
                            id: e.id,
                            name: e.name,
                            departmentName: e.department?.name || null,
                        }))
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
                requiresRsvp: form.requiresRsvp,
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
                    requiresRsvp: false,
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
                    {employees.length > 0 && (<>
                        {/* 참석확인 요청 토글 */}
                        {selectedAttendees.length > 0 && (
                            <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium">참석 확인 요청</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {form.requiresRsvp
                                            ? "참석자에게 수락/거절 응답을 요청합니다"
                                            : "알림만 전송합니다 (참석 확인 없음)"}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={form.requiresRsvp}
                                    onClick={() => setForm({ ...form, requiresRsvp: !form.requiresRsvp })}
                                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
                                        form.requiresRsvp ? "bg-primary" : "bg-muted-foreground/30"
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                            form.requiresRsvp ? "translate-x-4" : "translate-x-0"
                                        }`}
                                    />
                                </button>
                            </div>
                        )}
                        <AttendeePicker
                            employees={employees}
                            selectedAttendees={selectedAttendees}
                            onToggle={toggleAttendee}
                            onSelectMany={(ids) =>
                                setSelectedAttendees((prev) => {
                                    const set = new Set(prev);
                                    ids.forEach((id) => set.add(id));
                                    return Array.from(set);
                                })
                            }
                            onDeselectMany={(ids) =>
                                setSelectedAttendees((prev) => prev.filter((x) => !ids.includes(x)))
                            }
                        />
                    </>)}

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

// ─── 참석자 선택기 ────────────────────────────────────────
interface AttendeePickerProps {
    employees: Employee[];
    selectedAttendees: string[];
    onToggle: (id: string) => void;
    onSelectMany: (ids: string[]) => void;
    onDeselectMany: (ids: string[]) => void;
}

function AttendeePicker({
    employees,
    selectedAttendees,
    onToggle,
    onSelectMany,
    onDeselectMany,
}: AttendeePickerProps) {
    const [search, setSearch] = useState("");
    const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);

    // 부서별 그룹핑
    const grouped = useMemo(() => {
        const map = new Map<string, Employee[]>();
        employees.forEach((emp) => {
            const dept = emp.departmentName || "미배정";
            if (!map.has(dept)) map.set(dept, []);
            map.get(dept)!.push(emp);
        });
        // 부서명 가나다순 정렬 (미배정은 마지막)
        return Array.from(map.entries()).sort(([a], [b]) => {
            if (a === "미배정") return 1;
            if (b === "미배정") return -1;
            return a.localeCompare(b, "ko");
        });
    }, [employees]);

    // 검색 필터링
    const searchTrimmed = search.trim().toLowerCase();
    const filteredGrouped = useMemo(() => {
        if (!searchTrimmed) return grouped;
        return grouped
            .map(([dept, emps]) => [
                dept,
                emps.filter(
                    (e) =>
                        e.name.toLowerCase().includes(searchTrimmed) ||
                        (e.departmentName || "").toLowerCase().includes(searchTrimmed)
                ),
            ] as [string, Employee[]])
            .filter(([, emps]) => emps.length > 0);
    }, [grouped, searchTrimmed]);

    const toggleDept = (dept: string) => {
        setExpandedDepts((prev) => {
            const next = new Set(prev);
            if (next.has(dept)) next.delete(dept);
            else next.add(dept);
            return next;
        });
    };

    const isDeptAllSelected = (emps: Employee[]) =>
        emps.every((e) => selectedAttendees.includes(e.id));

    const handleDeptToggle = (emps: Employee[]) => {
        const ids = emps.map((e) => e.id);
        if (isDeptAllSelected(emps)) {
            onDeselectMany(ids);
        } else {
            onSelectMany(ids);
        }
    };

    // 선택된 참석자 이름 목록
    const selectedNames = useMemo(
        () => employees.filter((e) => selectedAttendees.includes(e.id)),
        [employees, selectedAttendees]
    );

    // 검색 중이면 모든 그룹을 자동으로 펼침
    const isSearching = searchTrimmed.length > 0;

    return (
        <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
                참석자 초대 ({selectedAttendees.length}명 선택)
            </label>

            {/* 선택된 참석자 칩 */}
            {selectedNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {selectedNames.map((emp) => (
                        <span
                            key={emp.id}
                            className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground"
                        >
                            {emp.name}
                            <button
                                type="button"
                                onClick={() => onToggle(emp.id)}
                                className="hover:bg-primary-foreground/20 rounded-full p-0.5 ml-0.5"
                            >
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* 검색 입력 */}
            <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="이름 또는 부서명으로 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 text-xs bg-muted/50 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => { setSearch(""); inputRef.current?.focus(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>

            {/* 부서별 아코디언 목록 */}
            <div className="border rounded-md max-h-[180px] overflow-y-auto">
                {filteredGrouped.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">
                        검색 결과가 없습니다
                    </p>
                ) : (
                    filteredGrouped.map(([dept, emps]) => {
                        const isOpen = isSearching || expandedDepts.has(dept);
                        const allSelected = isDeptAllSelected(emps);
                        const someSelected = emps.some((e) => selectedAttendees.includes(e.id));

                        return (
                            <div key={dept}>
                                {/* 부서 헤더 */}
                                <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/30 border-b sticky top-0 z-[1]">
                                    <button
                                        type="button"
                                        onClick={() => toggleDept(dept)}
                                        className="flex items-center gap-1 flex-1 text-left"
                                    >
                                        {isOpen
                                            ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                                            : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                        }
                                        <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <span className="text-[11px] font-semibold truncate">{dept}</span>
                                        <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{emps.length}명</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeptToggle(emps)}
                                        className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors shrink-0 ${
                                            allSelected
                                                ? "bg-primary/20 border-primary/50 text-primary"
                                                : someSelected
                                                    ? "bg-primary/10 border-primary/30 text-primary/70"
                                                    : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50"
                                        }`}
                                    >
                                        {allSelected ? "전체 해제" : "전체 선택"}
                                    </button>
                                </div>

                                {/* 부서원 목록 */}
                                {isOpen && (
                                    <div className="py-0.5">
                                        {emps.map((emp) => {
                                            const selected = selectedAttendees.includes(emp.id);
                                            return (
                                                <button
                                                    key={emp.id}
                                                    type="button"
                                                    onClick={() => onToggle(emp.id)}
                                                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                                                        selected
                                                            ? "bg-primary/10 text-foreground"
                                                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                                    }`}
                                                >
                                                    <span className={`flex items-center justify-center h-3.5 w-3.5 rounded border shrink-0 ${
                                                        selected
                                                            ? "bg-primary border-primary"
                                                            : "border-muted-foreground/40"
                                                    }`}>
                                                        {selected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                                                    </span>
                                                    <span className="truncate">{emp.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

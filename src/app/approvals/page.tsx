"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    CheckCircle2,
    Clock4,
    FileText,
    XCircle,
    ChevronRight,
    ChevronDown,
    X,
    Loader2,
    FilePlus,
    Search,
    Calendar,
    MapPin,
    DollarSign,
    Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import {
    createApprovalRequest,
    processApprovalStep,
    withdrawApprovalRequest,
    getMyApprovals,
} from "@/app/actions/approval";
import { getEmployees } from "@/app/actions/employee";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface ApprovalStep {
    id: string;
    approverId: string;
    stepOrder: number;
    status: "WAITING" | "PENDING" | "APPROVED" | "REJECTED";
    comment?: string;
    actedAt?: string;
}

interface ApprovalData {
    id: string;
    title: string;
    content: string;
    category: string;
    status: "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED" | "WITHDRAWN";
    requesterId: string;
    projectId?: string;
    formData?: Record<string, any>;
    steps: ApprovalStep[];
    createdAt: string;
}

interface Employee {
    id: string;
    name: string;
    departmentName: string;
}

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
    { value: "VACATION",      label: "휴가",       icon: Calendar },
    { value: "OVERTIME",      label: "시간외근무",  icon: Clock },
    { value: "BUSINESS_TRIP", label: "출장",       icon: MapPin },
    { value: "EXPENSE",       label: "지출결의",    icon: DollarSign },
    { value: "GENERAL",       label: "일반기안",    icon: FileText },
];

const VACATION_TYPES = ["연차", "반차(오전)", "반차(오후)", "병가", "경조", "기타"];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    PENDING:     { label: "대기 중",    color: "text-slate-400",   icon: Clock4 },
    IN_PROGRESS: { label: "결재 중",    color: "text-blue-400",    icon: Clock4 },
    APPROVED:    { label: "승인 완료",  color: "text-emerald-400", icon: CheckCircle2 },
    REJECTED:    { label: "반려",       color: "text-red-400",     icon: XCircle },
    WITHDRAWN:   { label: "철회",       color: "text-slate-500",   icon: XCircle },
};

const STEP_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    WAITING:  { label: "대기",   color: "text-slate-400" },
    PENDING:  { label: "결재 중", color: "text-blue-400" },
    APPROVED: { label: "승인",   color: "text-emerald-400" },
    REJECTED: { label: "반려",   color: "text-red-400" },
};

// ─── 카테고리별 폼 필드 ──────────────────────────────────────────────────────

function VacationFormFields({
    formData,
    onChange,
}: {
    formData: Record<string, any>;
    onChange: (data: Record<string, any>) => void;
}) {
    const days = useMemo(() => {
        if (!formData.startDate || !formData.endDate) return 0;
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        if (end < start) return 0;
        let count = 0;
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) count++;
        }
        if (formData.vacationType?.startsWith("반차")) return count * 0.5;
        return count;
    }, [formData.startDate, formData.endDate, formData.vacationType]);

    return (
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-dashed">
            <div>
                <label className="text-xs text-muted-foreground mb-1 block">휴가 유형 *</label>
                <Select
                    value={formData.vacationType || "연차"}
                    onValueChange={(v) => onChange({ ...formData, vacationType: v })}
                >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {VACATION_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">시작일 *</label>
                    <Input
                        type="date"
                        value={formData.startDate || ""}
                        onChange={(e) => onChange({ ...formData, startDate: e.target.value })}
                        className="h-9"
                    />
                </div>
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">종료일 *</label>
                    <Input
                        type="date"
                        value={formData.endDate || ""}
                        onChange={(e) => onChange({ ...formData, endDate: e.target.value })}
                        className="h-9"
                    />
                </div>
            </div>
            {days > 0 && (
                <div className="text-xs text-primary font-medium bg-primary/10 rounded-md px-2.5 py-1.5">
                    총 {days}일 ({formData.vacationType || "연차"})
                </div>
            )}
        </div>
    );
}

function OvertimeFormFields({
    formData,
    onChange,
}: {
    formData: Record<string, any>;
    onChange: (data: Record<string, any>) => void;
}) {
    return (
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-dashed">
            <div>
                <label className="text-xs text-muted-foreground mb-1 block">근무일 *</label>
                <Input
                    type="date"
                    value={formData.overtimeDate || ""}
                    onChange={(e) => onChange({ ...formData, overtimeDate: e.target.value })}
                    className="h-9"
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">시작 시간 *</label>
                    <Input
                        type="time"
                        value={formData.startTime || "18:00"}
                        onChange={(e) => onChange({ ...formData, startTime: e.target.value })}
                        className="h-9"
                    />
                </div>
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">종료 시간 *</label>
                    <Input
                        type="time"
                        value={formData.endTime || "21:00"}
                        onChange={(e) => onChange({ ...formData, endTime: e.target.value })}
                        className="h-9"
                    />
                </div>
            </div>
        </div>
    );
}

function BusinessTripFormFields({
    formData,
    onChange,
}: {
    formData: Record<string, any>;
    onChange: (data: Record<string, any>) => void;
}) {
    return (
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-dashed">
            <div>
                <label className="text-xs text-muted-foreground mb-1 block">출장지 *</label>
                <Input
                    placeholder="출장 장소"
                    value={formData.destination || ""}
                    onChange={(e) => onChange({ ...formData, destination: e.target.value })}
                    className="h-9"
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">시작일 *</label>
                    <Input
                        type="date"
                        value={formData.startDate || ""}
                        onChange={(e) => onChange({ ...formData, startDate: e.target.value })}
                        className="h-9"
                    />
                </div>
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">종료일 *</label>
                    <Input
                        type="date"
                        value={formData.endDate || ""}
                        onChange={(e) => onChange({ ...formData, endDate: e.target.value })}
                        className="h-9"
                    />
                </div>
            </div>
            <div>
                <label className="text-xs text-muted-foreground mb-1 block">예상 비용 (원)</label>
                <Input
                    type="number"
                    placeholder="0"
                    value={formData.estimatedCost || ""}
                    onChange={(e) => onChange({ ...formData, estimatedCost: e.target.value })}
                    className="h-9"
                />
            </div>
        </div>
    );
}

function ExpenseFormFields({
    formData,
    onChange,
}: {
    formData: Record<string, any>;
    onChange: (data: Record<string, any>) => void;
}) {
    return (
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-dashed">
            <div>
                <label className="text-xs text-muted-foreground mb-1 block">지출 항목 *</label>
                <Input
                    placeholder="예: 사무용품 구매"
                    value={formData.expenseItem || ""}
                    onChange={(e) => onChange({ ...formData, expenseItem: e.target.value })}
                    className="h-9"
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">금액 (원) *</label>
                    <Input
                        type="number"
                        placeholder="0"
                        value={formData.amount || ""}
                        onChange={(e) => onChange({ ...formData, amount: e.target.value })}
                        className="h-9"
                    />
                </div>
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">사용일 *</label>
                    <Input
                        type="date"
                        value={formData.expenseDate || ""}
                        onChange={(e) => onChange({ ...formData, expenseDate: e.target.value })}
                        className="h-9"
                    />
                </div>
            </div>
            <div>
                <label className="text-xs text-muted-foreground mb-1 block">증빙 구분</label>
                <Select
                    value={formData.receiptType || "카드"}
                    onValueChange={(v) => onChange({ ...formData, receiptType: v })}
                >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {["카드", "현금(영수증)", "세금계산서", "기타"].map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

// ─── 부서별 결재자 선택 ──────────────────────────────────────────────────────

function ApproverPicker({
    employees,
    currentUserId,
    selected,
    onToggle,
}: {
    employees: Employee[];
    currentUserId: string;
    selected: string[];
    onToggle: (id: string) => void;
}) {
    const [search, setSearch] = useState("");
    const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

    const availableEmployees = employees.filter((e) => e.id !== currentUserId);

    const filtered = useMemo(() => {
        if (!search.trim()) return availableEmployees;
        const q = search.toLowerCase();
        return availableEmployees.filter(
            (e) => e.name.toLowerCase().includes(q) || e.departmentName.toLowerCase().includes(q)
        );
    }, [availableEmployees, search]);

    // 부서별 그룹핑
    const grouped = useMemo(() => {
        const map: Record<string, Employee[]> = {};
        for (const emp of filtered) {
            const dept = emp.departmentName || "미지정";
            if (!map[dept]) map[dept] = [];
            map[dept].push(emp);
        }
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    }, [filtered]);

    // 검색 시 자동 확장
    useEffect(() => {
        if (search.trim()) {
            setExpandedDepts(new Set(grouped.map(([dept]) => dept)));
        }
    }, [search, grouped]);

    const toggleDept = (dept: string) => {
        setExpandedDepts((prev) => {
            const next = new Set(prev);
            if (next.has(dept)) next.delete(dept);
            else next.add(dept);
            return next;
        });
    };

    return (
        <div className="space-y-2">
            {/* 선택된 결재자 (순서 표시) */}
            {selected.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap p-2 bg-muted/40 rounded-lg">
                    {selected.map((id, idx) => {
                        const emp = availableEmployees.find((e) => e.id === id);
                        return (
                            <div key={id} className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5 text-xs">
                                <span className="text-primary font-bold">{idx + 1}</span>
                                <span className="font-medium">{emp?.name}</span>
                                <button type="button" onClick={() => onToggle(id)}>
                                    <X className="h-2.5 w-2.5 text-muted-foreground" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 검색 */}
            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                    placeholder="이름 또는 부서 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                />
            </div>

            {/* 부서별 아코디언 */}
            <div className="max-h-[200px] overflow-y-auto space-y-0.5 border rounded-lg">
                {grouped.map(([dept, members]) => {
                    const isExpanded = expandedDepts.has(dept);
                    return (
                        <div key={dept}>
                            <button
                                type="button"
                                onClick={() => toggleDept(dept)}
                                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                            >
                                <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                {dept}
                                <span className="text-[10px] ml-auto opacity-60">{members.length}명</span>
                            </button>
                            {isExpanded && (
                                <div className="pl-5 pr-2 pb-1 space-y-0.5">
                                    {members.map((emp) => {
                                        const isSelected = selected.includes(emp.id);
                                        const order = selected.indexOf(emp.id) + 1;
                                        return (
                                            <button
                                                key={emp.id}
                                                type="button"
                                                onClick={() => onToggle(emp.id)}
                                                className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${
                                                    isSelected
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-foreground hover:bg-muted"
                                                }`}
                                            >
                                                {isSelected && (
                                                    <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                                                        {order}
                                                    </span>
                                                )}
                                                <span className="font-medium">{emp.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
                {grouped.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">검색 결과가 없습니다.</p>
                )}
            </div>
        </div>
    );
}

// ─── formData 상세 표시 ──────────────────────────────────────────────────────

function FormDataDetail({ category, formData }: { category: string; formData?: Record<string, any> | null }) {
    if (!formData) return null;

    const items: { label: string; value: string }[] = [];

    switch (category) {
        case "VACATION":
            if (formData.vacationType) items.push({ label: "유형", value: formData.vacationType });
            if (formData.startDate) items.push({ label: "시작일", value: formData.startDate });
            if (formData.endDate) items.push({ label: "종료일", value: formData.endDate });
            break;
        case "OVERTIME":
            if (formData.overtimeDate) items.push({ label: "근무일", value: formData.overtimeDate });
            if (formData.startTime) items.push({ label: "시작", value: formData.startTime });
            if (formData.endTime) items.push({ label: "종료", value: formData.endTime });
            break;
        case "BUSINESS_TRIP":
            if (formData.destination) items.push({ label: "출장지", value: formData.destination });
            if (formData.startDate) items.push({ label: "시작일", value: formData.startDate });
            if (formData.endDate) items.push({ label: "종료일", value: formData.endDate });
            if (formData.estimatedCost) items.push({ label: "예상비용", value: `${Number(formData.estimatedCost).toLocaleString()}원` });
            break;
        case "EXPENSE":
            if (formData.expenseItem) items.push({ label: "항목", value: formData.expenseItem });
            if (formData.amount) items.push({ label: "금액", value: `${Number(formData.amount).toLocaleString()}원` });
            if (formData.expenseDate) items.push({ label: "사용일", value: formData.expenseDate });
            if (formData.receiptType) items.push({ label: "증빙", value: formData.receiptType });
            break;
    }

    if (items.length === 0) return null;

    return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-muted/30 rounded-lg p-3 text-xs">
            {items.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{item.label}:</span>
                    <span className="font-medium">{item.value}</span>
                </div>
            ))}
        </div>
    );
}

// ─── 결재 신청 다이얼로그 ─────────────────────────────────────────────────────

function ApprovalRequestForm({
    currentUserId,
    employees,
    onSubmitted,
}: {
    currentUserId: string;
    employees: Employee[];
    onSubmitted: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [approverIds, setApproverIds] = useState<string[]>([]);
    const [form, setForm] = useState({
        title: "",
        content: "",
        category: "GENERAL" as string,
    });
    const [formData, setFormData] = useState<Record<string, any>>({});

    // 카테고리 변경 시 formData 초기화
    const handleCategoryChange = (cat: string) => {
        setForm({ ...form, category: cat });
        switch (cat) {
            case "VACATION":
                setFormData({ vacationType: "연차", startDate: "", endDate: "" });
                break;
            case "OVERTIME":
                setFormData({ overtimeDate: "", startTime: "18:00", endTime: "21:00" });
                break;
            case "BUSINESS_TRIP":
                setFormData({ destination: "", startDate: "", endDate: "", estimatedCost: "" });
                break;
            case "EXPENSE":
                setFormData({ expenseItem: "", amount: "", expenseDate: "", receiptType: "카드" });
                break;
            default:
                setFormData({});
        }
    };

    // 카테고리별 제목 자동 생성
    const autoTitle = useMemo(() => {
        switch (form.category) {
            case "VACATION":
                return formData.vacationType ? `${formData.vacationType} 신청` : "휴가 신청";
            case "OVERTIME":
                return formData.overtimeDate ? `시간외근무 신청 (${formData.overtimeDate})` : "시간외근무 신청";
            case "BUSINESS_TRIP":
                return formData.destination ? `출장 신청 - ${formData.destination}` : "출장 신청";
            case "EXPENSE":
                return formData.expenseItem ? `지출결의 - ${formData.expenseItem}` : "지출결의";
            default:
                return "";
        }
    }, [form.category, formData]);

    // 제목이 비어있고 autoTitle이 있으면 자동 채우기
    useEffect(() => {
        if (form.category !== "GENERAL" && !form.title && autoTitle) {
            setForm((prev) => ({ ...prev, title: autoTitle }));
        }
    }, [autoTitle]);

    const toggleApprover = (id: string) => {
        setApproverIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const validateFormData = (): boolean => {
        switch (form.category) {
            case "VACATION":
                return !!(formData.startDate && formData.endDate);
            case "OVERTIME":
                return !!(formData.overtimeDate && formData.startTime && formData.endTime);
            case "BUSINESS_TRIP":
                return !!(formData.destination && formData.startDate && formData.endDate);
            case "EXPENSE":
                return !!(formData.expenseItem && formData.amount && formData.expenseDate);
            default:
                return true;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.content.trim()) return;
        if (approverIds.length === 0) {
            alert("결재자를 1명 이상 선택해주세요.");
            return;
        }
        if (!validateFormData()) {
            alert("필수 항목을 모두 입력해주세요.");
            return;
        }
        setIsLoading(true);
        try {
            const result = await createApprovalRequest({
                title: form.title,
                content: form.content,
                category: form.category as any,
                requesterId: currentUserId,
                approverIds,
                formData: form.category !== "GENERAL" ? formData : undefined,
            });
            if (result.success) {
                setOpen(false);
                setForm({ title: "", content: "", category: "GENERAL" });
                setFormData({});
                setApproverIds([]);
                onSubmitted();
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                    <FilePlus className="h-4 w-4" />
                    기안하기
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>전자결재 신청</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3 mt-2">
                    {/* 분류 선택 (카드형) */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1.5 block">분류</label>
                        <div className="grid grid-cols-5 gap-1.5">
                            {CATEGORY_OPTIONS.map((c) => {
                                const Icon = c.icon;
                                const isActive = form.category === c.value;
                                return (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => handleCategoryChange(c.value)}
                                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border-2 transition-all text-[10px] font-medium ${
                                            isActive
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {c.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 카테고리별 전용 폼 */}
                    {form.category === "VACATION" && (
                        <VacationFormFields formData={formData} onChange={setFormData} />
                    )}
                    {form.category === "OVERTIME" && (
                        <OvertimeFormFields formData={formData} onChange={setFormData} />
                    )}
                    {form.category === "BUSINESS_TRIP" && (
                        <BusinessTripFormFields formData={formData} onChange={setFormData} />
                    )}
                    {form.category === "EXPENSE" && (
                        <ExpenseFormFields formData={formData} onChange={setFormData} />
                    )}

                    {/* 제목 */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">제목 *</label>
                        <Input
                            placeholder="결재 제목"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            required
                        />
                    </div>

                    {/* 내용 */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">사유 / 상세 내용 *</label>
                        <textarea
                            placeholder="결재 내용을 작성하세요..."
                            value={form.content}
                            onChange={(e) => setForm({ ...form, content: e.target.value })}
                            required
                            className="w-full text-sm bg-background border rounded-md px-3 py-2 min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {/* 결재자 선택 */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1.5 block">
                            결재자 선택 (순서대로 처리됩니다)
                        </label>
                        <ApproverPicker
                            employees={employees}
                            currentUserId={currentUserId}
                            selected={approverIds}
                            onToggle={toggleApprover}
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>취소</Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={isLoading || !form.title.trim() || !form.content.trim() || approverIds.length === 0}
                        >
                            {isLoading ? "제출 중..." : "결재 상신"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── 결재 상세 다이얼로그 ─────────────────────────────────────────────────────

function ApprovalDetailDialog({
    approval,
    currentUserId,
    employees,
    onAction,
}: {
    approval: ApprovalData;
    currentUserId: string;
    employees: Employee[];
    onAction: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [comment, setComment] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const isRequester = approval.requesterId === currentUserId;
    const currentStep = approval.steps.find(
        (s) => s.approverId === currentUserId && s.status === "PENDING"
    );
    const canWithdraw = isRequester && ["PENDING", "IN_PROGRESS"].includes(approval.status);

    const statusConf = STATUS_CONFIG[approval.status];
    const StatusIcon = statusConf.icon;

    useEffect(() => {
        if (!toastMsg) return;
        const t = setTimeout(() => setToastMsg(null), 3000);
        return () => clearTimeout(t);
    }, [toastMsg]);

    const handleProcess = async (action: "APPROVED" | "REJECTED") => {
        setIsLoading(true);
        try {
            const result = await processApprovalStep(approval.id, currentUserId, action, comment || undefined);
            if (result.success) {
                setToastMsg(action === "APPROVED" ? "승인되었습니다." : "반려되었습니다.");
                setComment("");
                onAction();
                setTimeout(() => setOpen(false), 500);
            } else {
                setToastMsg(result.error || "처리 실패");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleWithdraw = async () => {
        setIsLoading(true);
        try {
            const result = await withdrawApprovalRequest(approval.id, currentUserId);
            if (result.success) {
                setToastMsg("결재가 철회되었습니다.");
                onAction();
                setTimeout(() => setOpen(false), 500);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const requesterName = employees.find((e) => e.id === approval.requesterId)?.name || approval.requesterId;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="w-full text-left">
                    <ApprovalCard approval={approval} employees={employees} />
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {approval.title}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {/* 상태 + 분류 + 기안자 */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${statusConf.color} bg-transparent border-current text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1 inline" />
                            {statusConf.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                            {CATEGORY_OPTIONS.find((c) => c.value === approval.category)?.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">기안: {requesterName}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                            {format(new Date(approval.createdAt), "yyyy.MM.dd", { locale: ko })}
                        </span>
                    </div>

                    {/* 카테고리별 상세 정보 */}
                    <FormDataDetail category={approval.category} formData={approval.formData} />

                    {/* 내용 */}
                    <div className="bg-muted/40 rounded-xl p-4 text-sm whitespace-pre-wrap">
                        {approval.content}
                    </div>

                    {/* 결재 흐름 */}
                    <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">결재 진행 현황</h4>
                        <div className="flex items-center gap-1 flex-wrap">
                            {approval.steps.map((step, idx) => {
                                const approverName = employees.find((e) => e.id === step.approverId)?.name || step.approverId;
                                const sc = STEP_STATUS_CONFIG[step.status];
                                return (
                                    <React.Fragment key={step.id}>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                                                step.status === "APPROVED" ? "border-emerald-400 bg-emerald-400/10 text-emerald-400" :
                                                step.status === "REJECTED" ? "border-red-400 bg-red-400/10 text-red-400" :
                                                step.status === "PENDING" ? "border-blue-400 bg-blue-400/10 text-blue-400" :
                                                "border-slate-400/40 text-slate-500"
                                            }`}>
                                                {idx + 1}
                                            </div>
                                            <span className="text-[9px] text-muted-foreground">{approverName}</span>
                                            <span className={`text-[9px] ${sc.color}`}>{sc.label}</span>
                                            {step.comment && (
                                                <span className="text-[8px] text-muted-foreground italic max-w-[60px] text-center truncate" title={step.comment}>
                                                    &quot;{step.comment}&quot;
                                                </span>
                                            )}
                                        </div>
                                        {idx < approval.steps.length - 1 && (
                                            <ChevronRight className="h-3 w-3 text-muted-foreground/50 mb-5" />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/* 결재 처리 (결재자) */}
                    {currentStep && (
                        <div className="border-t pt-4 space-y-2">
                            <h4 className="text-xs font-semibold">결재 처리</h4>
                            <textarea
                                placeholder="결재 의견 (선택)"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="w-full text-sm bg-background border rounded-md px-3 py-2 h-16 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => handleProcess("APPROVED")}
                                    disabled={isLoading}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "승인"}
                                </Button>
                                <Button
                                    onClick={() => handleProcess("REJECTED")}
                                    variant="destructive"
                                    disabled={isLoading}
                                    className="flex-1"
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "반려"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 철회 (기안자) */}
                    {canWithdraw && (
                        <Button
                            variant="outline"
                            className="w-full text-muted-foreground"
                            onClick={handleWithdraw}
                            disabled={isLoading}
                        >
                            결재 철회
                        </Button>
                    )}

                    {/* 토스트 */}
                    {toastMsg && (
                        <div className="bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg text-center">
                            {toastMsg}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── ApprovalCard ─────────────────────────────────────────────────────────────

function ApprovalCard({
    approval,
    employees,
}: {
    approval: ApprovalData;
    employees: Employee[];
}) {
    const statusConf = STATUS_CONFIG[approval.status];
    const StatusIcon = statusConf.icon;
    const catOption = CATEGORY_OPTIONS.find((c) => c.value === approval.category);
    const CatIcon = catOption?.icon || FileText;
    const catLabel = catOption?.label || approval.category;
    const requesterName = employees.find((e) => e.id === approval.requesterId)?.name || "";

    // formData에서 요약 정보 추출
    const summary = useMemo(() => {
        const fd = approval.formData;
        if (!fd) return null;
        switch (approval.category) {
            case "VACATION":
                return fd.startDate && fd.endDate ? `${fd.startDate} ~ ${fd.endDate}` : null;
            case "OVERTIME":
                return fd.overtimeDate ? `${fd.overtimeDate} ${fd.startTime || ""}~${fd.endTime || ""}` : null;
            case "BUSINESS_TRIP":
                return fd.destination || null;
            case "EXPENSE":
                return fd.amount ? `${Number(fd.amount).toLocaleString()}원` : null;
            default:
                return null;
        }
    }, [approval.category, approval.formData]);

    return (
        <div className="bg-card border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all text-left w-full">
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                    <StatusIcon className={`h-4 w-4 flex-shrink-0 ${statusConf.color}`} />
                    <span className="font-medium text-sm truncate">{approval.title}</span>
                </div>
                <Badge variant="outline" className="text-[10px] flex-shrink-0 gap-1">
                    <CatIcon className="h-2.5 w-2.5" />
                    {catLabel}
                </Badge>
            </div>
            {summary && (
                <p className="text-xs text-primary/80 mb-1.5">{summary}</p>
            )}
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{approval.content}</p>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className={statusConf.color}>{statusConf.label}</span>
                <span>•</span>
                <span>{requesterName}</span>
                <span>•</span>
                <span>{format(new Date(approval.createdAt), "M/d", { locale: ko })}</span>
                <span>•</span>
                <span>결재자 {approval.steps.length}명</span>
            </div>
        </div>
    );
}

// ─── 메인 페이지 컴포넌트 ─────────────────────────────────────────────────────

export default function ApprovalsPage() {
    const user = useStore(useAuthStore, (s) => s.user);
    const [data, setData] = useState<{ requested: ApprovalData[]; toApprove: ApprovalData[] }>({
        requested: [],
        toApprove: [],
    });
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [tab, setTab] = useState<"toApprove" | "requested" | "all">("toApprove");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    const loadData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [approvalsRes, empRes] = await Promise.all([
                getMyApprovals(user.id),
                getEmployees(),
            ]);
            if (approvalsRes.success) setData(approvalsRes.data as any);
            if (empRes.success && empRes.data) {
                setEmployees(
                    empRes.data.map((e: any) => ({
                        id: e.id,
                        name: e.name,
                        departmentName: e.department?.name || "미지정",
                    }))
                );
            }
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (!user) return null;

    const currentList = useMemo(() => {
        let list: ApprovalData[];
        if (tab === "toApprove") list = data.toApprove;
        else if (tab === "requested") list = data.requested;
        else list = [...data.requested, ...data.toApprove];

        if (statusFilter !== "ALL") {
            list = list.filter((a) => a.status === statusFilter);
        }
        return list;
    }, [tab, data, statusFilter]);

    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-8">
            <header className="border-b pb-5 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="h-6 w-6 text-violet-400" />
                        <h1 className="text-2xl font-extrabold tracking-tight text-primary">
                            전자결재
                        </h1>
                    </div>
                    <ApprovalRequestForm
                        currentUserId={user.id}
                        employees={employees}
                        onSubmitted={loadData}
                    />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    결재 신청, 처리, 현황을 한 곳에서 관리하세요.
                </p>
            </header>

            {/* 탭 + 상태 필터 */}
            <div className="flex items-center justify-between border-b mb-6">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setTab("toApprove")}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                            tab === "toApprove" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        결재 대기
                        {data.toApprove.length > 0 && (
                            <span className="ml-1.5 bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                                {data.toApprove.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setTab("requested")}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                            tab === "requested" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        내가 신청한 결재
                        {data.requested.length > 0 && (
                            <span className="ml-1.5 bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                                {data.requested.length}
                            </span>
                        )}
                    </button>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue placeholder="전체 상태" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">전체 상태</SelectItem>
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <SelectItem key={key} value={key}>
                                <span className={cfg.color}>{cfg.label}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* 목록 */}
            {isLoading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : currentList.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">결재 항목이 없습니다.</p>
                </div>
            ) : (
                <div className="grid gap-2">
                    {currentList.map((approval) => (
                        <ApprovalDetailDialog
                            key={approval.id}
                            approval={approval}
                            currentUserId={user.id}
                            employees={employees}
                            onAction={loadData}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

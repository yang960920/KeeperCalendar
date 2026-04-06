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
import Link from "next/link";
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
    { value: "BUSINESS_TRIP", label: "외근보고",    icon: MapPin },
    { value: "EXPENSE",       label: "지출결의",    icon: DollarSign },
    { value: "GENERAL",           label: "품의서",      icon: FileText },
    { value: "GRANT_APPLICATION", label: "정부과제",    icon: FileText },
];

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
        case "GRANT_APPLICATION":
            if (formData.project_name) items.push({ label: "과제명", value: formData.project_name });
            if (formData.funding_agency) items.push({ label: "주관기관", value: formData.funding_agency });
            if (formData.deadline) items.push({ label: "마감일", value: formData.deadline });
            if (formData.product_line) items.push({ label: "제품라인", value: formData.product_line });
            if (formData.url) items.push({ label: "공고링크", value: "원문 보기" });
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
                            {CATEGORY_OPTIONS.find((c) => c.value === (approval.formData?.source === "GRANT_APPLICATION" ? "GRANT_APPLICATION" : approval.category))?.label || approval.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">기안: {requesterName}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                            {format(new Date(approval.createdAt), "yyyy.MM.dd", { locale: ko })}
                        </span>
                    </div>

                    {/* 카테고리별 상세 정보 */}
                    <FormDataDetail category={approval.formData?.source === "GRANT_APPLICATION" ? "GRANT_APPLICATION" : approval.category} formData={approval.formData} />

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
    const isGrantApp = approval.formData?.source === "GRANT_APPLICATION";
    const effectiveCategory = isGrantApp ? "GRANT_APPLICATION" : approval.category;
    const catOption = CATEGORY_OPTIONS.find((c) => c.value === effectiveCategory);
    const CatIcon = catOption?.icon || FileText;
    const catLabel = catOption?.label || approval.category;
    const requesterName = employees.find((e) => e.id === approval.requesterId)?.name || "";

    // formData에서 요약 정보 추출
    const summary = useMemo(() => {
        const fd = approval.formData;
        if (!fd) return null;
        switch (effectiveCategory) {
            case "VACATION":
                return fd.startDate && fd.endDate ? `${fd.startDate} ~ ${fd.endDate}` : null;
            case "OVERTIME":
                return fd.overtimeDate ? `${fd.overtimeDate} ${fd.startTime || ""}~${fd.endTime || ""}` : null;
            case "BUSINESS_TRIP":
                return fd.destination || null;
            case "EXPENSE":
                return fd.amount ? `${Number(fd.amount).toLocaleString()}원` : null;
            case "GRANT_APPLICATION":
                return fd.project_name || fd.funding_agency || null;
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
    const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");

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

    const currentList = useMemo(() => {
        let list: ApprovalData[];
        if (tab === "toApprove") list = data.toApprove;
        else if (tab === "requested") list = data.requested;
        else list = [...data.requested, ...data.toApprove];

        if (statusFilter !== "ALL") {
            list = list.filter((a) => a.status === statusFilter);
        }
        if (categoryFilter !== "ALL") {
            list = list.filter((a) => {
                const effectiveCat = a.formData?.source === "GRANT_APPLICATION" ? "GRANT_APPLICATION" : a.category;
                return effectiveCat === categoryFilter;
            });
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((a) => {
                const requesterName = employees.find((e) => e.id === a.requesterId)?.name || "";
                return (
                    a.title.toLowerCase().includes(q) ||
                    a.content.toLowerCase().includes(q) ||
                    requesterName.toLowerCase().includes(q)
                );
            });
        }
        return list;
    }, [tab, data, statusFilter, categoryFilter, searchQuery, employees]);

    if (!user) return null;

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
                    <Link href="/approvals/new">
                        <Button size="sm" className="gap-1.5">
                            <FilePlus className="h-4 w-4" />
                            기안하기
                        </Button>
                    </Link>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    결재 신청, 처리, 현황을 한 곳에서 관리하세요.
                </p>
            </header>

            {/* 탭 */}
            <div className="flex items-center border-b mb-4">
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
            </div>

            {/* 검색 + 필터 */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="제목, 내용, 기안자 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-8 text-xs"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue placeholder="전체 분류" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">전체 분류</SelectItem>
                        {CATEGORY_OPTIONS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                                {c.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
                {(categoryFilter !== "ALL" || statusFilter !== "ALL" || searchQuery) && (
                    <button
                        onClick={() => { setCategoryFilter("ALL"); setStatusFilter("ALL"); setSearchQuery(""); }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        필터 초기화
                    </button>
                )}
            </div>

            {/* 목록 */}
            {isLoading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : currentList.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                        {searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL"
                            ? "검색 결과가 없습니다."
                            : "결재 항목이 없습니다."}
                    </p>
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

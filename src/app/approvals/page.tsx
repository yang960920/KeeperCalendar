"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
    CheckCircle2,
    Clock4,
    FileText,
    XCircle,
    ChevronRight,
    X,
    Loader2,
    FilePlus,
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
    steps: ApprovalStep[];
    createdAt: string;
}

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
    { value: "VACATION",      label: "휴가" },
    { value: "OVERTIME",      label: "시간외근무" },
    { value: "BUSINESS_TRIP", label: "출장" },
    { value: "EXPENSE",       label: "지출결의" },
    { value: "GENERAL",       label: "일반기안" },
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

// ─── 결재 신청 다이얼로그 ─────────────────────────────────────────────────────

function ApprovalRequestForm({
    currentUserId,
    employees,
    onSubmitted,
}: {
    currentUserId: string;
    employees: { id: string; name: string }[];
    onSubmitted: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [approverIds, setApproverIds] = useState<string[]>([]);
    const [form, setForm] = useState({
        title: "",
        content: "",
        category: "GENERAL" as any,
    });

    const toggleApprover = (id: string) => {
        setApproverIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.content.trim()) return;
        if (approverIds.length === 0) {
            alert("결재자를 1명 이상 선택해주세요.");
            return;
        }
        setIsLoading(true);
        try {
            const result = await createApprovalRequest({
                title: form.title,
                content: form.content,
                category: form.category,
                requesterId: currentUserId,
                approverIds,
            });
            if (result.success) {
                setOpen(false);
                setForm({ title: "", content: "", category: "GENERAL" });
                setApproverIds([]);
                onSubmitted();
            }
        } finally {
            setIsLoading(false);
        }
    };

    const availableApprovers = employees.filter((e) => e.id !== currentUserId);

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
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">제목 *</label>
                        <Input
                            placeholder="결재 제목"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">분류</label>
                        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORY_OPTIONS.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">결재 내용 *</label>
                        <textarea
                            placeholder="결재 내용을 작성하세요..."
                            value={form.content}
                            onChange={(e) => setForm({ ...form, content: e.target.value })}
                            required
                            className="w-full text-sm bg-background border rounded-md px-3 py-2 min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1.5 block">
                            결재자 선택 (순서대로 처리됩니다)
                        </label>
                        {approverIds.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mb-2 p-2 bg-muted/40 rounded-lg">
                                {approverIds.map((id, idx) => {
                                    const emp = availableApprovers.find((e) => e.id === id);
                                    return (
                                        <div key={id} className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5 text-xs">
                                            <span className="text-muted-foreground">{idx + 1}.</span>
                                            <span className="font-medium">{emp?.name}</span>
                                            <button type="button" onClick={() => toggleApprover(id)}>
                                                <X className="h-2.5 w-2.5 text-muted-foreground" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                            {availableApprovers.map((emp) => {
                                const selected = approverIds.includes(emp.id);
                                const idx = approverIds.indexOf(emp.id);
                                return (
                                    <button
                                        key={emp.id}
                                        type="button"
                                        onClick={() => toggleApprover(emp.id)}
                                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                                            selected
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50"
                                        }`}
                                    >
                                        {selected && <span className="mr-0.5 opacity-70">{idx + 1}.</span>}
                                        {emp.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>취소</Button>
                        <Button type="submit" className="flex-1" disabled={isLoading || !form.title.trim() || !form.content.trim()}>
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
    employees: { id: string; name: string }[];
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
                    {/* 상태 + 분류 */}
                    <div className="flex items-center gap-2">
                        <Badge className={`${statusConf.color} bg-transparent border-current text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1 inline" />
                            {statusConf.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                            {CATEGORY_OPTIONS.find((c) => c.value === approval.category)?.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                            {format(new Date(approval.createdAt), "yyyy.MM.dd", { locale: ko })}
                        </span>
                    </div>

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
                                                    "{step.comment}"
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
    employees: { id: string; name: string }[];
}) {
    const statusConf = STATUS_CONFIG[approval.status];
    const StatusIcon = statusConf.icon;
    const catLabel = CATEGORY_OPTIONS.find((c) => c.value === approval.category)?.label || approval.category;

    return (
        <div className="bg-card border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all text-left w-full">
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                    <StatusIcon className={`h-4 w-4 flex-shrink-0 ${statusConf.color}`} />
                    <span className="font-medium text-sm truncate">{approval.title}</span>
                </div>
                <Badge variant="outline" className="text-[10px] flex-shrink-0">{catLabel}</Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{approval.content}</p>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className={statusConf.color}>{statusConf.label}</span>
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
    const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [tab, setTab] = useState<"requested" | "toApprove">("toApprove");

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
                setEmployees(empRes.data.map((e: any) => ({ id: e.id, name: e.name })));
            }
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (!user) return null;

    const currentList = tab === "requested" ? data.requested : data.toApprove;

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

            {/* 탭 */}
            <div className="flex items-center gap-1 border-b mb-6">
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

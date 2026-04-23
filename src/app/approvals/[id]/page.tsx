"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
    ArrowLeft,
    FileText,
    Paperclip,
    File as FileIcon,
    ExternalLink,
    Download,
    Pencil,
    CheckCircle2,
    XCircle,
    Loader2,
    ChevronRight,
    AlertTriangle,
    RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import {
    getApprovalRequestById,
    processApprovalStep,
    withdrawApprovalRequest,
} from "@/app/actions/approval";
import { getEmployees } from "@/app/actions/employee";
import {
    CATEGORY_OPTIONS,
    STATUS_CONFIG,
    STEP_STATUS_CONFIG,
    FormDataDetail,
    type ApprovalData,
    type Employee,
} from "../_shared";

export default function ApprovalDetailPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const id = params.id;
    const user = useStore(useAuthStore, (s) => s.user);

    const [approval, setApproval] = useState<ApprovalData | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [comment, setComment] = useState("");
    const [processing, setProcessing] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const [aRes, eRes] = await Promise.all([
            getApprovalRequestById(id),
            getEmployees(),
        ]);
        if (aRes.success && aRes.data) setApproval(aRes.data as any);
        else setError(aRes.error || "불러오지 못했습니다.");
        if (eRes.success && eRes.data) setEmployees(eRes.data.map((e: any) => ({ id: e.id, name: e.name, departmentName: e.department?.name || "" })));
        setLoading(false);
    }, [id]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!toastMsg) return;
        const t = setTimeout(() => setToastMsg(null), 2500);
        return () => clearTimeout(t);
    }, [toastMsg]);

    if (loading) return <div className="p-10 text-center text-sm text-muted-foreground">불러오는 중…</div>;
    if (error || !approval || !user) return <div className="p-10 text-center text-sm text-red-500">{error || "표시할 내용이 없습니다."}</div>;

    const isRequester = approval.requesterId === user.id;
    const currentStep = approval.steps.find((s) => s.approverId === user.id && s.status === "PENDING");
    const canEdit = isRequester && ["PENDING", "IN_PROGRESS"].includes(approval.status);
    const canWithdraw = isRequester && ["PENDING", "IN_PROGRESS"].includes(approval.status);
    const hasAnyApproved = approval.steps.some((s) => s.status === "APPROVED");

    const effectiveCategory = approval.formData?.source === "GRANT_APPLICATION" ? "GRANT_APPLICATION" : approval.category;
    const catLabel = CATEGORY_OPTIONS.find((c) => c.value === effectiveCategory)?.label || approval.category;
    const statusConf = STATUS_CONFIG[approval.status];
    const StatusIcon = statusConf.icon;

    const requesterEmp = employees.find((e) => e.id === approval.requesterId);
    const requesterName = requesterEmp?.name || approval.requesterId;
    const requesterDept = requesterEmp?.departmentName || "";

    const handleProcess = async (action: "APPROVED" | "REJECTED") => {
        setProcessing(true);
        try {
            const result = await processApprovalStep(approval.id, user.id, action, comment || undefined);
            if (result.success) {
                setToastMsg(action === "APPROVED" ? "승인되었습니다." : "반려되었습니다.");
                setComment("");
                await load();
            } else {
                setToastMsg(result.error || "처리 실패");
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleWithdraw = async () => {
        if (!confirm("결재를 철회할까요? 다시 기안하려면 수정 후 재제출해야 합니다.")) return;
        setProcessing(true);
        try {
            const result = await withdrawApprovalRequest(approval.id, user.id);
            if (result.success) {
                setToastMsg("철회되었습니다.");
                await load();
            }
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="p-6 sm:p-8 max-w-5xl mx-auto">
            <Link href="/approvals" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
                <ArrowLeft className="h-3 w-3" /> 전자결재 목록
            </Link>

            {/* ── 헤더 ── */}
            <header className="mb-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{catLabel}</Badge>
                            <Badge className={`${statusConf.color} bg-transparent border-current text-xs`}>
                                <StatusIcon className="h-3 w-3 mr-1 inline" />
                                {statusConf.label}
                            </Badge>
                            {hasAnyApproved && isRequester && canEdit && (
                                <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-500">
                                    <AlertTriangle className="h-3 w-3 mr-1 inline" />
                                    수정 시 결재 초기화
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <FileText className="h-6 w-6 text-primary flex-shrink-0" />
                            <span className="truncate">{approval.title}</span>
                        </h1>
                        <div className="text-xs text-muted-foreground mt-1">
                            {requesterDept ? `${requesterDept} ${requesterName}` : requesterName} · {format(new Date(approval.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                        </div>
                    </div>
                </div>
            </header>

            {/* ── 상단 액션 바 ── */}
            <div className="rounded-xl border bg-card p-5 mb-6">
                {currentStep ? (
                    // 결재자 액션
                    <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-2">내 차례입니다 — 결재를 처리하세요</div>
                        <textarea
                            placeholder="결재 의견 (선택)"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full text-sm bg-background border rounded-md px-3 py-2 h-16 resize-none focus:outline-none focus:ring-2 focus:ring-ring mb-3"
                        />
                        <div className="flex gap-2">
                            <Button
                                onClick={() => handleProcess("APPROVED")}
                                disabled={processing}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-1"
                            >
                                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                승인
                            </Button>
                            <Button
                                onClick={() => handleProcess("REJECTED")}
                                variant="destructive"
                                disabled={processing}
                                className="flex-1 gap-1"
                            >
                                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                반려
                            </Button>
                        </div>
                    </div>
                ) : canEdit || canWithdraw ? (
                    // 기안자 액션
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="text-sm text-muted-foreground mr-auto">
                            {approval.status === "PENDING" ? "결재 대기 중 — 필요 시 수정 또는 철회할 수 있습니다." : "결재 진행 중 — 수정 시 진행 중인 결재가 초기화될 수 있습니다."}
                        </div>
                        {canEdit && (
                            <Link href={`/approvals/${approval.id}/edit`}>
                                <Button className="gap-1"><Pencil className="h-4 w-4" /> 수정</Button>
                            </Link>
                        )}
                        {canWithdraw && (
                            <Button variant="outline" onClick={handleWithdraw} disabled={processing} className="gap-1">
                                <RotateCcw className="h-4 w-4" /> 철회
                            </Button>
                        )}
                    </div>
                ) : (
                    // 기타 (승인 완료, 반려, 철회 등)
                    <div className="text-sm text-muted-foreground">
                        이 결재는 {statusConf.label} 상태입니다.
                    </div>
                )}
            </div>

            {toastMsg && (
                <div className="mb-4 rounded-lg bg-primary/10 border border-primary/20 text-primary px-4 py-2 text-sm text-center">
                    {toastMsg}
                </div>
            )}

            {/* ── 결재 진행 카드 ── */}
            <section className="rounded-xl border bg-card p-5 mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">결재 진행</h2>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* 기안 */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold border-2 border-slate-300 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            기안
                        </div>
                        <span className="text-[11px] font-medium">{requesterName}</span>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(approval.createdAt), "M/d", { locale: ko })}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground mb-6" />

                    {approval.steps.map((step, idx) => {
                        const approverName = employees.find((e) => e.id === step.approverId)?.name || step.approverId;
                        const sc = STEP_STATUS_CONFIG[step.status];
                        const isLast = idx === approval.steps.length - 1;
                        return (
                            <React.Fragment key={step.id}>
                                <div className="flex flex-col items-center gap-1">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                                        step.status === "APPROVED" ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" :
                                        step.status === "REJECTED" ? "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400" :
                                        step.status === "PENDING" ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" :
                                        "border-slate-300 bg-slate-50 dark:bg-slate-800 text-slate-400"
                                    }`}>
                                        {isLast ? "최종" : `${idx + 1}차`}
                                    </div>
                                    <span className="text-[11px] font-medium">{approverName}</span>
                                    <span className={`text-[10px] ${sc.color}`}>{sc.label}</span>
                                    {step.actedAt && (
                                        <span className="text-[10px] text-muted-foreground">
                                            {format(new Date(step.actedAt), "M/d HH:mm", { locale: ko })}
                                        </span>
                                    )}
                                    {step.comment && (
                                        <span className="text-[10px] italic text-muted-foreground max-w-[100px] text-center truncate" title={step.comment}>
                                            &quot;{step.comment}&quot;
                                        </span>
                                    )}
                                </div>
                                {!isLast && <ChevronRight className="h-4 w-4 text-muted-foreground mb-6" />}
                            </React.Fragment>
                        );
                    })}
                </div>
            </section>

            {/* ── 카테고리별 요약 ── */}
            {approval.formData && (
                <section className="rounded-xl border bg-card p-5 mb-4">
                    <h2 className="text-sm font-semibold text-muted-foreground mb-3">세부 정보</h2>
                    <FormDataDetail category={effectiveCategory} formData={approval.formData} />
                </section>
            )}

            {/* ── 테이블형 내역 (카테고리별) ── */}
            <TableViews formData={approval.formData} category={effectiveCategory} />

            {/* ── 본문 ── */}
            <section className="rounded-xl border bg-card p-5 mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">내용</h2>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {approval.content}
                </div>
            </section>

            {/* ── 첨부파일 ── */}
            {approval.attachments && approval.attachments.length > 0 && (
                <section className="rounded-xl border bg-card p-5 mb-4">
                    <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Paperclip className="h-4 w-4" />
                        첨부파일 ({approval.attachments.length})
                    </h2>
                    <div className="space-y-2">
                        {approval.attachments.map((att) => (
                            <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={att.name}
                                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors group"
                            >
                                <FileIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate group-hover:text-primary">{att.name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {att.size < 1024 ? `${att.size} B` : att.size < 1024 * 1024 ? `${(att.size / 1024).toFixed(1)} KB` : `${(att.size / (1024 * 1024)).toFixed(1)} MB`}
                                    </p>
                                </div>
                                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                            </a>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

// ─── 카테고리별 테이블 요약 ─────────────────────────────────────────────────────

function TableViews({ category, formData }: { category: string; formData?: Record<string, any> | null }) {
    if (!formData) return null;

    const fmtNum = (n: any) => {
        const num = Number(n);
        return isNaN(num) || num === 0 ? "" : num.toLocaleString();
    };

    const TableCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <section className="rounded-xl border bg-card p-5 mb-4 overflow-x-auto">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">{title}</h2>
            {children}
        </section>
    );

    if (category === "EXPENSE" && Array.isArray(formData.expenses) && formData.expenses.length > 0) {
        const rows = formData.expenses.filter((e: any) => e.content?.trim() || e.vendor?.trim());
        if (rows.length === 0) return null;
        let totalSupply = 0, totalVat = 0;
        const calc = rows.map((e: any) => {
            const qty = Number(e.qty) || 0;
            const up = Number(e.unitPrice) || 0;
            const supply = qty * up;
            const vat = e.noVat ? 0 : Math.round(supply * 0.1);
            totalSupply += supply; totalVat += vat;
            return { supply, vat };
        });
        return (
            <TableCard title="지출 내역">
                <table className="w-full text-xs border-collapse min-w-[640px]">
                    <thead>
                        <tr className="bg-slate-800 text-white">
                            <th className="border p-2 w-[36px]">No.</th>
                            <th className="border p-2 w-[70px]">일자</th>
                            <th className="border p-2 w-[100px]">거래처</th>
                            <th className="border p-2">내용</th>
                            <th className="border p-2 w-[50px]">수량</th>
                            <th className="border p-2 w-[80px]">단가</th>
                            <th className="border p-2 w-[90px]">공급가액</th>
                            <th className="border p-2 w-[80px]">세액</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((e: any, i: number) => (
                            <tr key={i} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                                <td className="border p-2 text-center text-muted-foreground">{i + 1}</td>
                                <td className="border p-2 text-center">{e.date || ""}</td>
                                <td className="border p-2">{e.vendor || ""}</td>
                                <td className="border p-2">{e.content || ""}</td>
                                <td className="border p-2 text-center">{e.qty || ""}</td>
                                <td className="border p-2 text-right tabular-nums">{fmtNum(e.unitPrice)}</td>
                                <td className="border p-2 text-right font-medium tabular-nums">{fmtNum(calc[i].supply)}</td>
                                <td className="border p-2 text-right text-muted-foreground tabular-nums">{e.noVat ? "-" : fmtNum(calc[i].vat)}</td>
                            </tr>
                        ))}
                        <tr className="bg-muted font-semibold">
                            <td colSpan={6} className="border p-2 text-right">소계</td>
                            <td className="border p-2 text-right tabular-nums">{totalSupply.toLocaleString()}</td>
                            <td className="border p-2 text-right tabular-nums">{totalVat.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </TableCard>
        );
    }

    if (category === "TAX_INVOICE" && Array.isArray(formData.taxItems) && formData.taxItems.length > 0) {
        const rows = formData.taxItems.filter((it: any) => it.company?.trim() || it.product?.trim());
        if (rows.length === 0) return null;
        let totalSupply = 0, totalVat = 0;
        const calc = rows.map((it: any) => {
            const qty = Number(it.qty) || 0;
            const up = Number(it.unitPrice) || 0;
            const supply = qty * up;
            const vat = Math.round(supply * 0.1);
            totalSupply += supply; totalVat += vat;
            return { supply, vat };
        });
        return (
            <TableCard title="발행 내역">
                <table className="w-full text-xs border-collapse min-w-[720px]">
                    <thead>
                        <tr className="bg-slate-800 text-white">
                            <th className="border p-2 w-[36px]">No.</th>
                            <th className="border p-2 w-[110px]">업체명</th>
                            <th className="border p-2 w-[70px]">날짜</th>
                            <th className="border p-2">제품/모델/단위</th>
                            <th className="border p-2 w-[50px]">수량</th>
                            <th className="border p-2 w-[80px]">단가</th>
                            <th className="border p-2 w-[90px]">공급가액</th>
                            <th className="border p-2 w-[80px]">부가세</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((it: any, i: number) => (
                            <tr key={i} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                                <td className="border p-2 text-center text-muted-foreground">{i + 1}</td>
                                <td className="border p-2">{it.company || ""}</td>
                                <td className="border p-2 text-center">{it.date || ""}</td>
                                <td className="border p-2">{it.product || ""}</td>
                                <td className="border p-2 text-center">{it.qty || ""}</td>
                                <td className="border p-2 text-right tabular-nums">{fmtNum(it.unitPrice)}</td>
                                <td className="border p-2 text-right font-medium tabular-nums">{fmtNum(calc[i].supply)}</td>
                                <td className="border p-2 text-right text-muted-foreground tabular-nums">{fmtNum(calc[i].vat)}</td>
                            </tr>
                        ))}
                        <tr className="bg-muted font-semibold">
                            <td colSpan={6} className="border p-2 text-right">합계</td>
                            <td className="border p-2 text-right tabular-nums">{totalSupply.toLocaleString()}</td>
                            <td className="border p-2 text-right tabular-nums">{totalVat.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </TableCard>
        );
    }

    if (category === "INSPECTION" && Array.isArray(formData.items) && formData.items.length > 0) {
        const rows = formData.items.filter((it: any) => it.name?.trim());
        if (rows.length === 0) return null;
        let totalSum = 0;
        return (
            <TableCard title="검수 내역">
                <table className="w-full text-xs border-collapse min-w-[600px]">
                    <thead>
                        <tr className="bg-slate-800 text-white">
                            <th className="border p-2 w-[36px]">No.</th>
                            <th className="border p-2">품명</th>
                            <th className="border p-2 w-[60px]">수량</th>
                            <th className="border p-2 w-[100px]">단가</th>
                            <th className="border p-2 w-[110px]">금액</th>
                            <th className="border p-2 w-[100px]">비고</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((it: any, i: number) => {
                            const qty = Number(it.qty) || 0;
                            const up = Number(it.unitPrice) || 0;
                            const sum = qty * up;
                            totalSum += sum;
                            return (
                                <tr key={i} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                                    <td className="border p-2 text-center text-muted-foreground">{i + 1}</td>
                                    <td className="border p-2">{it.name || ""}</td>
                                    <td className="border p-2 text-center">{qty || ""}</td>
                                    <td className="border p-2 text-right tabular-nums">{fmtNum(up)}</td>
                                    <td className="border p-2 text-right font-medium tabular-nums">{fmtNum(sum)}</td>
                                    <td className="border p-2">{it.note || ""}</td>
                                </tr>
                            );
                        })}
                        <tr className="bg-muted font-semibold">
                            <td colSpan={4} className="border p-2 text-right">합계</td>
                            <td className="border p-2 text-right tabular-nums">{totalSum.toLocaleString()}</td>
                            <td className="border p-2"></td>
                        </tr>
                    </tbody>
                </table>
            </TableCard>
        );
    }

    if (category === "EXPENDITURE_PLAN" && Array.isArray(formData.planItems) && formData.planItems.length > 0) {
        const rows = formData.planItems.filter((it: any) => it.category?.trim() || it.detail?.trim());
        if (rows.length === 0) return null;
        let total = 0;
        return (
            <TableCard title="지출계획 내역">
                <table className="w-full text-xs border-collapse min-w-[600px]">
                    <thead>
                        <tr className="bg-slate-800 text-white">
                            <th className="border p-2 w-[36px]">No.</th>
                            <th className="border p-2 w-[80px]">일자</th>
                            <th className="border p-2 w-[100px]">항목</th>
                            <th className="border p-2">세부내역</th>
                            <th className="border p-2 w-[110px]">금액</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((it: any, i: number) => {
                            const amt = Number(it.amount) || 0;
                            total += amt;
                            return (
                                <tr key={i} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                                    <td className="border p-2 text-center text-muted-foreground">{i + 1}</td>
                                    <td className="border p-2">{it.date || ""}</td>
                                    <td className="border p-2">{it.category || ""}</td>
                                    <td className="border p-2">{it.detail || ""}</td>
                                    <td className="border p-2 text-right font-medium tabular-nums">{fmtNum(amt)}</td>
                                </tr>
                            );
                        })}
                        <tr className="bg-muted font-semibold">
                            <td colSpan={4} className="border p-2 text-right">합계</td>
                            <td className="border p-2 text-right tabular-nums">{total.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </TableCard>
        );
    }

    if (category === "PERSONAL_EXPENSE" && Array.isArray(formData.expenseItems) && formData.expenseItems.length > 0) {
        const rows = formData.expenseItems.filter((it: any) => it.content?.trim() || Number(it.amount) > 0);
        if (rows.length === 0) return null;
        let total = 0;
        return (
            <TableCard title="개인경비 내역">
                <table className="w-full text-xs border-collapse min-w-[480px]">
                    <thead>
                        <tr className="bg-slate-800 text-white">
                            <th className="border p-2 w-[36px]">No.</th>
                            <th className="border p-2">내용</th>
                            <th className="border p-2 w-[100px]">결제수단</th>
                            <th className="border p-2 w-[110px]">금액</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((it: any, i: number) => {
                            const amt = Number(it.amount) || 0;
                            total += amt;
                            return (
                                <tr key={i} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                                    <td className="border p-2 text-center text-muted-foreground">{i + 1}</td>
                                    <td className="border p-2">{it.content || ""}</td>
                                    <td className="border p-2 text-center">{it.payment || ""}</td>
                                    <td className="border p-2 text-right font-medium tabular-nums">{fmtNum(amt)}</td>
                                </tr>
                            );
                        })}
                        <tr className="bg-muted font-semibold">
                            <td colSpan={3} className="border p-2 text-right">합계</td>
                            <td className="border p-2 text-right tabular-nums">{total.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </TableCard>
        );
    }

    return null;
}

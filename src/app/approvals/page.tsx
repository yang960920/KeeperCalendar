"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ChevronDown,
    Loader2,
    FilePlus,
    Search,
    Download,
    FileText,
    X,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    getMyApprovals,
    getDepartmentApprovals,
} from "@/app/actions/approval";
import { getEmployees } from "@/app/actions/employee";
import { downloadApprovals } from "./pdf-utils";
import {
    CATEGORY_OPTIONS,
    STATUS_CONFIG,
    APPROVAL_ADMIN_IDS,
    type ApprovalData,
    type Employee,
} from "./_shared";

// ─── (타입·상수·FormDataDetail·Dialog 로직은 ./_shared 또는 /approvals/[id]/page.tsx 로 이동) ──

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
    const requesterEmp = employees.find((e) => e.id === approval.requesterId);
    const requesterName = requesterEmp?.name || "";
    const requesterDept = (approval as any).departmentName || requesterEmp?.departmentName || "";

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
                <span>{requesterDept ? `${requesterDept} ${requesterName}` : requesterName}</span>
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
    const [tab, setTab] = useState<"toApprove" | "requested" | "department">("toApprove");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState("");
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // 부서별 결재목록 (관리자 전용)
    const [departmentApprovals, setDepartmentApprovals] = useState<ApprovalData[]>([]);
    const [deptFilter, setDeptFilter] = useState<string>("ALL");
    const isAdmin = user ? APPROVAL_ADMIN_IDS.includes(user.id) : false;

    const loadData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const promises: Promise<any>[] = [
                getMyApprovals(user.id),
                getEmployees(),
            ];
            // 관리자만 부서별 결재 목록 로드
            if (APPROVAL_ADMIN_IDS.includes(user.id)) {
                promises.push(getDepartmentApprovals(user.id));
            }
            const results = await Promise.all(promises);
            const [approvalsRes, empRes, deptRes] = results;

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
            if (deptRes?.success) setDepartmentApprovals(deptRes.data as any);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // 부서별 탭에서 사용할 부서 목록
    const departmentOptions = useMemo(() => {
        const deptSet = new Map<string, string>();
        departmentApprovals.forEach((a: any) => {
            if (a.departmentName) deptSet.set(a.departmentName, a.departmentName);
        });
        return Array.from(deptSet.values()).sort();
    }, [departmentApprovals]);

    const currentList = useMemo(() => {
        let list: ApprovalData[];
        if (tab === "toApprove") list = data.toApprove;
        else if (tab === "requested") list = data.requested;
        else if (tab === "department") list = departmentApprovals;
        else list = [...data.requested, ...data.toApprove];

        // 부서 필터 (부서별 탭에서만 적용)
        if (tab === "department" && deptFilter !== "ALL") {
            list = list.filter((a: any) => a.departmentName === deptFilter);
        }

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
                const requesterName = (a as any).requesterName || employees.find((e) => e.id === a.requesterId)?.name || "";
                return (
                    a.title.toLowerCase().includes(q) ||
                    a.content.toLowerCase().includes(q) ||
                    requesterName.toLowerCase().includes(q)
                );
            });
        }
        return list;
    }, [tab, data, departmentApprovals, deptFilter, statusFilter, categoryFilter, searchQuery, employees]);

    const toggleSelectMode = () => {
        if (selectMode) {
            setSelectMode(false);
            setSelectedIds(new Set());
        } else {
            setSelectMode(true);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === currentList.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(currentList.map((a) => a.id)));
        }
    };

    const handleDownload = async () => {
        const targets = currentList.filter((a) => selectedIds.has(a.id));
        if (targets.length === 0 || isDownloading) return;
        setIsDownloading(true);
        setDownloadProgress(`0 / ${targets.length}`);
        try {
            await downloadApprovals(targets, employees, (current, total) => {
                setDownloadProgress(`${current} / ${total}`);
            });
        } catch (e) {
            console.error("PDF 다운로드 실패:", e);
            alert("PDF 다운로드 중 오류가 발생했습니다.");
        } finally {
            setIsDownloading(false);
            setDownloadProgress("");
            setSelectMode(false);
            setSelectedIds(new Set());
        }
    };

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
                    <div className="flex items-center gap-2">
                        {selectMode ? (
                            <>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="gap-1.5 text-muted-foreground"
                                    onClick={toggleSelectMode}
                                    disabled={isDownloading}
                                >
                                    <X className="h-4 w-4" />
                                    취소
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5"
                                    onClick={toggleSelectAll}
                                    disabled={isDownloading}
                                >
                                    {selectedIds.size === currentList.length ? "전체 해제" : "전체 선택"}
                                </Button>
                                <Button
                                    size="sm"
                                    className="gap-1.5"
                                    disabled={isDownloading || selectedIds.size === 0}
                                    onClick={handleDownload}
                                >
                                    {isDownloading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {downloadProgress}
                                        </>
                                    ) : (
                                        <>
                                            <Download className="h-4 w-4" />
                                            다운로드 ({selectedIds.size})
                                        </>
                                    )}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5"
                                    disabled={currentList.length === 0}
                                    onClick={toggleSelectMode}
                                >
                                    <Download className="h-4 w-4" />
                                    다운로드
                                </Button>
                                <Link href="/approvals/new">
                                    <Button size="sm" className="gap-1.5">
                                        <FilePlus className="h-4 w-4" />
                                        기안하기
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
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
                    {isAdmin && (
                        <button
                            onClick={() => setTab("department")}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                tab === "department" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            부서별 결재목록
                            {departmentApprovals.length > 0 && (
                                <span className="ml-1.5 bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                                    {departmentApprovals.length}
                                </span>
                            )}
                        </button>
                    )}
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
                {tab === "department" && (
                    <Select value={deptFilter} onValueChange={setDeptFilter}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue placeholder="전체 부서" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">전체 부서</SelectItem>
                            {departmentOptions.map((dept) => (
                                <SelectItem key={dept} value={dept}>
                                    {dept}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
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
                {(categoryFilter !== "ALL" || statusFilter !== "ALL" || deptFilter !== "ALL" || searchQuery) && (
                    <button
                        onClick={() => { setCategoryFilter("ALL"); setStatusFilter("ALL"); setDeptFilter("ALL"); setSearchQuery(""); }}
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
                        <div key={approval.id} className="flex items-start gap-2">
                            {selectMode && (
                                <button
                                    onClick={() => toggleSelect(approval.id)}
                                    className={`mt-4 shrink-0 flex items-center justify-center w-5 h-5 rounded border-2 transition-colors ${
                                        selectedIds.has(approval.id)
                                            ? "bg-emerald-500 border-emerald-500"
                                            : "border-muted-foreground/40 hover:border-primary"
                                    }`}
                                >
                                    {selectedIds.has(approval.id) && (
                                        <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M2.5 6L5 8.5L9.5 3.5" />
                                        </svg>
                                    )}
                                </button>
                            )}
                            <div className="flex-1 min-w-0">
                                <Link href={`/approvals/${approval.id}`} className="block">
                                    <ApprovalCard approval={approval} employees={employees} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

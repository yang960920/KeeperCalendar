"use client";

import React from "react";
import {
    Calendar,
    Clock,
    Clock4,
    MapPin,
    DollarSign,
    FileText,
    CheckCircle2,
    XCircle,
    ClipboardCheck,
    Navigation,
} from "lucide-react";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface ApprovalStep {
    id: string;
    approverId: string;
    stepOrder: number;
    status: "WAITING" | "PENDING" | "APPROVED" | "REJECTED";
    comment?: string;
    actedAt?: string;
}

export interface ApprovalAttachmentData {
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
}

export interface ApprovalData {
    id: string;
    title: string;
    content: string;
    category: string;
    status: "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED" | "WITHDRAWN";
    requesterId: string;
    projectId?: string;
    formData?: Record<string, any>;
    steps: ApprovalStep[];
    attachments?: ApprovalAttachmentData[];
    createdAt: string;
}

export interface Employee {
    id: string;
    name: string;
    departmentName: string;
}

// ─── 상수 ─────────────────────────────────────────────────────────────────────

export const CATEGORY_OPTIONS = [
    { value: "VACATION",          label: "휴가",         icon: Calendar },
    { value: "OVERTIME",          label: "시간외근무",     icon: Clock },
    { value: "BUSINESS_TRIP",     label: "외근/출장",     icon: MapPin },
    { value: "FIELD_WORK_PLAN",   label: "외근/출장계획", icon: Navigation },
    { value: "EXPENSE",           label: "지출결의",     icon: DollarSign },
    { value: "GENERAL",           label: "품의서",        icon: FileText },
    { value: "GRANT_APPLICATION", label: "정부과제",      icon: FileText },
    { value: "INSPECTION",        label: "납품/검수",     icon: ClipboardCheck },
    { value: "TAX_INVOICE",       label: "세금계산서",   icon: FileText },
    { value: "EXPENDITURE_PLAN",  label: "지출계획",     icon: DollarSign },
    { value: "PERSONAL_EXPENSE",  label: "개인경비",     icon: DollarSign },
];

export const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    PENDING:     { label: "대기 중",   color: "text-slate-400",   icon: Clock4 },
    IN_PROGRESS: { label: "결재 중",   color: "text-blue-400",    icon: Clock4 },
    APPROVED:    { label: "승인 완료", color: "text-emerald-400", icon: CheckCircle2 },
    REJECTED:    { label: "반려",      color: "text-red-400",     icon: XCircle },
    WITHDRAWN:   { label: "철회",      color: "text-slate-500",   icon: XCircle },
};

export const STEP_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    WAITING:  { label: "대기",   color: "text-slate-400" },
    PENDING:  { label: "결재 중", color: "text-blue-400" },
    APPROVED: { label: "승인",   color: "text-emerald-400" },
    REJECTED: { label: "반려",   color: "text-red-400" },
};

export const APPROVAL_ADMIN_IDS = ["양현준", "유경성", "김권찬", "한승우", "진호열"];

// ─── 카테고리별 폼 데이터 요약 (읽기 전용) ──────────────────────────────────────

export function FormDataDetail({ category, formData }: { category: string; formData?: Record<string, any> | null }) {
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
            if (formData.location) items.push({ label: "장소", value: formData.location });
            if (formData.tripStartDate) items.push({ label: "시작일", value: formData.tripStartDate });
            if (formData.tripEndDate && formData.tripEndDate !== formData.tripStartDate) items.push({ label: "종료일", value: formData.tripEndDate });
            if (formData.visitCompany) items.push({ label: "방문기관", value: formData.visitCompany });
            break;
        case "FIELD_WORK_PLAN": {
            const typeLabel = formData.tripType === "기타" && formData.tripTypeEtc
                ? `기타 (${formData.tripTypeEtc})`
                : formData.tripType;
            if (typeLabel) items.push({ label: "구분", value: typeLabel });
            if (formData.tripStartDate) items.push({ label: "시작일", value: formData.tripStartDate });
            if (formData.tripEndDate && formData.tripEndDate !== formData.tripStartDate) items.push({ label: "종료일", value: formData.tripEndDate });
            if (formData.visitCompany) items.push({ label: "방문처", value: formData.visitCompany });
            if (formData.visitPlace) items.push({ label: "장소", value: formData.visitPlace });
            const exp = formData.expenses || {};
            const expTotal = ["transport", "lodging", "meal", "etc"].reduce((s: number, k: string) => s + (Number(exp[k]) || 0), 0);
            if (expTotal > 0) items.push({ label: "예상경비", value: `${expTotal.toLocaleString()}원` });
            break;
        }
        case "EXPENSE":
            if (formData.expenseItem) items.push({ label: "항목", value: formData.expenseItem });
            if (formData.amount) items.push({ label: "금액", value: `${Number(formData.amount).toLocaleString()}원` });
            if (formData.expenseDate) items.push({ label: "사용일", value: formData.expenseDate });
            if (formData.receiptType) items.push({ label: "증빙", value: formData.receiptType });
            if (formData.periodStart && formData.periodEnd) items.push({ label: "정산기간", value: `${formData.periodStart} ~ ${formData.periodEnd}` });
            break;
        case "GRANT_APPLICATION":
            if (formData.project_name) items.push({ label: "과제명", value: formData.project_name });
            if (formData.funding_agency) items.push({ label: "주관기관", value: formData.funding_agency });
            if (formData.deadline) items.push({ label: "마감일", value: formData.deadline });
            if (formData.product_line) items.push({ label: "제품라인", value: formData.product_line });
            if (formData.url) items.push({ label: "공고링크", value: "원문 보기" });
            break;
        case "INSPECTION":
            if (formData.docTitle) items.push({ label: "과제명", value: formData.docTitle });
            if (formData.vendor) items.push({ label: "납품업체", value: formData.vendor });
            if (formData.inspectionDate) items.push({ label: "검수일", value: formData.inspectionDate });
            if (formData.inspector) items.push({ label: "검수자", value: formData.inspector });
            break;
        case "TAX_INVOICE":
            if (formData.issueDate) items.push({ label: "발행일", value: formData.issueDate });
            if (formData.manager) items.push({ label: "담당자", value: formData.manager });
            if (formData.managerContact) items.push({ label: "연락처", value: formData.managerContact });
            break;
        case "EXPENDITURE_PLAN":
            if (formData.planDate) items.push({ label: "작성일", value: formData.planDate });
            break;
        case "PERSONAL_EXPENSE":
            if (formData.bankAccount) items.push({ label: "계좌", value: formData.bankAccount });
            break;
    }

    if (items.length === 0) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-muted/30 rounded-lg p-4 text-sm">
            {items.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs w-20 flex-shrink-0">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                </div>
            ))}
        </div>
    );
}

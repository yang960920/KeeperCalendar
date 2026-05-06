"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
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
    FileText,
    ArrowLeft,
    Plus,
    Trash2,
    Paperclip,
    Upload,
    File as FileIcon,
    ClipboardCheck,
    Navigation,
    Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { createApprovalRequest, getApprovalRequestById, updateApprovalRequest } from "@/app/actions/approval";
import { getEmployees } from "@/app/actions/employee";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface Employee {
    id: string;
    name: string;
    departmentName: string;
}

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
    { value: "VACATION",          label: "휴가",       icon: Calendar,   desc: "연차, 반차, 병가 등" },
    { value: "OVERTIME",          label: "시간외근무",  icon: Clock,      desc: "야근, 휴일근무" },
    { value: "BUSINESS_TRIP",     label: "외근/출장",   icon: MapPin,     desc: "외근 및 출장 결과 보고" },
    { value: "FIELD_WORK_PLAN",   label: "외근/출장계획", icon: Navigation, desc: "외근/출장 사전 계획서" },
    { value: "EXPENSE",           label: "지출결의",    icon: DollarSign, desc: "지출 내역 정산 및 송금 요청" },
    { value: "GENERAL",           label: "품의서",      icon: FileText,   desc: "구매, 계약 등 일반 품의" },
    { value: "GRANT_APPLICATION", label: "정부과제",    icon: FileText,   desc: "정부과제 신청" },
    { value: "INSPECTION",        label: "납품/검수",   icon: ClipboardCheck, desc: "납품/검수확인서 (입고증)" },
    { value: "TAX_INVOICE",       label: "세금계산서",  icon: FileText,       desc: "세금계산서 발행 요청" },
    { value: "EXPENDITURE_PLAN", label: "지출계획",   icon: DollarSign,     desc: "자금 지출계획서" },
    { value: "PERSONAL_EXPENSE", label: "개인경비",  icon: DollarSign,     desc: "개인경비 사용 청구" },
];

const VACATION_TYPES = ["연차", "반차(오전)", "반차(오후)", "병가", "경조", "기타"];

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
        <div className="space-y-4">
            <div>
                <label className="text-sm font-medium mb-1.5 block">휴가 유형 *</label>
                <Select
                    value={formData.vacationType || "연차"}
                    onValueChange={(v) => onChange({ ...formData, vacationType: v })}
                >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {VACATION_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium mb-1.5 block">시작일 *</label>
                    <Input
                        type="date"
                        value={formData.startDate || ""}
                        onChange={(e) => onChange({ ...formData, startDate: e.target.value })}
                    />
                </div>
                <div>
                    <label className="text-sm font-medium mb-1.5 block">종료일 *</label>
                    <Input
                        type="date"
                        value={formData.endDate || ""}
                        onChange={(e) => onChange({ ...formData, endDate: e.target.value })}
                    />
                </div>
            </div>
            {days > 0 && (
                <div className="text-sm text-primary font-medium bg-primary/10 rounded-lg px-4 py-2.5">
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
        <div className="space-y-4">
            <div>
                <label className="text-sm font-medium mb-1.5 block">근무일 *</label>
                <Input
                    type="date"
                    value={formData.overtimeDate || ""}
                    onChange={(e) => onChange({ ...formData, overtimeDate: e.target.value })}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium mb-1.5 block">시작 시간 *</label>
                    <Input
                        type="time"
                        value={formData.startTime || "18:00"}
                        onChange={(e) => onChange({ ...formData, startTime: e.target.value })}
                    />
                </div>
                <div>
                    <label className="text-sm font-medium mb-1.5 block">종료 시간 *</label>
                    <Input
                        type="time"
                        value={formData.endTime || "21:00"}
                        onChange={(e) => onChange({ ...formData, endTime: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );
}

// ─── 외근/출장 보고서 (BUSINESS_TRIP) 문서형 폼 ─────────────────────────────

function BusinessTripDocFormFields({
    formData,
    onChange,
    userName,
    userDepartment,
}: {
    formData: Record<string, any>;
    onChange: (data: Record<string, any>) => void;
    userName: string;
    userDepartment: string;
}) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}. ${String(today.getMonth() + 1).padStart(2, "0")}. ${String(today.getDate()).padStart(2, "0")}`;

    const schedules: any[] = formData.schedules || [];
    const followups: any[] = formData.followups || [];
    const tripExpenses: any[] = formData.tripExpenses || [];

    // 다음 우편번호 API 스크립트 로드
    useEffect(() => {
        if (document.getElementById("daum-postcode-script")) return;
        const script = document.createElement("script");
        script.id = "daum-postcode-script";
        script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
        script.async = true;
        document.head.appendChild(script);
    }, []);

    // 주소 검색 팝업
    const openPostcode = () => {
        const daum = (window as any).daum;
        if (!daum?.Postcode) {
            alert("주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }
        new daum.Postcode({
            oncomplete: (data: any) => {
                const address = data.roadAddress || data.jibunAddress;
                onChange({ ...formData, location: address });
            },
        }).open();
    };

    // 기간 / 시간 표시 계산
    const tripDurationLabel = useMemo(() => {
        const sd = formData.tripStartDate;
        const ed = formData.tripEndDate;
        if (!sd) return "";
        if (!ed || sd === ed) {
            // 당일 — 시간 차이 표시
            const st = formData.tripStartTime;
            const et = formData.tripEndTime;
            if (st && et) {
                const [sh, sm] = st.split(":").map(Number);
                const [eh, em] = et.split(":").map(Number);
                const diff = (eh * 60 + em) - (sh * 60 + sm);
                if (diff > 0) { const h = diff / 60; return `당일 (${h % 1 === 0 ? h : h.toFixed(1)}시간)`; }
            }
            return "당일";
        }
        // 복수일
        const s = new Date(sd);
        const e = new Date(ed);
        if (e < s) return "";
        const nights = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
        return `${nights}박${nights + 1}일`;
    }, [formData.tripStartDate, formData.tripEndDate, formData.tripStartTime, formData.tripEndTime]);

    // 경비 합계
    const expenseTotal = useMemo(() => {
        return tripExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
    }, [tripExpenses]);

    // ── 일정 행 조작 ──
    const updateSchedule = (i: number, field: string, value: string) => {
        const next = schedules.map((s: any, idx: number) => (idx === i ? { ...s, [field]: value } : s));
        onChange({ ...formData, schedules: next });
    };
    const addScheduleRow = () => {
        if (schedules.length >= 8) return;
        onChange({ ...formData, schedules: [...schedules, { time: "", location: "", content: "", result: "" }] });
    };
    const removeScheduleRow = (i: number) => {
        if (schedules.length <= 1) return;
        onChange({ ...formData, schedules: schedules.filter((_: any, idx: number) => idx !== i) });
    };

    // ── 후속 조치 행 조작 ──
    const updateFollowup = (i: number, field: string, value: string) => {
        const next = followups.map((f: any, idx: number) => (idx === i ? { ...f, [field]: value } : f));
        onChange({ ...formData, followups: next });
    };
    const addFollowupRow = () => {
        if (followups.length >= 6) return;
        onChange({ ...formData, followups: [...followups, { text: "", dueDate: "" }] });
    };
    const removeFollowupRow = (i: number) => {
        if (followups.length <= 1) return;
        onChange({ ...formData, followups: followups.filter((_: any, idx: number) => idx !== i) });
    };

    // ── 경비 행 조작 ──
    const updateTripExpense = (i: number, field: string, value: string) => {
        const next = tripExpenses.map((e: any, idx: number) => (idx === i ? { ...e, [field]: value } : e));
        onChange({ ...formData, tripExpenses: next });
    };
    const addTripExpenseRow = () => {
        if (tripExpenses.length >= 6) return;
        onChange({ ...formData, tripExpenses: [...tripExpenses, { category: "", content: "", amount: "", payMethod: "법인카드" }] });
    };
    const removeTripExpenseRow = (i: number) => {
        if (tripExpenses.length <= 1) return;
        onChange({ ...formData, tripExpenses: tripExpenses.filter((_: any, idx: number) => idx !== i) });
    };

    const TH = "border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400";
    const TD = "border border-slate-300 dark:border-slate-600 px-1 py-0.5";
    const DARK_TH = "bg-slate-800 dark:bg-slate-900 text-white text-xs font-medium px-2 py-2.5 border border-slate-700";
    const SL = "text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 pl-3 border-l-[3px] border-slate-800 dark:border-slate-400";

    return (
        <div className="rounded-xl border overflow-hidden shadow-sm">
            {/* ── 문서 헤더 ── */}
            <div className="bg-slate-800 text-white px-6 sm:px-8 py-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-[0.15em]">외 근 보 고 서</h2>
                <div className="text-right text-sm text-slate-400 leading-relaxed">
                    기 안 일 : <span className="text-white font-medium">{dateStr}</span>
                </div>
            </div>

            <div className="bg-background">
                {/* ── 작성자 정보 ── */}
                <div className="px-6 sm:px-8 pt-6">
                    <div className={SL}>작성자 정보</div>
                    <table className="w-full border-collapse text-sm mb-6">
                        <tbody>
                            <tr>
                                <th className={`${TH} w-[100px]`}>성 명</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5 font-medium">{userName}</td>
                                <th className={`${TH} w-[100px]`}>작 성 일</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">{dateStr}</td>
                            </tr>
                            <tr>
                                <th className={TH}>소 속</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">{userDepartment}</td>
                                <th className={TH}>직 급</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">
                                    <input className={DOC_INPUT} placeholder="직급" value={formData.position || ""} onChange={(e) => onChange({ ...formData, position: e.target.value })} />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 개요 카드 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className={SL}>개요</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 기간 */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">D</div>
                            <div className="flex-1 space-y-1.5">
                                <div className="text-xs text-slate-400 font-medium">기간</div>
                                <div className="flex items-center gap-1.5">
                                    <input type="date" className={`${DOC_INPUT} text-sm font-medium`} value={formData.tripStartDate || ""} onChange={(e) => onChange({ ...formData, tripStartDate: e.target.value })} />
                                    <span className="text-xs text-slate-400">~</span>
                                    <input type="date" className={`${DOC_INPUT} text-sm font-medium`} value={formData.tripEndDate || ""} onChange={(e) => onChange({ ...formData, tripEndDate: e.target.value })} />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <input type="time" className={`${DOC_INPUT} text-xs w-24`} value={formData.tripStartTime || ""} onChange={(e) => onChange({ ...formData, tripStartTime: e.target.value })} />
                                    <span className="text-xs text-slate-400">~</span>
                                    <input type="time" className={`${DOC_INPUT} text-xs w-24`} value={formData.tripEndTime || ""} onChange={(e) => onChange({ ...formData, tripEndTime: e.target.value })} />
                                    {tripDurationLabel && <span className="text-xs text-blue-500 font-medium">({tripDurationLabel})</span>}
                                </div>
                            </div>
                        </div>
                        {/* 장소 */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">L</div>
                            <div className="flex-1 space-y-1.5">
                                <div className="text-xs text-slate-400 font-medium">장소</div>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        className={`${DOC_INPUT} text-sm font-medium flex-1 cursor-pointer`}
                                        placeholder="클릭하여 주소 검색"
                                        value={formData.location || ""}
                                        readOnly
                                        onClick={openPostcode}
                                    />
                                    <button
                                        type="button"
                                        onClick={openPostcode}
                                        className="shrink-0 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                                    >
                                        <Search className="h-3.5 w-3.5 inline -mt-0.5 mr-1" />
                                        주소 검색
                                    </button>
                                </div>
                                <input className={`${DOC_INPUT} text-xs`} placeholder="상세 장소 (건물명, 층수 등)" value={formData.locationDetail || ""} onChange={(e) => onChange({ ...formData, locationDetail: e.target.value })} />
                            </div>
                        </div>
                        {/* 방문 기관 */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex gap-3">
                            <div className="w-9 h-9 rounded-lg bg-violet-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">C</div>
                            <div className="flex-1 space-y-1.5">
                                <div className="text-xs text-slate-400 font-medium">방문 기관</div>
                                <input className={`${DOC_INPUT} text-sm font-medium`} placeholder="기관 / 회사명" value={formData.visitCompany || ""} onChange={(e) => onChange({ ...formData, visitCompany: e.target.value })} />
                                <input className={`${DOC_INPUT} text-xs`} placeholder="방문 부서" value={formData.visitDepartment || ""} onChange={(e) => onChange({ ...formData, visitDepartment: e.target.value })} />
                            </div>
                        </div>
                        {/* 면담자 */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex gap-3">
                            <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">P</div>
                            <div className="flex-1 space-y-1.5">
                                <div className="text-xs text-slate-400 font-medium">면담자</div>
                                <input className={`${DOC_INPUT} text-sm font-medium`} placeholder="성명 / 직함" value={formData.contactName || ""} onChange={(e) => onChange({ ...formData, contactName: e.target.value })} />
                                <input className={`${DOC_INPUT} text-xs`} placeholder="연락처" value={formData.contactPhone || ""} onChange={(e) => onChange({ ...formData, contactPhone: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── 목적 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className={SL}>목적</div>
                    <table className="w-full border-collapse text-sm">
                        <tbody>
                            <tr>
                                <th className={`${TH} w-[100px] align-top`}>목 적</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3">
                                    <textarea
                                        className="w-full border-0 bg-transparent px-1 py-1 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none min-h-[80px]"
                                        placeholder="외근/출장 목적을 작성하세요"
                                        value={formData.purpose || ""}
                                        onChange={(e) => onChange({ ...formData, purpose: e.target.value })}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 방문 일정 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className="flex items-center justify-between mb-1">
                        <div className={SL.replace("mb-3", "mb-0")}>방문 일정</div>
                        {schedules.length < 8 && (
                            <button type="button" onClick={addScheduleRow} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <Plus className="h-3 w-3" /> 행 추가
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">여러 곳을 방문한 경우 행을 추가하여 각 방문지별로 작성해주세요.</p>
                    <div className="overflow-x-auto -mx-6 px-6 sm:-mx-8 sm:px-8">
                        <table className="w-full border-collapse text-sm min-w-[640px]">
                            <thead>
                                <tr>
                                    <th className={`${DARK_TH} w-[36px]`}>No.</th>
                                    <th className={`${DARK_TH} w-[130px]`}>시간</th>
                                    <th className={`${DARK_TH} w-[140px]`}>장소 / 대상</th>
                                    <th className={DARK_TH}>수행 내용</th>
                                    <th className={`${DARK_TH} w-[130px]`}>비고</th>
                                    <th className={`${DARK_TH} w-[28px]`}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedules.map((s: any, i: number) => (
                                    <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-800/30" : ""}>
                                        <td className={`${TD} text-center text-xs font-semibold text-slate-500 px-2`}>{i + 1}</td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs text-center`} placeholder="09:00 ~ 10:00" value={s.time || ""} onChange={(e) => updateSchedule(i, "time", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="장소 / 대상" value={s.location || ""} onChange={(e) => updateSchedule(i, "location", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="수행 내용" value={s.content || ""} onChange={(e) => updateSchedule(i, "content", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="추가 방문지, 메모 등" value={s.result || ""} onChange={(e) => updateSchedule(i, "result", e.target.value)} />
                                        </td>
                                        <td className={`${TD} text-center`}>
                                            {schedules.length > 1 && (
                                                <button type="button" onClick={() => removeScheduleRow(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── 업무 수행 결과 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className={SL}>업무 수행 결과</div>
                    <table className="w-full border-collapse text-sm">
                        <tbody>
                            <tr>
                                <th className={`${TH} w-[100px] align-top`}>주요 성과</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3">
                                    <textarea
                                        className="w-full border-0 bg-transparent px-1 py-1 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none min-h-[120px] leading-loose"
                                        placeholder={"1. 주요 성과 항목을 기재하세요\n2. ...\n3. ..."}
                                        value={formData.achievements || ""}
                                        onChange={(e) => onChange({ ...formData, achievements: e.target.value })}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 후속 조치 사항 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className={SL.replace("mb-3", "mb-0")}>후속 조치 사항</div>
                        {followups.length < 6 && (
                            <button type="button" onClick={addFollowupRow} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <Plus className="h-3 w-3" /> 항목 추가
                            </button>
                        )}
                    </div>
                    <table className="w-full border-collapse text-sm">
                        <tbody>
                            <tr>
                                <th className={`${TH} w-[100px] align-top`}>조치 내용</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3">
                                    <div className="space-y-0">
                                        {followups.map((f: any, i: number) => (
                                            <div key={i} className={`flex items-start gap-3 py-2.5 ${i > 0 ? "border-t border-dashed border-slate-200 dark:border-slate-700" : ""}`}>
                                                <div className="w-4.5 h-4.5 mt-0.5 border-[1.5px] border-slate-300 dark:border-slate-600 rounded flex-shrink-0" />
                                                <div className="flex-1 space-y-1">
                                                    <input className={`${DOC_INPUT} text-sm`} placeholder="조치 내용을 입력하세요" value={f.text || ""} onChange={(e) => updateFollowup(i, "text", e.target.value)} />
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-400">기한 :</span>
                                                        <input type="date" className={`${DOC_INPUT} text-xs w-36`} value={f.dueDate || ""} onChange={(e) => updateFollowup(i, "dueDate", e.target.value)} />
                                                    </div>
                                                </div>
                                                {followups.length > 1 && (
                                                    <button type="button" onClick={() => removeFollowupRow(i)} className="text-slate-400 hover:text-red-500 transition-colors mt-1">
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 경비 발생 내역 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className={SL.replace("mb-3", "mb-0")}>경비 발생 내역</div>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.hasExpense !== false}
                                    onChange={(e) => onChange({ ...formData, hasExpense: e.target.checked })}
                                    className="rounded border-slate-300"
                                />
                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${formData.hasExpense !== false ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800" : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"}`}>
                                    {formData.hasExpense !== false ? "경비 발생" : "경비 없음"}
                                </span>
                            </label>
                        </div>
                        {formData.hasExpense !== false && tripExpenses.length < 6 && (
                            <button type="button" onClick={addTripExpenseRow} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <Plus className="h-3 w-3" /> 행 추가
                            </button>
                        )}
                    </div>
                    {formData.hasExpense !== false && (
                        <div className="overflow-x-auto -mx-6 px-6 sm:-mx-8 sm:px-8">
                            <table className="w-full border-collapse text-sm min-w-[540px]">
                                <thead>
                                    <tr>
                                        <th className={`${TH} w-[36px] text-xs`}>No.</th>
                                        <th className={`${TH} w-[100px] text-xs`}>항목</th>
                                        <th className={`${TH} text-xs`}>내용</th>
                                        <th className={`${TH} w-[100px] text-xs`} style={{ textAlign: "right" }}>금액</th>
                                        <th className={`${TH} w-[90px] text-xs`}>결제 수단</th>
                                        <th className={`${TH} w-[28px]`}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tripExpenses.map((exp: any, i: number) => (
                                        <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-800/30" : ""}>
                                            <td className={`${TD} text-center text-xs font-semibold text-slate-500 px-2`}>{i + 1}</td>
                                            <td className={TD}>
                                                <select className={`${DOC_SELECT} text-xs`} value={exp.category || ""} onChange={(e) => updateTripExpense(i, "category", e.target.value)}>
                                                    <option value="">선택</option>
                                                    <option value="교통비">교통비</option>
                                                    <option value="식비">식비</option>
                                                    <option value="숙박비">숙박비</option>
                                                    <option value="주차비">주차비</option>
                                                    <option value="기타">기타</option>
                                                </select>
                                            </td>
                                            <td className={TD}>
                                                <input className={`${DOC_INPUT} text-xs`} placeholder="내용" value={exp.content || ""} onChange={(e) => updateTripExpense(i, "content", e.target.value)} />
                                            </td>
                                            <td className={TD}>
                                                <input className={`${DOC_INPUT} text-xs text-right font-semibold`} type="number" placeholder="0" value={exp.amount || ""} onChange={(e) => updateTripExpense(i, "amount", e.target.value)} />
                                            </td>
                                            <td className={TD}>
                                                <select className={`${DOC_SELECT} text-xs`} value={exp.payMethod || "법인카드"} onChange={(e) => updateTripExpense(i, "payMethod", e.target.value)}>
                                                    <option value="법인카드">법인카드</option>
                                                    <option value="개인카드">개인카드</option>
                                                    <option value="현금">현금</option>
                                                </select>
                                            </td>
                                            <td className={`${TD} text-center`}>
                                                {tripExpenses.length > 1 && (
                                                    <button type="button" onClick={() => removeTripExpenseRow(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* 합계 */}
                                    <tr className="border-t-2 border-slate-400 dark:border-slate-500">
                                        <td colSpan={3} className="border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-right px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400">
                                            합 계
                                        </td>
                                        <td className="border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-right px-2 py-2.5 text-sm font-bold tabular-nums">
                                            {expenseTotal.toLocaleString()}
                                        </td>
                                        <td colSpan={2} className="border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── 하단 서명 미리보기 ── */}
                <div className="text-center px-6 sm:px-8 pb-8 text-sm text-slate-500 dark:text-slate-400 leading-loose">
                    <p>위와 같이 외근/출장 결과를 보고합니다.</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300 mt-2">
                        {dateStr.replace(/\. /g, "년 ").replace(/\.$/, "") + "일"}
                    </p>
                    <p className="mt-1">
                        <span className="text-slate-400">{userDepartment}</span>
                        &nbsp;&nbsp;
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                            {userName.split("").join(" ")}
                        </span>
                        <span className="text-slate-400 ml-2">(인)</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── 외근/출장 계획서 (FIELD_WORK_PLAN) 문서형 폼 ────────────────────────────

const PLAN_TRIP_TYPES = ["외근", "국내출장", "해외출장", "기타"];
const PLAN_EXPENSE_CATEGORIES = [
    { key: "transport", label: "교통비" },
    { key: "lodging", label: "숙박비" },
    { key: "meal", label: "식비" },
    { key: "etc", label: "기타" },
];

function FieldWorkPlanFormFields({
    formData,
    onChange,
    userName,
    userDepartment,
}: {
    formData: Record<string, any>;
    onChange: (data: Record<string, any>) => void;
    userName: string;
    userDepartment: string;
}) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}. ${String(today.getMonth() + 1).padStart(2, "0")}. ${String(today.getDate()).padStart(2, "0")}`;

    const schedules: any[] = formData.schedules || [];
    const expenses: Record<string, string> = formData.expenses || {};

    // 다음 우편번호 API 스크립트 로드
    useEffect(() => {
        if (document.getElementById("daum-postcode-script")) return;
        const script = document.createElement("script");
        script.id = "daum-postcode-script";
        script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
        script.async = true;
        document.head.appendChild(script);
    }, []);

    const openPostcode = () => {
        const daum = (window as any).daum;
        if (!daum?.Postcode) {
            alert("주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }
        new daum.Postcode({
            oncomplete: (data: any) => {
                const address = data.roadAddress || data.jibunAddress;
                onChange({ ...formData, visitPlace: address });
            },
        }).open();
    };

    // 기간(일수) 계산
    const tripDays = useMemo(() => {
        const sd = formData.tripStartDate;
        const ed = formData.tripEndDate;
        if (!sd) return 0;
        if (!ed || sd === ed) return 1;
        const s = new Date(sd);
        const e = new Date(ed);
        if (e < s) return 0;
        return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }, [formData.tripStartDate, formData.tripEndDate]);

    // 경비 합계
    const expenseTotal = useMemo(() => {
        return PLAN_EXPENSE_CATEGORIES.reduce(
            (sum, c) => sum + (Number(expenses[c.key]) || 0),
            0,
        );
    }, [expenses]);

    // ── 세부 일정 행 조작 ──
    const updateSchedule = (i: number, field: string, value: string) => {
        const next = schedules.map((s: any, idx: number) => (idx === i ? { ...s, [field]: value } : s));
        onChange({ ...formData, schedules: next });
    };
    const addScheduleRow = () => {
        if (schedules.length >= 8) return;
        onChange({ ...formData, schedules: [...schedules, { date: "", time: "", place: "", content: "" }] });
    };
    const removeScheduleRow = (i: number) => {
        if (schedules.length <= 1) return;
        onChange({ ...formData, schedules: schedules.filter((_: any, idx: number) => idx !== i) });
    };

    // ── 경비 업데이트 ──
    const updateExpense = (key: string, value: string) => {
        onChange({ ...formData, expenses: { ...expenses, [key]: value } });
    };

    const TH = "border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400";
    const TD = "border border-slate-300 dark:border-slate-600 px-1 py-0.5";
    const DARK_TH = "bg-slate-800 dark:bg-slate-900 text-white text-xs font-medium px-2 py-2.5 border border-slate-700";
    const SL = "text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 pl-3 border-l-[3px] border-slate-800 dark:border-slate-400";

    return (
        <div className="rounded-xl border overflow-hidden shadow-sm">
            {/* ── 문서 헤더 ── */}
            <div className="bg-slate-800 text-white px-6 sm:px-8 py-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-[0.15em]">외근/출장 계획서</h2>
                <div className="text-right text-sm text-slate-400 leading-relaxed">
                    작 성 일 : <span className="text-white font-medium">{dateStr}</span>
                </div>
            </div>

            <div className="bg-background">
                {/* ── 작성자 정보 ── */}
                <div className="px-6 sm:px-8 pt-6">
                    <div className={SL}>작성자 정보</div>
                    <table className="w-full border-collapse text-sm mb-6">
                        <tbody>
                            <tr>
                                <th className={`${TH} w-[100px]`}>성 명</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5 font-medium">{userName}</td>
                                <th className={`${TH} w-[100px]`}>부 서</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">{userDepartment}</td>
                            </tr>
                            <tr>
                                <th className={TH}>직 급</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">
                                    <input className={DOC_INPUT} placeholder="직급" value={formData.position || ""} onChange={(e) => onChange({ ...formData, position: e.target.value })} />
                                </td>
                                <th className={TH}>연락처</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">
                                    <input className={DOC_INPUT} placeholder="010-0000-0000" value={formData.contact || ""} onChange={(e) => onChange({ ...formData, contact: e.target.value })} />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 기본 정보 (구분 / 기간 / 방문처) ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className={SL}>기본 정보</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 구분 */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex gap-3 sm:col-span-2">
                            <div className="w-9 h-9 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">T</div>
                            <div className="flex-1 space-y-2">
                                <div className="text-xs text-slate-400 font-medium">구 분</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {PLAN_TRIP_TYPES.map((t) => {
                                        const active = (formData.tripType || "외근") === t;
                                        return (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => onChange({ ...formData, tripType: t })}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                                                    active
                                                        ? "border-primary bg-primary/10 text-primary"
                                                        : "border-slate-200 dark:border-slate-700 bg-background text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                }`}
                                            >
                                                {t}
                                            </button>
                                        );
                                    })}
                                    {formData.tripType === "기타" && (
                                        <input
                                            className={`${DOC_INPUT} text-xs w-40`}
                                            placeholder="기타 내용"
                                            value={formData.tripTypeEtc || ""}
                                            onChange={(e) => onChange({ ...formData, tripTypeEtc: e.target.value })}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 기간 */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">D</div>
                            <div className="flex-1 space-y-1.5">
                                <div className="text-xs text-slate-400 font-medium">기 간</div>
                                <div className="flex items-center gap-1.5">
                                    <input type="date" className={`${DOC_INPUT} text-sm font-medium`} value={formData.tripStartDate || ""} onChange={(e) => onChange({ ...formData, tripStartDate: e.target.value })} />
                                    <span className="text-xs text-slate-400">~</span>
                                    <input type="date" className={`${DOC_INPUT} text-sm font-medium`} value={formData.tripEndDate || ""} onChange={(e) => onChange({ ...formData, tripEndDate: e.target.value })} />
                                </div>
                                {tripDays > 0 && (
                                    <div className="text-xs text-blue-500 font-medium">총 {tripDays}일간</div>
                                )}
                            </div>
                        </div>

                        {/* 방문처 */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">V</div>
                            <div className="flex-1 space-y-1.5">
                                <div className="text-xs text-slate-400 font-medium">방문처</div>
                                <input className={`${DOC_INPUT} text-sm font-medium`} placeholder="기관 / 회사명" value={formData.visitCompany || ""} onChange={(e) => onChange({ ...formData, visitCompany: e.target.value })} />
                                <div className="flex items-center gap-1.5">
                                    <input
                                        className={`${DOC_INPUT} text-xs flex-1 cursor-pointer`}
                                        placeholder="클릭하여 주소 검색"
                                        value={formData.visitPlace || ""}
                                        readOnly
                                        onClick={openPostcode}
                                    />
                                    <button
                                        type="button"
                                        onClick={openPostcode}
                                        className="shrink-0 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                                    >
                                        <Search className="h-3.5 w-3.5 inline -mt-0.5 mr-1" />
                                        주소 검색
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── 방문 목적 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className={SL}>방문 목적</div>
                    <table className="w-full border-collapse text-sm">
                        <tbody>
                            <tr>
                                <th className={`${TH} w-[100px] align-top`}>목 적</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3">
                                    <textarea
                                        className="w-full border-0 bg-transparent px-1 py-1 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none min-h-[80px]"
                                        placeholder="외근/출장 목적을 구체적으로 작성하세요"
                                        value={formData.purpose || ""}
                                        onChange={(e) => onChange({ ...formData, purpose: e.target.value })}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 세부 일정 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className="flex items-center justify-between mb-1">
                        <div className={SL.replace("mb-3", "mb-0")}>세부 일정</div>
                        {schedules.length < 8 && (
                            <button type="button" onClick={addScheduleRow} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <Plus className="h-3 w-3" /> 행 추가
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">일자별 세부 일정을 작성해주세요.</p>
                    <div className="overflow-x-auto -mx-6 px-6 sm:-mx-8 sm:px-8">
                        <table className="w-full border-collapse text-sm min-w-[640px]">
                            <thead>
                                <tr>
                                    <th className={`${DARK_TH} w-[36px]`}>No.</th>
                                    <th className={`${DARK_TH} w-[130px]`}>일자</th>
                                    <th className={`${DARK_TH} w-[120px]`}>시간</th>
                                    <th className={`${DARK_TH} w-[160px]`}>방문처/장소</th>
                                    <th className={DARK_TH}>세부 업무 내용</th>
                                    <th className={`${DARK_TH} w-[28px]`}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedules.map((s: any, i: number) => (
                                    <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-800/30" : ""}>
                                        <td className={`${TD} text-center text-xs font-semibold text-slate-500 px-2`}>{i + 1}</td>
                                        <td className={TD}>
                                            <input type="date" className={`${DOC_INPUT} text-xs`} value={s.date || ""} onChange={(e) => updateSchedule(i, "date", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs text-center`} placeholder="09:00 ~ 10:00" value={s.time || ""} onChange={(e) => updateSchedule(i, "time", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="방문처 / 장소" value={s.place || ""} onChange={(e) => updateSchedule(i, "place", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="세부 업무 내용" value={s.content || ""} onChange={(e) => updateSchedule(i, "content", e.target.value)} />
                                        </td>
                                        <td className={`${TD} text-center`}>
                                            {schedules.length > 1 && (
                                                <button type="button" onClick={() => removeScheduleRow(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── 경비 내역 (예상) ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className={SL}>경비 내역 (예상)</div>
                    <div className="overflow-x-auto -mx-6 px-6 sm:-mx-8 sm:px-8">
                        <table className="w-full border-collapse text-sm min-w-[540px]">
                            <thead>
                                <tr>
                                    <th className={`${TH} w-[120px] text-xs`}>항목</th>
                                    <th className={`${TH} w-[140px] text-xs`} style={{ textAlign: "right" }}>금액</th>
                                    <th className={`${TH} w-[120px] text-xs`}>결제 수단</th>
                                    <th className={`${TH} text-xs`}>비고</th>
                                </tr>
                            </thead>
                            <tbody>
                                {PLAN_EXPENSE_CATEGORIES.map((c, i) => {
                                    const amount = expenses[c.key] || "";
                                    const payKey = `${c.key}PayMethod`;
                                    const noteKey = `${c.key}Note`;
                                    return (
                                        <tr key={c.key} className={i % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-800/30" : ""}>
                                            <th className={`${TH} text-xs text-center`}>{c.label}</th>
                                            <td className={TD}>
                                                <input className={`${DOC_INPUT} text-xs text-right font-semibold`} type="number" placeholder="0" value={amount} onChange={(e) => updateExpense(c.key, e.target.value)} />
                                            </td>
                                            <td className={TD}>
                                                <select className={`${DOC_SELECT} text-xs`} value={formData[payKey] || "법인카드"} onChange={(e) => onChange({ ...formData, [payKey]: e.target.value })}>
                                                    <option value="법인카드">법인카드</option>
                                                    <option value="개인카드">개인카드</option>
                                                    <option value="현금">현금</option>
                                                </select>
                                            </td>
                                            <td className={TD}>
                                                <input className={`${DOC_INPUT} text-xs`} placeholder="비고" value={formData[noteKey] || ""} onChange={(e) => onChange({ ...formData, [noteKey]: e.target.value })} />
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* 합계 */}
                                <tr className="border-t-2 border-slate-400 dark:border-slate-500">
                                    <td className="border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-right px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400">
                                        합 계
                                    </td>
                                    <td className="border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-right px-2 py-2.5 text-sm font-bold tabular-nums">
                                        {expenseTotal.toLocaleString()}
                                    </td>
                                    <td colSpan={2} className="border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── 특이사항 / 비고 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className={SL}>특이사항 / 비고</div>
                    <table className="w-full border-collapse text-sm">
                        <tbody>
                            <tr>
                                <th className={`${TH} w-[100px] align-top`}>비 고</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3">
                                    <textarea
                                        className="w-full border-0 bg-transparent px-1 py-1 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none min-h-[80px]"
                                        placeholder="특이사항 또는 참고사항을 작성하세요 (선택)"
                                        value={formData.remarks || ""}
                                        onChange={(e) => onChange({ ...formData, remarks: e.target.value })}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 하단 서명 미리보기 ── */}
                <div className="text-center px-6 sm:px-8 pb-8 text-sm text-slate-500 dark:text-slate-400 leading-loose">
                    <p>상기 내용과 같이 외근/출장 계획을 보고하오니 승인하여 주시기 바랍니다.</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300 mt-2">
                        {dateStr.replace(/\. /g, "년 ").replace(/\.$/, "") + "일"}
                    </p>
                    <p className="mt-1">
                        <span className="text-slate-400">{userDepartment}</span>
                        &nbsp;&nbsp;
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                            {userName.split("").join(" ")}
                        </span>
                        <span className="text-slate-400 ml-2">(인)</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── 납품/검수확인서 (INSPECTION) 문서형 폼 ──────────────────────────────────

export const DOC_INPUT = "w-full border-0 border-b border-dashed border-slate-300 dark:border-slate-600 bg-transparent px-1 py-1 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-primary focus:outline-none transition-colors";
export const DOC_INPUT_LARGE = "w-full border-0 border-b-2 border-dashed border-slate-400 dark:border-slate-500 bg-transparent px-2 py-2.5 text-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-primary focus:outline-none transition-colors";
const DOC_SELECT = `${DOC_INPUT} cursor-pointer [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-800 dark:[&>option]:text-slate-100`;

function InspectionFormFields({
    formData,
    onChange,
    userName,
    userDepartment,
}: {
    formData: Record<string, any>;
    onChange: (data: Record<string, any>) => void;
    userName: string;
    userDepartment: string;
}) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}. ${String(today.getMonth() + 1).padStart(2, "0")}. ${String(today.getDate()).padStart(2, "0")}`;

    const items: any[] = formData.items || [];

    const TH = "border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400";
    const TD = "border border-slate-300 dark:border-slate-600 px-1 py-0.5";
    const DARK_TH = "bg-slate-800 dark:bg-slate-900 text-white text-xs font-medium px-2 py-2.5 border border-slate-700";
    const SL = "text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 pl-3 border-l-[3px] border-slate-800 dark:border-slate-400";

    const updateItem = (i: number, field: string, value: string) => {
        const next = items.map((it: any, idx: number) => (idx === i ? { ...it, [field]: value } : it));
        onChange({ ...formData, items: next });
    };
    const addItemRow = () => {
        if (items.length >= 10) return;
        onChange({ ...formData, items: [...items, { name: "", spec: "", unit: "", qty: "", unitPrice: "", note: "" }] });
    };
    const removeItemRow = (i: number) => {
        if (items.length <= 1) return;
        onChange({ ...formData, items: items.filter((_: any, idx: number) => idx !== i) });
    };

    // 합계 금액
    const totalAmount = useMemo(() => {
        return items.reduce((sum: number, it: any) => sum + ((Number(it.qty) || 0) * (Number(it.unitPrice) || 0)), 0);
    }, [items]);

    return (
        <div className="rounded-xl border overflow-hidden shadow-sm">
            {/* ── 문서 헤더 ── */}
            <div className="bg-slate-800 text-white px-6 sm:px-8 py-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-[0.15em]">납품/검수확인서</h2>
                <div className="text-right text-sm text-slate-400 leading-relaxed">
                    기 안 일 : <span className="text-white font-medium">{dateStr}</span>
                </div>
            </div>

            <div className="bg-background">
                {/* ── 과제 정보 ── */}
                <div className="px-6 sm:px-8 pt-6">
                    <div className={SL}>과제 정보</div>
                    <table className="w-full border-collapse text-sm mb-6">
                        <tbody>
                            <tr>
                                <th className={`${TH} w-[100px]`}>주관기관</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5 font-medium">
                                    한미르 (주)
                                </td>
                                <th className={`${TH} w-[100px]`}>사 업 명</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">
                                    <input className={DOC_INPUT} placeholder="사업명" value={formData.projectName || ""} onChange={(e) => onChange({ ...formData, projectName: e.target.value })} />
                                </td>
                            </tr>
                            <tr>
                                <th className={TH}>사업기간</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">
                                    <input className={DOC_INPUT} placeholder="예: 2026.01 ~ 2026.12" value={formData.projectPeriod || ""} onChange={(e) => onChange({ ...formData, projectPeriod: e.target.value })} />
                                </td>
                                <th className={TH}>과제번호</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">
                                    <input className={DOC_INPUT} placeholder="과제번호" value={formData.projectCode || ""} onChange={(e) => onChange({ ...formData, projectCode: e.target.value })} />
                                </td>
                            </tr>
                            <tr>
                                <th className={TH}>과 제 명</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5" colSpan={3}>
                                    <input className={`${DOC_INPUT} font-medium`} placeholder="과제명을 입력하세요 *" value={formData.docTitle || ""} onChange={(e) => onChange({ ...formData, docTitle: e.target.value })} />
                                </td>
                            </tr>
                            <tr>
                                <th className={TH}>납품업체</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">
                                    <input className={DOC_INPUT} placeholder="납품업체명" value={formData.vendor || ""} onChange={(e) => onChange({ ...formData, vendor: e.target.value })} />
                                </td>
                                <th className={TH}>제 목</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">
                                    <input className={DOC_INPUT} placeholder="검수 제목" value={formData.inspectionTitle || ""} onChange={(e) => onChange({ ...formData, inspectionTitle: e.target.value })} />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 검수 품목 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className={SL.replace("mb-3", "mb-0")}>검수 품목</div>
                        {items.length < 10 && (
                            <button type="button" onClick={addItemRow} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <Plus className="h-3 w-3" /> 행 추가
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto -mx-6 px-6 sm:-mx-8 sm:px-8">
                        <table className="w-full border-collapse text-sm min-w-[700px]">
                            <thead>
                                <tr>
                                    <th className={`${DARK_TH} w-[40px]`}>No.</th>
                                    <th className={`${DARK_TH} w-[160px]`}>품 명</th>
                                    <th className={`${DARK_TH} w-[100px]`}>규격</th>
                                    <th className={`${DARK_TH} w-[70px]`}>단위</th>
                                    <th className={`${DARK_TH} w-[70px]`}>수량</th>
                                    <th className={`${DARK_TH} w-[100px]`}>단 가</th>
                                    <th className={`${DARK_TH} w-[100px]`}>금 액</th>
                                    <th className={DARK_TH}>비고</th>
                                    <th className={`${DARK_TH} w-[28px]`}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((it: any, i: number) => {
                                    const amt = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
                                    return (
                                        <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-800/30" : ""}>
                                            <td className={`${TD} text-center text-xs font-semibold text-slate-500 px-2`}>{i + 1}</td>
                                            <td className={TD}>
                                                <input className={`${DOC_INPUT} text-xs`} placeholder="품명" value={it.name || ""} onChange={(e) => updateItem(i, "name", e.target.value)} />
                                            </td>
                                            <td className={TD}>
                                                <input className={`${DOC_INPUT} text-xs`} placeholder="규격" value={it.spec || ""} onChange={(e) => updateItem(i, "spec", e.target.value)} />
                                            </td>
                                            <td className={TD}>
                                                <input className={`${DOC_INPUT} text-xs text-center`} placeholder="EA" value={it.unit || ""} onChange={(e) => updateItem(i, "unit", e.target.value)} />
                                            </td>
                                            <td className={TD}>
                                                <input className={`${DOC_INPUT} text-xs text-right`} type="number" placeholder="0" value={it.qty || ""} onChange={(e) => updateItem(i, "qty", e.target.value)} />
                                            </td>
                                            <td className={TD}>
                                                <input className={`${DOC_INPUT} text-xs text-right`} type="number" placeholder="0" value={it.unitPrice || ""} onChange={(e) => updateItem(i, "unitPrice", e.target.value)} />
                                            </td>
                                            <td className={`${TD} text-right text-xs font-semibold tabular-nums px-2`}>
                                                {amt > 0 ? amt.toLocaleString() : ""}
                                            </td>
                                            <td className={TD}>
                                                <input className={`${DOC_INPUT} text-xs`} placeholder="비고" value={it.note || ""} onChange={(e) => updateItem(i, "note", e.target.value)} />
                                            </td>
                                            <td className={`${TD} text-center`}>
                                                {items.length > 1 && (
                                                    <button type="button" onClick={() => removeItemRow(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* 합계 행 */}
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <td colSpan={6} className="border border-slate-300 dark:border-slate-600 text-right px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400">
                                        합 계
                                    </td>
                                    <td className="border border-slate-300 dark:border-slate-600 text-right px-2 py-2.5 text-sm font-bold tabular-nums">
                                        {totalAmount > 0 ? totalAmount.toLocaleString() : ""}
                                    </td>
                                    <td colSpan={2} className="border border-slate-300 dark:border-slate-600"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── 검수 정보 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className={SL}>검수 정보</div>
                    <table className="w-full border-collapse text-sm max-w-md mx-auto">
                        <tbody>
                            <tr>
                                <th className={`${TH} w-[100px] bg-slate-200 dark:bg-slate-700`}>검수일</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">
                                    <input type="date" className={DOC_INPUT} value={formData.inspectionDate || ""} onChange={(e) => onChange({ ...formData, inspectionDate: e.target.value })} />
                                </td>
                            </tr>
                            <tr>
                                <th className={`${TH} w-[100px] bg-slate-200 dark:bg-slate-700`}>검수자</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">
                                    <input className={DOC_INPUT} placeholder="검수자 성명" value={formData.inspector || ""} onChange={(e) => onChange({ ...formData, inspector: e.target.value })} />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 하단 서명 미리보기 ── */}
                <div className="text-center px-6 sm:px-8 pb-8 text-sm text-slate-500 dark:text-slate-400 leading-loose">
                    <p>상기와 같이 입고물품에 대하여 검사/검수를 완료함.</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300 mt-2">
                        {dateStr.replace(/\. /g, "년 ").replace(/\.$/, "") + "일"}
                    </p>
                    <p className="mt-1">
                        <span className="text-slate-400">{userDepartment}</span>
                        &nbsp;&nbsp;
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                            {userName.split("").join(" ")}
                        </span>
                        <span className="text-slate-400 ml-2">(인)</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── 세금계산서 발행 요청서 (TAX_INVOICE) 문서형 폼 ─────────────────────────

export function TaxInvoiceFormFields({
    formData,
    onChange,
    userName,
    userDepartment,
    size = "compact",
}: {
    formData: Record<string, any>;
    onChange: (data: Record<string, any>) => void;
    userName: string;
    userDepartment: string;
    size?: "compact" | "large";
}) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}. ${String(today.getMonth() + 1).padStart(2, "0")}. ${String(today.getDate()).padStart(2, "0")}`;

    const items: any[] = formData.taxItems || [];

    // 큰 보기 모드: 셀 폰트/패딩 확대 (어르신 가독성). 로직/state는 동일
    const isLarge = size === "large";
    const TH = `border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 ${isLarge ? "px-5 py-4 text-base" : "px-4 py-2.5"} text-center font-medium text-slate-600 dark:text-slate-400`;
    const TD = `border border-slate-300 dark:border-slate-600 ${isLarge ? "px-2 py-2" : "px-1 py-0.5"}`;
    const DARK_TH = `bg-slate-800 dark:bg-slate-900 text-white font-medium border border-slate-700 ${isLarge ? "text-sm px-3 py-4" : "text-xs px-2 py-2.5"}`;
    const SL = `${isLarge ? "text-base" : "text-sm"} font-semibold text-slate-700 dark:text-slate-300 mb-3 pl-3 border-l-[3px] border-slate-800 dark:border-slate-400`;
    const cellInput = isLarge ? DOC_INPUT_LARGE : DOC_INPUT;
    const cellText = isLarge ? "text-base" : "text-xs";
    const cellRowSeq = isLarge ? "text-sm" : "text-xs";
    const totalText = isLarge ? "text-base" : "text-sm";
    const iconSize = isLarge ? "h-4 w-4" : "h-3 w-3";
    const minTableW = isLarge ? "min-w-[1100px]" : "min-w-[900px]";

    const updateItem = (i: number, field: string, value: string) => {
        const next = items.map((it: any, idx: number) => (idx === i ? { ...it, [field]: value } : it));
        onChange({ ...formData, taxItems: next });
    };
    const addItemRow = () => {
        if (items.length >= 12) return;
        onChange({ ...formData, taxItems: [...items, { company: "", date: "", product: "", qty: "", unitPrice: "", note: "" }] });
    };
    const removeItemRow = (i: number) => {
        if (items.length <= 1) return;
        onChange({ ...formData, taxItems: items.filter((_: any, idx: number) => idx !== i) });
    };

    // 자동 계산 (빈 값이면 공백 반환)
    const calc = useMemo(() => {
        let totalSupply = 0;
        let totalVat = 0;
        let totalSum = 0;
        const rows = items.map((it: any) => {
            const qty = Number(it.qty) || 0;
            const up = Number(it.unitPrice) || 0;
            if (!qty || !up) return { supply: 0, vat: 0, sum: 0, hasValue: false };
            const supply = qty * up;
            const vat = Math.round(supply * 0.1);
            const sum = supply + vat;
            totalSupply += supply;
            totalVat += vat;
            totalSum += sum;
            return { supply, vat, sum, hasValue: true };
        });
        return { rows, totalSupply, totalVat, totalSum, hasTotal: totalSum > 0 };
    }, [items]);

    const fmt = (n: number, hasValue: boolean) => hasValue && n > 0 ? n.toLocaleString() : "";

    return (
        <div className="rounded-xl border overflow-hidden shadow-sm">
            {/* ── 문서 헤더 ── */}
            <div className={`bg-slate-800 text-white px-6 sm:px-8 ${isLarge ? "py-8" : "py-6"} flex justify-between items-center`}>
                <h2 className={`${isLarge ? "text-3xl" : "text-2xl"} font-bold tracking-[0.15em]`}>세금계산서 발행 요청서</h2>
                <div className={`text-right ${isLarge ? "text-base" : "text-sm"} text-slate-400 leading-relaxed`}>
                    기 안 일 : <span className="text-white font-medium">{dateStr}</span>
                </div>
            </div>

            <div className="bg-background">
                {/* ── 발행 일자 ── */}
                <div className="px-6 sm:px-8 pt-6 mb-6">
                    <table className={`w-full border-collapse ${isLarge ? "text-base max-w-md" : "text-sm max-w-sm"}`}>
                        <tbody>
                            <tr>
                                <th className={`${TH} ${isLarge ? "w-[140px]" : "w-[100px]"}`}>발행 일자</th>
                                <td className={`border border-slate-300 dark:border-slate-600 ${isLarge ? "px-5 py-3.5" : "px-4 py-2.5"}`}>
                                    <input type="date" className={cellInput} value={formData.issueDate || ""} onChange={(e) => onChange({ ...formData, issueDate: e.target.value })} />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 품목 테이블 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className={SL.replace("mb-3", "mb-0")}>발행 내역</div>
                        {items.length < 12 && (
                            <button type="button" onClick={addItemRow} className={`flex items-center gap-1.5 ${isLarge ? "text-base font-medium px-4 py-2 rounded-md bg-primary/10 hover:bg-primary/20" : "text-xs hover:underline"} text-primary`}>
                                <Plus className={iconSize} /> 행 추가
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto -mx-6 px-6 sm:-mx-8 sm:px-8">
                        <table className={`w-full border-collapse ${isLarge ? "text-base" : "text-sm"} ${minTableW}`}>
                            <thead>
                                <tr>
                                    <th className={`${DARK_TH} ${isLarge ? "w-[50px]" : "w-[40px]"}`}>No.</th>
                                    <th className={`${DARK_TH} ${isLarge ? "w-[160px]" : "w-[120px]"}`}>업체명</th>
                                    <th className={`${DARK_TH} ${isLarge ? "w-[110px]" : "w-[90px]"}`}>날짜</th>
                                    <th className={DARK_TH}>제품명/모델명/단위</th>
                                    <th className={`${DARK_TH} ${isLarge ? "w-[80px]" : "w-[60px]"}`}>수량</th>
                                    <th className={`${DARK_TH} ${isLarge ? "w-[110px]" : "w-[90px]"}`}>단가(원)</th>
                                    <th className={`${DARK_TH} ${isLarge ? "w-[120px]" : "w-[100px]"}`}>공급가액</th>
                                    <th className={`${DARK_TH} ${isLarge ? "w-[110px]" : "w-[90px]"}`}>부가세</th>
                                    <th className={`${DARK_TH} ${isLarge ? "w-[120px]" : "w-[100px]"}`}>합계</th>
                                    <th className={`${DARK_TH} ${isLarge ? "w-[100px]" : "w-[80px]"}`}>비고</th>
                                    <th className={`${DARK_TH} ${isLarge ? "w-[40px]" : "w-[28px]"}`}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((it: any, i: number) => (
                                    <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-800/30" : ""}>
                                        <td className={`${TD} text-center ${cellRowSeq} font-semibold text-slate-500 px-2`}>{i + 1}</td>
                                        <td className={TD}>
                                            <input className={`${cellInput} ${cellText}`} placeholder="업체명" value={it.company || ""} onChange={(e) => updateItem(i, "company", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${cellInput} ${cellText} text-center`} placeholder="MM/DD" value={it.date || ""} onChange={(e) => updateItem(i, "date", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${cellInput} ${cellText}`} placeholder="제품명/모델명/단위" value={it.product || ""} onChange={(e) => updateItem(i, "product", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${cellInput} ${cellText} text-right`} type="number" placeholder="" value={it.qty || ""} onChange={(e) => updateItem(i, "qty", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${cellInput} ${cellText} text-right`} type="number" placeholder="" value={it.unitPrice || ""} onChange={(e) => updateItem(i, "unitPrice", e.target.value)} />
                                        </td>
                                        <td className={`${TD} text-right ${cellText} font-medium text-slate-700 dark:text-slate-300 px-2 tabular-nums`}>
                                            {fmt(calc.rows[i]?.supply, calc.rows[i]?.hasValue)}
                                        </td>
                                        <td className={`${TD} text-right ${cellText} text-slate-500 dark:text-slate-400 px-2 tabular-nums`}>
                                            {fmt(calc.rows[i]?.vat, calc.rows[i]?.hasValue)}
                                        </td>
                                        <td className={`${TD} text-right ${cellText} font-semibold tabular-nums px-2`}>
                                            {fmt(calc.rows[i]?.sum, calc.rows[i]?.hasValue)}
                                        </td>
                                        <td className={TD}>
                                            <input className={`${cellInput} ${cellText}`} placeholder="" value={it.note || ""} onChange={(e) => updateItem(i, "note", e.target.value)} />
                                        </td>
                                        <td className={`${TD} text-center`}>
                                            {items.length > 1 && (
                                                <button type="button" onClick={() => removeItemRow(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 className={iconSize} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {/* 합계 행 */}
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <td colSpan={6} className={`border border-slate-300 dark:border-slate-600 text-right ${isLarge ? "px-5 py-4" : "px-4 py-2.5"} ${totalText} font-medium text-slate-600 dark:text-slate-400`}>
                                        합 계
                                    </td>
                                    <td className={`border border-slate-300 dark:border-slate-600 text-right ${isLarge ? "px-3 py-4" : "px-2 py-2.5"} ${totalText} font-bold tabular-nums`}>
                                        {calc.hasTotal ? calc.totalSupply.toLocaleString() : ""}
                                    </td>
                                    <td className={`border border-slate-300 dark:border-slate-600 text-right ${isLarge ? "px-3 py-4" : "px-2 py-2.5"} ${totalText} font-bold tabular-nums`}>
                                        {calc.hasTotal ? calc.totalVat.toLocaleString() : ""}
                                    </td>
                                    <td className={`border border-slate-300 dark:border-slate-600 text-right ${isLarge ? "px-3 py-4" : "px-2 py-2.5"} ${totalText} font-bold tabular-nums`}>
                                        {calc.hasTotal ? calc.totalSum.toLocaleString() : ""}
                                    </td>
                                    <td colSpan={2} className="border border-slate-300 dark:border-slate-600"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── 담당자 / 연락처 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className={SL}>담당자 정보</div>
                    <table className={`w-full border-collapse ${isLarge ? "text-base max-w-lg" : "text-sm max-w-md"}`}>
                        <tbody>
                            <tr>
                                <th className={`${TH} ${isLarge ? "w-[140px]" : "w-[100px]"}`}>담당자</th>
                                <td className={`border border-slate-300 dark:border-slate-600 ${isLarge ? "px-5 py-3.5" : "px-4 py-2.5"}`}>
                                    <input className={cellInput} placeholder="담당자 성명" value={formData.manager || ""} onChange={(e) => onChange({ ...formData, manager: e.target.value })} />
                                </td>
                            </tr>
                            <tr>
                                <th className={`${TH} ${isLarge ? "w-[140px]" : "w-[100px]"}`}>연락처</th>
                                <td className={`border border-slate-300 dark:border-slate-600 ${isLarge ? "px-5 py-3.5" : "px-4 py-2.5"}`}>
                                    <input className={cellInput} placeholder="연락처" value={formData.managerContact || ""} onChange={(e) => onChange({ ...formData, managerContact: e.target.value })} />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 하단 서명 미리보기 ── */}
                <div className={`text-center px-6 sm:px-8 pb-8 ${isLarge ? "text-base" : "text-sm"} text-slate-500 dark:text-slate-400 leading-loose`}>
                    <p>위와 같이 세금계산서 발행을 요청하오니 처리하여 주시기 바랍니다.</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300 mt-2">
                        {dateStr.replace(/\. /g, "년 ").replace(/\.$/, "") + "일"}
                    </p>
                    <p className="mt-1">
                        <span className="text-slate-400">{userDepartment}</span>
                        &nbsp;&nbsp;
                        <span className={`font-semibold text-slate-800 dark:text-slate-200 ${isLarge ? "text-lg" : "text-base"}`}>
                            {userName.split("").join(" ")}
                        </span>
                        <span className="text-slate-400 ml-2">(인)</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── 세금계산서 발행 요청서 — 크게 보기 다이얼로그 ──────────────────────────
// 부모의 formData/onChange를 그대로 양방향 바인딩 (별도 state 분리 X)

function TaxInvoiceLargeDialog({
    open,
    onOpenChange,
    formData,
    onChange,
    userName,
    userDepartment,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    formData: Record<string, any>;
    onChange: (data: Record<string, any>) => void;
    userName: string;
    userDepartment: string;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                // shadcn DialogContent 기본의 sm:max-w-lg(512px)를 덮으려면 sm prefix가 같은 카테고리여야 함.
                // inline maxWidth로 한 번 더 보장 (tailwind-merge 우회 안전망)
                className="w-[95vw] sm:max-w-[1400px] max-h-[92vh] overflow-y-auto p-0 sm:p-0 gap-0"
                style={{ width: "min(95vw, 1400px)", maxWidth: "min(95vw, 1400px)" }}
            >
                <DialogHeader className="sticky top-0 z-10 bg-background border-b px-6 py-4">
                    <DialogTitle className="text-lg flex items-center gap-2">
                        <Maximize2 className="h-5 w-5 text-primary" />
                        세금계산서 발행 요청서 — 크게 보기
                    </DialogTitle>
                </DialogHeader>

                <div className="px-2 py-4 sm:px-4">
                    <TaxInvoiceFormFields
                        formData={formData}
                        onChange={onChange}
                        userName={userName}
                        userDepartment={userDepartment}
                        size="large"
                    />
                </div>

                <div className="sticky bottom-0 z-10 bg-background border-t px-6 py-4 flex justify-end">
                    <Button
                        type="button"
                        size="lg"
                        onClick={() => onOpenChange(false)}
                        className="text-base px-8 h-12"
                    >
                        닫기
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── 자금 지출계획서 (EXPENDITURE_PLAN) 문서형 폼 ───────────────────────────

function ExpenditurePlanFormFields({
    formData,
    onChange,
    userName,
    userDepartment,
}: {
    formData: Record<string, any>;
    onChange: (data: Record<string, any>) => void;
    userName: string;
    userDepartment: string;
}) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}. ${String(today.getMonth() + 1).padStart(2, "0")}. ${String(today.getDate()).padStart(2, "0")}`;

    const items: any[] = formData.planItems || [];

    const TH = "border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400";
    const TD = "border border-slate-300 dark:border-slate-600 px-1 py-0.5";
    const DARK_TH = "bg-slate-800 dark:bg-slate-900 text-white text-xs font-medium px-2 py-2.5 border border-slate-700";
    const SL = "text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 pl-3 border-l-[3px] border-slate-800 dark:border-slate-400";

    const updateItem = (i: number, field: string, value: string) => {
        const next = items.map((it: any, idx: number) => (idx === i ? { ...it, [field]: value } : it));
        onChange({ ...formData, planItems: next });
    };
    const addItemRow = () => {
        if (items.length >= 12) return;
        onChange({ ...formData, planItems: [...items, { date: "", category: "", detail: "", amount: "", note: "" }] });
    };
    const removeItemRow = (i: number) => {
        if (items.length <= 1) return;
        onChange({ ...formData, planItems: items.filter((_: any, idx: number) => idx !== i) });
    };

    // 누적 금액 계산
    const cumulative = useMemo(() => {
        let running = 0;
        return items.map((it: any) => {
            const amt = Number(it.amount) || 0;
            if (amt > 0) {
                running += amt;
                return { amount: amt, cumulative: running, hasValue: true };
            }
            return { amount: 0, cumulative: running, hasValue: false };
        });
    }, [items]);

    const totalAmount = cumulative.length > 0 ? cumulative[cumulative.length - 1].cumulative : 0;

    return (
        <div className="rounded-xl border overflow-hidden shadow-sm">
            {/* ── 문서 헤더 ── */}
            <div className="bg-slate-800 text-white px-6 sm:px-8 py-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-[0.15em]">자금 지출계획서</h2>
                <div className="text-right text-sm text-slate-400 leading-relaxed">
                    기 안 일 : <span className="text-white font-medium">{dateStr}</span>
                </div>
            </div>

            <div className="bg-background">
                {/* ── 작성자 정보 ── */}
                <div className="px-6 sm:px-8 pt-6 mb-6">
                    <table className="w-full border-collapse text-sm">
                        <tbody>
                            <tr>
                                <th className={`${TH} w-[90px] whitespace-nowrap bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200`}>작 성 일</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">
                                    <input type="date" className={DOC_INPUT} value={formData.planDate || ""} onChange={(e) => onChange({ ...formData, planDate: e.target.value })} />
                                </td>
                                <th className={`${TH} w-[90px] whitespace-nowrap bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200`}>부 서 명</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5 font-medium">{userDepartment}</td>
                            </tr>
                            <tr>
                                <th className={`${TH} w-[90px] whitespace-nowrap bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200`}>직 급</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">
                                    <input className={DOC_INPUT} placeholder="직급" value={formData.position || ""} onChange={(e) => onChange({ ...formData, position: e.target.value })} />
                                </td>
                                <th className={`${TH} w-[90px] whitespace-nowrap bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200`}>성 명</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5 font-medium">{userName}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 지출 내역 테이블 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className={SL.replace("mb-3", "mb-0")}>지출 내역</div>
                        {items.length < 12 && (
                            <button type="button" onClick={addItemRow} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <Plus className="h-3 w-3" /> 행 추가
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto -mx-6 px-6 sm:-mx-8 sm:px-8">
                        <table className="w-full border-collapse text-sm min-w-[750px]">
                            <thead>
                                <tr>
                                    <th className={`${DARK_TH} w-[40px]`}>No.</th>
                                    <th className={`${DARK_TH} w-[110px]`}>날 짜</th>
                                    <th className={`${DARK_TH} w-[120px]`}>지출항목</th>
                                    <th className={DARK_TH}>세부내역</th>
                                    <th className={`${DARK_TH} w-[110px]`}>지출금액</th>
                                    <th className={`${DARK_TH} w-[110px]`}>지출누적금액</th>
                                    <th className={`${DARK_TH} w-[90px]`}>비고</th>
                                    <th className={`${DARK_TH} w-[28px]`}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((it: any, i: number) => (
                                    <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-800/30" : ""}>
                                        <td className={`${TD} text-center text-xs font-semibold text-slate-500 px-2`}>{i + 1}</td>
                                        <td className={TD}>
                                            <input type="date" className={`${DOC_INPUT} text-xs`} value={it.date || ""} onChange={(e) => updateItem(i, "date", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="지출항목" value={it.category || ""} onChange={(e) => updateItem(i, "category", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="세부내역" value={it.detail || ""} onChange={(e) => updateItem(i, "detail", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs text-right font-semibold`} type="number" placeholder="" value={it.amount || ""} onChange={(e) => updateItem(i, "amount", e.target.value)} />
                                        </td>
                                        <td className={`${TD} text-right text-xs font-semibold tabular-nums px-2`}>
                                            {cumulative[i]?.hasValue ? cumulative[i].cumulative.toLocaleString() : (cumulative[i]?.cumulative > 0 ? cumulative[i].cumulative.toLocaleString() : "")}
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="" value={it.note || ""} onChange={(e) => updateItem(i, "note", e.target.value)} />
                                        </td>
                                        <td className={`${TD} text-center`}>
                                            {items.length > 1 && (
                                                <button type="button" onClick={() => removeItemRow(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {/* 합계 행 */}
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <td colSpan={4} className="border border-slate-300 dark:border-slate-600 text-right px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400">
                                        합 계
                                    </td>
                                    <td className="border border-slate-300 dark:border-slate-600 text-right px-2 py-2.5 text-sm font-bold tabular-nums">
                                        {totalAmount > 0 ? totalAmount.toLocaleString() : ""}
                                    </td>
                                    <td colSpan={3} className="border border-slate-300 dark:border-slate-600"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── 하단 서명 미리보기 ── */}
                <div className="text-center px-6 sm:px-8 pb-8 text-sm text-slate-500 dark:text-slate-400 leading-loose">
                    <p>위와 같이 자금 지출계획서를 제출하오니 승인하여 주시기 바랍니다.</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300 mt-2">
                        {dateStr.replace(/\. /g, "년 ").replace(/\.$/, "") + "일"}
                    </p>
                    <p className="mt-1">
                        <span className="text-slate-400">{userDepartment}</span>
                        &nbsp;&nbsp;
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                            {userName.split("").join(" ")}
                        </span>
                        <span className="text-slate-400 ml-2">(인)</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── 개인경비 사용 청구서 (PERSONAL_EXPENSE) 문서형 폼 ─────────────────────────

function PersonalExpenseFormFields({
    formData,
    onChange,
    userName,
    userDepartment,
}: {
    formData: Record<string, any>;
    onChange: (data: Record<string, any>) => void;
    userName: string;
    userDepartment: string;
}) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}. ${String(today.getMonth() + 1).padStart(2, "0")}. ${String(today.getDate()).padStart(2, "0")}`;

    const items: any[] = formData.expenseItems || [];

    const TH = "border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400";
    const TD = "border border-slate-300 dark:border-slate-600 px-1 py-0.5";
    const DARK_TH = "bg-slate-800 dark:bg-slate-900 text-white text-xs font-medium px-2 py-2.5 border border-slate-700";
    const SL = "text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 pl-3 border-l-[3px] border-slate-800 dark:border-slate-400";

    const updateItem = (i: number, field: string, value: string) => {
        const next = items.map((it: any, idx: number) => (idx === i ? { ...it, [field]: value } : it));
        onChange({ ...formData, expenseItems: next });
    };
    const addItemRow = () => {
        if (items.length >= 11) return;
        onChange({ ...formData, expenseItems: [...items, { content: "", amount: "", note: "" }] });
    };
    const removeItemRow = (i: number) => {
        if (items.length <= 1) return;
        onChange({ ...formData, expenseItems: items.filter((_: any, idx: number) => idx !== i) });
    };

    // 합계 계산
    const totalAmount = useMemo(() => {
        return items.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
    }, [items]);

    return (
        <div className="rounded-xl border overflow-hidden shadow-sm">
            {/* ── 문서 헤더 ── */}
            <div className="bg-slate-800 text-white px-6 sm:px-8 py-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-[0.15em]">개인경비 사용 청구서</h2>
                <div className="text-right text-sm text-slate-400 leading-relaxed">
                    기 안 일 : <span className="text-white font-medium">{dateStr}</span>
                </div>
            </div>

            <div className="bg-background">
                {/* ── 안내 문구 ── */}
                <div className="px-6 sm:px-8 pt-6 mb-4">
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-xs text-red-700 dark:text-red-400 space-y-1">
                        <p className="font-bold text-sm">* 다음 내용을 꼭 확인 후 작성부탁드립니다.</p>
                        <p>1. 전월 1일 ~ 말일 중 회사 업무로 인해 사용한 개인 비용 지출 건은 차월 15일까지 종합하여 청구서 작성</p>
                        <p>2. 청구하는 사용분에 대한 영수증 반드시 첨부 (No에 맞추어 파일명 수정: 예시 1.jpg)</p>
                        <p>3. 청구하는 사용분에 대한 정확한 내용 작성</p>
                    </div>
                </div>

                {/* ── 합계 / 계좌 정보 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <table className="w-full border-collapse text-sm">
                        <tbody>
                            <tr>
                                <th className={`${TH} w-[100px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200`}>합계</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-right font-bold tabular-nums">
                                    {totalAmount > 0 ? `${totalAmount.toLocaleString()}원` : ""}
                                </td>
                                <th className={`${TH} w-[130px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200`}>
                                    <div>계좌번호</div>
                                    <div className="text-xs">(은행명/예금주)</div>
                                </th>
                                <td className="border border-slate-300 dark:border-slate-600 px-2 py-2.5" colSpan={2}>
                                    <input className={DOC_INPUT} placeholder="예: 국민은행 000-000-00-000000 / 홍길동" value={formData.bankAccount || ""} onChange={(e) => onChange({ ...formData, bankAccount: e.target.value })} />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 내역 테이블 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className={SL.replace("mb-3", "mb-0")}>청구 내역</div>
                        {items.length < 11 && (
                            <button type="button" onClick={addItemRow} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <Plus className="h-3 w-3" /> 행 추가
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto -mx-6 px-6 sm:-mx-8 sm:px-8">
                        <table className="w-full border-collapse text-sm min-w-[600px]">
                            <thead>
                                <tr>
                                    <th className={`${DARK_TH} w-[50px]`}>No.</th>
                                    <th className={DARK_TH}>내용</th>
                                    <th className={`${DARK_TH} w-[130px]`}>금액</th>
                                    <th className={`${DARK_TH} w-[140px]`}>비고</th>
                                    <th className={`${DARK_TH} w-[28px]`}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((it: any, i: number) => (
                                    <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-800/30" : ""}>
                                        <td className={`${TD} text-center text-xs font-semibold text-slate-500 px-2`}>{i + 1}</td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="사용 내용" value={it.content || ""} onChange={(e) => updateItem(i, "content", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs text-right font-semibold`} type="number" placeholder="" value={it.amount || ""} onChange={(e) => updateItem(i, "amount", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="" value={it.note || ""} onChange={(e) => updateItem(i, "note", e.target.value)} />
                                        </td>
                                        <td className={`${TD} text-center`}>
                                            {items.length > 1 && (
                                                <button type="button" onClick={() => removeItemRow(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {/* 합계 행 */}
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <td colSpan={2} className="border border-slate-300 dark:border-slate-600 text-right px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400">
                                        합 계
                                    </td>
                                    <td className="border border-slate-300 dark:border-slate-600 text-right px-2 py-2.5 text-sm font-bold tabular-nums">
                                        {totalAmount > 0 ? totalAmount.toLocaleString() : ""}
                                    </td>
                                    <td colSpan={2} className="border border-slate-300 dark:border-slate-600"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── 특이사항 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className={SL}>특이사항</div>
                    <textarea
                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none transition-colors min-h-[80px]"
                        placeholder="특이사항을 입력하세요"
                        value={formData.specialNote || ""}
                        onChange={(e) => onChange({ ...formData, specialNote: e.target.value })}
                    />
                </div>

                {/* ── 하단 서명 미리보기 ── */}
                <div className="text-center px-6 sm:px-8 pb-8 text-sm text-slate-500 dark:text-slate-400 leading-loose">
                    <p>위와 같은 금액을 청구하오니, 결재하여 주시기 바랍니다.</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300 mt-2">
                        {dateStr.replace(/\. /g, "년 ").replace(/\.$/, "") + "일"}
                    </p>
                    <p className="mt-1">
                        <span className="text-slate-400">{userDepartment}</span>
                        &nbsp;&nbsp;
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                            {userName.split("").join(" ")}
                        </span>
                        <span className="text-slate-400 ml-2">(인)</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── 품의서 (GENERAL) 문서형 폼 ──────────────────────────────────────────────

function GeneralFormFields({
    formData,
    onChange,
    userName,
    userDepartment,
}: {
    formData: Record<string, any>;
    onChange: (data: Record<string, any>) => void;
    userName: string;
    userDepartment: string;
}) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}. ${String(today.getMonth() + 1).padStart(2, "0")}. ${String(today.getDate()).padStart(2, "0")}`;

    // 지급비용 → 예상비용 자동 동기화
    useEffect(() => {
        if (formData.paymentAmount && !formData.estimatedCost) {
            onChange({ ...formData, estimatedCost: formData.paymentAmount });
        }
    }, [formData.paymentAmount]);

    return (
        <div className="rounded-xl border overflow-hidden shadow-sm">
            {/* ── 문서 헤더 ── */}
            <div className="bg-slate-800 text-white px-8 py-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-[0.15em]">품 의 서</h2>
                <div className="text-right text-sm text-slate-400 leading-relaxed">
                    기 안 일 : <span className="text-white font-medium">{dateStr}</span>
                </div>
            </div>

            <div className="bg-background">
                {/* ── 작성자 정보 ── */}
                <div className="px-8 pt-6">
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 pl-3 border-l-[3px] border-slate-800 dark:border-slate-400">
                        작성자 정보
                    </div>
                    <table className="w-full border-collapse text-sm mb-6">
                        <tbody>
                            <tr>
                                <th className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400 w-[100px]">
                                    성 명
                                </th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5 font-medium">
                                    {userName}
                                </td>
                                <th className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400 w-[100px]">
                                    작 성 일
                                </th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">
                                    {dateStr}
                                </td>
                            </tr>
                            <tr>
                                <th className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400">
                                    소 속
                                </th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">
                                    {userDepartment}
                                </td>
                                <th className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400">
                                    직 급
                                </th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">
                                    <input
                                        className={DOC_INPUT}
                                        placeholder="직급을 입력하세요"
                                        value={formData.position || ""}
                                        onChange={(e) => onChange({ ...formData, position: e.target.value })}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <th className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400">
                                    제 목
                                </th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5" colSpan={3}>
                                    <input
                                        className={`${DOC_INPUT} font-medium`}
                                        placeholder="품의 제목을 입력하세요 *"
                                        value={formData.docTitle || ""}
                                        onChange={(e) => onChange({ ...formData, docTitle: e.target.value })}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 프로젝트 연결 (선택) ── */}
                <div className="px-8">
                    <input
                        className={`${DOC_INPUT} mb-4`}
                        placeholder="연결 프로젝트명 (선택사항)"
                        value={formData.project || ""}
                        onChange={(e) => onChange({ ...formData, project: e.target.value })}
                    />
                </div>

                {/* ── 품의 내용 ── */}
                <div className="px-8 pb-8">
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 pl-3 border-l-[3px] border-slate-800 dark:border-slate-400">
                        품의 내용
                    </div>
                    <table className="w-full border-collapse text-sm">
                        <tbody>
                            <tr>
                                <th className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400 w-[120px] align-top leading-relaxed">
                                    품의 사유<br />및<br />상세 내역
                                </th>
                                <td className="border border-slate-300 dark:border-slate-600 px-6 py-5">
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap text-sm">1. 품 목 :</span>
                                            <input
                                                className={DOC_INPUT}
                                                placeholder="구매 품목 또는 요청 항목"
                                                value={formData.item || ""}
                                                onChange={(e) => onChange({ ...formData, item: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap text-sm">2. 업체명 :</span>
                                            <input
                                                className={DOC_INPUT}
                                                placeholder="거래처 / 업체명"
                                                value={formData.vendor || ""}
                                                onChange={(e) => onChange({ ...formData, vendor: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap text-sm">3. 지급비용 :</span>
                                            <div className="flex items-center gap-1 flex-1">
                                                <span className="text-sm text-slate-500">금</span>
                                                <input
                                                    className={DOC_INPUT}
                                                    type="number"
                                                    placeholder="0"
                                                    value={formData.paymentAmount || ""}
                                                    onChange={(e) => onChange({ ...formData, paymentAmount: e.target.value })}
                                                />
                                                <span className="text-sm text-slate-500 whitespace-nowrap">원 (부가세 포함)</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap text-sm">4. 지급방법 :</span>
                                            <select
                                                className={DOC_SELECT}
                                                value={formData.paymentMethod || "법인카드"}
                                                onChange={(e) => onChange({ ...formData, paymentMethod: e.target.value })}
                                            >
                                                <option value="법인카드">법인카드 결제</option>
                                                <option value="계좌이체">계좌이체</option>
                                                <option value="현금">현금</option>
                                                <option value="기타">기타</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap text-sm">5. 입금일자 :</span>
                                            <input
                                                className={DOC_INPUT}
                                                type="date"
                                                value={formData.paymentDate || ""}
                                                onChange={(e) => onChange({ ...formData, paymentDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400">
                                    예상 비용
                                </th>
                                <td className="border border-slate-300 dark:border-slate-600 px-6 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <span className="text-slate-500">₩</span>
                                        <input
                                            className={`${DOC_INPUT} text-right font-semibold text-base max-w-[200px]`}
                                            type="number"
                                            placeholder="0"
                                            value={formData.estimatedCost || ""}
                                            onChange={(e) => onChange({ ...formData, estimatedCost: e.target.value })}
                                        />
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400">
                                    비 목
                                </th>
                                <td className="border border-slate-300 dark:border-slate-600 px-6 py-2.5">
                                    <input
                                        className={DOC_INPUT}
                                        placeholder="예: 연구재료비, 업무추진비 등"
                                        value={formData.budgetCategory || ""}
                                        onChange={(e) => onChange({ ...formData, budgetCategory: e.target.value })}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <th className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400 align-top">
                                    비 고
                                </th>
                                <td className="border border-slate-300 dark:border-slate-600 px-6 py-2.5">
                                    <textarea
                                        className="w-full border-0 bg-transparent px-1 py-1 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none min-h-[80px]"
                                        placeholder="추가 참고 사항을 입력하세요"
                                        value={formData.notes || ""}
                                        onChange={(e) => onChange({ ...formData, notes: e.target.value })}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 하단 서명 미리보기 ── */}
                <div className="text-center px-8 pb-8 text-sm text-slate-500 dark:text-slate-400 leading-loose">
                    <p>위와 같은 사유로 품의서를 제출하오니 허가하여 주시기 바랍니다.</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300 mt-2">{dateStr.replace(/\. /g, "년 ").replace(/\.$/, "") + "일"}</p>
                    <p className="mt-1">
                        <span className="text-slate-400">{userDepartment}</span>
                        &nbsp;&nbsp;
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                            {userName.split("").join(" ")}
                        </span>
                        <span className="text-slate-400 ml-2">(인)</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── 지출결의서 (EXPENSE) 문서형 폼 ──────────────────────────────────────────

function ExpenseDocFormFields({
    formData,
    onChange,
    userName,
    userDepartment,
}: {
    formData: Record<string, any>;
    onChange: (data: Record<string, any>) => void;
    userName: string;
    userDepartment: string;
}) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}. ${String(today.getMonth() + 1).padStart(2, "0")}. ${String(today.getDate()).padStart(2, "0")}`;

    const expenses: any[] = formData.expenses || [];
    const accounts: any[] = formData.accounts || [];

    // ── 자동 계산 ──
    const calc = useMemo(() => {
        let totalSupply = 0;
        let totalVat = 0;
        const rows = expenses.map((exp: any) => {
            const qty = Number(exp.qty) || 0;
            const up = Number(exp.unitPrice) || 0;
            const supply = qty * up;
            const vat = exp.noVat ? 0 : Math.round(supply * 0.1);
            totalSupply += supply;
            totalVat += vat;
            return { supply, vat };
        });
        return { rows, totalSupply, totalVat, grandTotal: totalSupply + totalVat };
    }, [expenses]);

    const fmt = (n: number) => (n ? n.toLocaleString() : "");

    // ── 지출 내역 행 조작 ──
    const updateExpense = (i: number, field: string, value: string | boolean) => {
        const next = expenses.map((e: any, idx: number) => (idx === i ? { ...e, [field]: value } : e));
        onChange({ ...formData, expenses: next });
    };
    const addExpenseRow = () => {
        if (expenses.length >= 10) return;
        onChange({ ...formData, expenses: [...expenses, { date: "", vendor: "", content: "", qty: "", unitPrice: "", note: "", noVat: false }] });
    };
    const removeExpenseRow = (i: number) => {
        if (expenses.length <= 1) return;
        onChange({ ...formData, expenses: expenses.filter((_: any, idx: number) => idx !== i) });
    };

    // ── 송금 계좌 행 조작 ──
    const updateAccount = (i: number, field: string, value: string) => {
        const next = accounts.map((a: any, idx: number) => (idx === i ? { ...a, [field]: value } : a));
        onChange({ ...formData, accounts: next });
    };
    const addAccountRow = () => {
        if (accounts.length >= 5) return;
        onChange({ ...formData, accounts: [...accounts, { vendor: "", bank: "", accountNo: "", holder: "", amount: "" }] });
    };
    const removeAccountRow = (i: number) => {
        if (accounts.length <= 1) return;
        onChange({ ...formData, accounts: accounts.filter((_: any, idx: number) => idx !== i) });
    };

    const TH = "border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400";
    const TD = "border border-slate-300 dark:border-slate-600 px-1 py-0.5";
    const DARK_TH = "bg-slate-800 dark:bg-slate-900 text-white text-xs font-medium px-2 py-2.5 border border-slate-700";

    return (
        <div className="rounded-xl border overflow-hidden shadow-sm">
            {/* ── 문서 헤더 ── */}
            <div className="bg-slate-800 text-white px-6 sm:px-8 py-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-[0.15em]">지 출 결 의 서</h2>
                <div className="text-right text-sm text-slate-400 leading-relaxed">
                    기 안 일 : <span className="text-white font-medium">{dateStr}</span>
                </div>
            </div>

            <div className="bg-background">
                {/* ── 정산 기간 ── */}
                <div className="px-6 sm:px-8 pt-6 mb-4">
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-400 whitespace-nowrap">정산 기간 :</span>
                        <input
                            type="date"
                            className="border border-green-300 dark:border-green-700 rounded px-2 py-1 text-sm bg-white dark:bg-slate-900"
                            value={formData.periodStart || ""}
                            onChange={(e) => onChange({ ...formData, periodStart: e.target.value })}
                        />
                        <span className="text-green-600 dark:text-green-400">~</span>
                        <input
                            type="date"
                            className="border border-green-300 dark:border-green-700 rounded px-2 py-1 text-sm bg-white dark:bg-slate-900"
                            value={formData.periodEnd || ""}
                            onChange={(e) => onChange({ ...formData, periodEnd: e.target.value })}
                        />
                        <input
                            className="border border-green-300 dark:border-green-700 rounded px-2 py-1 text-sm bg-white dark:bg-slate-900 w-24"
                            placeholder="(1주차)"
                            value={formData.periodLabel || ""}
                            onChange={(e) => onChange({ ...formData, periodLabel: e.target.value })}
                        />
                    </div>
                </div>

                {/* ── 연결 품의서 ── */}
                <div className="px-6 sm:px-8 mb-5">
                    <input
                        className={DOC_INPUT}
                        placeholder="연결 품의서 번호 (예: APR-2026-0040, APR-2026-0042)"
                        value={formData.linkedDocs || ""}
                        onChange={(e) => onChange({ ...formData, linkedDocs: e.target.value })}
                    />
                </div>

                {/* ── 작성자 정보 ── */}
                <div className="px-6 sm:px-8">
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 pl-3 border-l-[3px] border-slate-800 dark:border-slate-400">
                        작성자 정보
                    </div>
                    <table className="w-full border-collapse text-sm mb-6">
                        <tbody>
                            <tr>
                                <th className={`${TH} w-[100px]`}>성 명</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5 font-medium">{userName}</td>
                                <th className={`${TH} w-[100px]`}>작 성 일</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">{dateStr}</td>
                            </tr>
                            <tr>
                                <th className={TH}>소 속</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">{userDepartment}</td>
                                <th className={TH}>직 급</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2.5">
                                    <input
                                        className={DOC_INPUT}
                                        placeholder="직급"
                                        value={formData.position || ""}
                                        onChange={(e) => onChange({ ...formData, position: e.target.value })}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 합계 (VAT 포함) ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className="flex border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-800 px-6 py-5 font-semibold text-sm text-slate-600 dark:text-slate-400 border-r border-slate-300 dark:border-slate-600 flex items-center min-w-[130px] justify-center text-center leading-snug">
                            합 계<br />(VAT 포함)
                        </div>
                        <div className="flex-1 px-8 py-5 text-2xl font-bold text-center tabular-nums">
                            ₩ {calc.grandTotal.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* ── 송금 계좌 정보 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 pl-3 border-l-[3px] border-slate-800 dark:border-slate-400">
                            송금 계좌 정보
                        </div>
                        {accounts.length < 5 && (
                            <button type="button" onClick={addAccountRow} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <Plus className="h-3 w-3" /> 행 추가
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto -mx-6 px-6 sm:-mx-8 sm:px-8">
                        <table className="w-full border-collapse text-sm min-w-[640px]">
                            <thead>
                                <tr>
                                    <th className={`${DARK_TH} w-[36px]`}>No.</th>
                                    <th className={DARK_TH}>거래처</th>
                                    <th className={`${DARK_TH} w-[90px]`}>은행명</th>
                                    <th className={`${DARK_TH} w-[160px]`}>계좌번호</th>
                                    <th className={`${DARK_TH} w-[100px]`}>예금주</th>
                                    <th className={`${DARK_TH} w-[110px]`}>송금액</th>
                                    <th className={`${DARK_TH} w-[28px]`}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map((acc: any, i: number) => (
                                    <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-800/30" : ""}>
                                        <td className={`${TD} text-center text-xs font-semibold text-slate-500 px-2`}>{i + 1}</td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="거래처" value={acc.vendor || ""} onChange={(e) => updateAccount(i, "vendor", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="은행" value={acc.bank || ""} onChange={(e) => updateAccount(i, "bank", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="000-000000-00-000" value={acc.accountNo || ""} onChange={(e) => updateAccount(i, "accountNo", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="예금주" value={acc.holder || ""} onChange={(e) => updateAccount(i, "holder", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs text-right font-semibold`} type="number" placeholder="0" value={acc.amount || ""} onChange={(e) => updateAccount(i, "amount", e.target.value)} />
                                        </td>
                                        <td className={`${TD} text-center`}>
                                            {accounts.length > 1 && (
                                                <button type="button" onClick={() => removeAccountRow(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── 지출 내역 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 pl-3 border-l-[3px] border-slate-800 dark:border-slate-400">
                            지출 내역
                        </div>
                        {expenses.length < 10 && (
                            <button type="button" onClick={addExpenseRow} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <Plus className="h-3 w-3" /> 행 추가
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto -mx-6 px-6 sm:-mx-8 sm:px-8">
                        <table className="w-full border-collapse text-sm min-w-[780px]">
                            <thead>
                                <tr>
                                    <th className={`${DARK_TH} w-[36px]`}>No.</th>
                                    <th className={`${DARK_TH} w-[76px]`}>일자</th>
                                    <th className={`${DARK_TH} w-[100px]`}>거래처</th>
                                    <th className={DARK_TH}>내용</th>
                                    <th className={`${DARK_TH} w-[44px]`}>수량</th>
                                    <th className={`${DARK_TH} w-[88px]`}>단가</th>
                                    <th className={`${DARK_TH} w-[88px]`}>공급가액</th>
                                    <th className={`${DARK_TH} w-[78px]`}>세액</th>
                                    <th className={`${DARK_TH} w-[78px]`}>세액없음</th>
                                    <th className={`${DARK_TH} w-[28px]`}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map((exp: any, i: number) => (
                                    <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-800/30" : ""}>
                                        <td className={`${TD} text-center text-xs font-semibold text-slate-500 px-2`}>{i + 1}</td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs text-center`} placeholder="MM/DD" value={exp.date || ""} onChange={(e) => updateExpense(i, "date", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="거래처" value={exp.vendor || ""} onChange={(e) => updateExpense(i, "vendor", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="지출 내용" value={exp.content || ""} onChange={(e) => updateExpense(i, "content", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs text-center`} type="number" placeholder="0" value={exp.qty || ""} onChange={(e) => updateExpense(i, "qty", e.target.value)} />
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs text-right`} type="number" placeholder="0" value={exp.unitPrice || ""} onChange={(e) => updateExpense(i, "unitPrice", e.target.value)} />
                                        </td>
                                        <td className={`${TD} text-right text-xs font-medium text-slate-700 dark:text-slate-300 px-2 tabular-nums`}>
                                            {fmt(calc.rows[i]?.supply)}
                                        </td>
                                        <td className={`${TD} text-right text-xs text-slate-500 dark:text-slate-400 px-2 tabular-nums`}>
                                            {exp.noVat ? <span className="text-slate-400">-</span> : fmt(calc.rows[i]?.vat)}
                                        </td>
                                        <td className={`${TD} text-center`}>
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 cursor-pointer accent-slate-700"
                                                checked={!!exp.noVat}
                                                onChange={(e) => updateExpense(i, "noVat", e.target.checked as any)}
                                                aria-label="세액 없음"
                                            />
                                        </td>
                                        <td className={`${TD} text-center`}>
                                            {expenses.length > 1 && (
                                                <button type="button" onClick={() => removeExpenseRow(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {/* ── 소계 행 ── */}
                                <tr className="border-t-2 border-slate-400 dark:border-slate-500">
                                    <td colSpan={6} className="border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-right px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400">
                                        소 계
                                    </td>
                                    <td className="border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-right px-2 py-2.5 text-sm font-semibold tabular-nums">
                                        {calc.totalSupply.toLocaleString()}
                                    </td>
                                    <td className="border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-right px-2 py-2.5 text-sm font-semibold tabular-nums">
                                        {calc.totalVat.toLocaleString()}
                                    </td>
                                    <td colSpan={2} className="border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── 특이사항 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <table className="w-full border-collapse text-sm">
                        <tbody>
                            <tr>
                                <th className={`${TH} w-[120px] align-top`}>특이사항</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3">
                                    <textarea
                                        className="w-full border-0 bg-transparent px-1 py-1 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none min-h-[80px]"
                                        placeholder="추가 참고 사항을 입력하세요"
                                        value={formData.remarks || ""}
                                        onChange={(e) => onChange({ ...formData, remarks: e.target.value })}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── 하단 서명 미리보기 ── */}
                <div className="text-center px-6 sm:px-8 pb-8 text-sm text-slate-500 dark:text-slate-400 leading-loose">
                    <p>위와 같은 금액을 청구하오니, 결재하여 주시기 바랍니다.</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300 mt-2">
                        {dateStr.replace(/\. /g, "년 ").replace(/\.$/, "") + "일"}
                    </p>
                    <p className="mt-1">
                        <span className="text-slate-400">{userDepartment}</span>
                        &nbsp;&nbsp;
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                            {userName.split("").join(" ")}
                        </span>
                        <span className="text-slate-400 ml-2">(인)</span>
                    </p>
                </div>
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
    lockedIds = [],
}: {
    employees: Employee[];
    currentUserId: string;
    selected: string[];
    onToggle: (id: string) => void;
    lockedIds?: string[];
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

    const grouped = useMemo(() => {
        const map: Record<string, Employee[]> = {};
        for (const emp of filtered) {
            const dept = emp.departmentName || "미지정";
            if (!map[dept]) map[dept] = [];
            map[dept].push(emp);
        }
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    }, [filtered]);

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
        <div className="space-y-3">
            {selected.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap p-3 bg-muted/40 rounded-lg">
                    {selected.map((id, idx) => {
                        const emp = availableEmployees.find((e) => e.id === id);
                        const isLocked = lockedIds.includes(id);
                        return (
                            <div key={id} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${isLocked ? "bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700" : "bg-primary/10 border border-primary/20"}`}>
                                <span className={`font-bold ${isLocked ? "text-amber-600 dark:text-amber-400" : "text-primary"}`}>{idx + 1}</span>
                                <span className="font-medium">{emp?.name}</span>
                                {isLocked ? (
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 ml-1">자동</span>
                                ) : (
                                    <button type="button" onClick={() => onToggle(id)}>
                                        <X className="h-3 w-3 text-muted-foreground" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="이름 또는 부서 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            <div className="max-h-[280px] overflow-y-auto space-y-0.5 border rounded-lg">
                {grouped.map(([dept, members]) => {
                    const isExpanded = expandedDepts.has(dept);
                    return (
                        <div key={dept}>
                            <button
                                type="button"
                                onClick={() => toggleDept(dept)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                            >
                                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                {dept}
                                <span className="text-xs ml-auto opacity-60">{members.length}명</span>
                            </button>
                            {isExpanded && (
                                <div className="pl-6 pr-3 pb-1 space-y-0.5">
                                    {members.map((emp) => {
                                        const isSelected = selected.includes(emp.id);
                                        const order = selected.indexOf(emp.id) + 1;
                                        return (
                                            <button
                                                key={emp.id}
                                                type="button"
                                                onClick={() => onToggle(emp.id)}
                                                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                                                    isSelected
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-foreground hover:bg-muted"
                                                }`}
                                            >
                                                {isSelected && (
                                                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold flex-shrink-0">
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
                    <p className="text-sm text-muted-foreground text-center py-4">검색 결과가 없습니다.</p>
                )}
            </div>
        </div>
    );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export function NewApprovalForm({ forcedEditId }: { forcedEditId?: string } = {}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = forcedEditId ?? searchParams.get("editId") ?? null;
    const user = useStore(useAuthStore, (s) => s.user);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditLoading, setIsEditLoading] = useState(!!editId);
    const [approverIds, setApproverIds] = useState<string[]>([]);
    const [categoryOpen, setCategoryOpen] = useState(true);
    const [form, setForm] = useState({
        title: "",
        content: "",
        category: "GENERAL" as string,
    });
    const [formData, setFormData] = useState<Record<string, any>>({
        docTitle: "", position: "", item: "", vendor: "",
        paymentAmount: "", paymentMethod: "법인카드", paymentDate: "",
        estimatedCost: "", budgetCategory: "", notes: "", project: "",
    });
    const [attachments, setAttachments] = useState<{ name: string; url: string; size: number; type: string }[]>([]);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const [taxInvoiceLargeOpen, setTaxInvoiceLargeOpen] = useState(false);

    // 직원 목록 로드
    useEffect(() => {
        (async () => {
            const res = await getEmployees();
            if (res.success && res.data) {
                setEmployees(
                    res.data.map((e: any) => ({
                        id: e.id,
                        name: e.name,
                        departmentName: e.department?.name || "미지정",
                    }))
                );
            }
        })();
    }, []);

    // 편집 모드: 기존 결재 로드
    useEffect(() => {
        if (!editId) return;
        (async () => {
            try {
                const res = await getApprovalRequestById(editId);
                if (res.success && res.data) {
                    const a: any = res.data;
                    setForm({
                        title: a.title || "",
                        content: a.content || "",
                        category: a.category || "GENERAL",
                    });
                    setFormData(a.formData || {});
                    setApproverIds((a.steps || []).map((s: any) => s.approverId));
                    if (Array.isArray(a.attachments)) {
                        setAttachments(a.attachments.map((att: any) => ({
                            name: att.name, url: att.url, size: att.size, type: att.type,
                        })));
                    }
                    setCategoryOpen(false); // 편집 시 카테고리 섹션 접어둠
                } else {
                    alert(res.error || "기존 결재를 불러오지 못했습니다.");
                    router.push("/approvals");
                }
            } finally {
                setIsEditLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editId]);

    // 카테고리 변경 시 formData 초기화
    const handleCategoryChange = (cat: string) => {
        setForm({ ...form, category: cat });
        setCategoryOpen(false);
        setAttachments([]);
        switch (cat) {
            case "VACATION":
                setFormData({ vacationType: "연차", startDate: "", endDate: "" });
                break;
            case "OVERTIME":
                setFormData({ overtimeDate: "", startTime: "18:00", endTime: "21:00" });
                break;
            case "BUSINESS_TRIP":
                setFormData({
                    position: "", tripStartDate: "", tripEndDate: "", tripStartTime: "", tripEndTime: "",
                    location: "", locationDetail: "", visitCompany: "", visitDepartment: "",
                    contactName: "", contactPhone: "", purpose: "", achievements: "",
                    hasExpense: true,
                    schedules: [{ time: "", location: "", content: "", result: "" }],
                    followups: [{ text: "", dueDate: "" }],
                    tripExpenses: [{ category: "", content: "", amount: "", payMethod: "법인카드" }],
                });
                break;
            case "FIELD_WORK_PLAN":
                setFormData({
                    position: "", contact: "",
                    tripType: "외근", tripTypeEtc: "",
                    tripStartDate: "", tripEndDate: "",
                    visitCompany: "", visitPlace: "",
                    purpose: "", remarks: "",
                    schedules: [{ date: "", time: "", place: "", content: "" }],
                    expenses: { transport: "", lodging: "", meal: "", etc: "" },
                    transportPayMethod: "법인카드", lodgingPayMethod: "법인카드",
                    mealPayMethod: "법인카드", etcPayMethod: "법인카드",
                });
                break;
            case "EXPENSE":
                setFormData({
                    position: "", periodStart: "", periodEnd: "", periodLabel: "", linkedDocs: "", remarks: "",
                    accounts: [{ vendor: "", bank: "", accountNo: "", holder: "", amount: "" }],
                    expenses: [{ date: "", vendor: "", content: "", qty: "", unitPrice: "", note: "", noVat: false }],
                });
                break;
            case "GENERAL":
                setFormData({
                    docTitle: "", position: "", item: "", vendor: "",
                    paymentAmount: "", paymentMethod: "법인카드", paymentDate: "",
                    estimatedCost: "", budgetCategory: "", notes: "", project: "",
                });
                break;
            case "INSPECTION":
                setFormData({
                    docTitle: "", projectName: "", projectPeriod: "", projectCode: "",
                    vendor: "", inspectionTitle: "", inspectionDate: "", inspector: "",
                    items: [{ name: "", spec: "", unit: "", qty: "", unitPrice: "", note: "" }],
                });
                break;
            case "TAX_INVOICE":
                setFormData({
                    issueDate: "", manager: "", managerContact: "",
                    taxItems: [{ company: "", date: "", product: "", qty: "", unitPrice: "", note: "" }],
                });
                break;
            case "EXPENDITURE_PLAN":
                setFormData({
                    planDate: "", position: "",
                    planItems: [{ date: "", category: "", detail: "", amount: "", note: "" }],
                });
                break;
            case "PERSONAL_EXPENSE":
                setFormData({
                    bankAccount: "", specialNote: "",
                    expenseItems: [{ content: "", amount: "", note: "" }],
                });
                break;
            default:
                setFormData({});
        }
    };

    // AI 기안 prefill 데이터 수신
    useEffect(() => {
        if (searchParams.get("from") !== "ai") return;
        try {
            const raw = sessionStorage.getItem("ai-approval-prefill");
            if (!raw) return;
            sessionStorage.removeItem("ai-approval-prefill");
            const { category, formData: aiFormData } = JSON.parse(raw);
            if (!category || !aiFormData) return;

            // 1. 카테고리 설정 + 기본 formData 초기화
            handleCategoryChange(category);

            // 2. AI 데이터를 기본 formData 위에 머지 (handleCategoryChange의 setState 반영 후)
            setTimeout(() => {
                setFormData(prev => {
                    const merged = { ...prev };
                    for (const [key, value] of Object.entries(aiFormData)) {
                        if (value === "" || value === null || value === undefined) continue;
                        if (Array.isArray(value) && value.length > 0) {
                            merged[key] = value;
                        } else if (!Array.isArray(value)) {
                            merged[key] = value;
                        }
                    }
                    return merged;
                });
            }, 50);
        } catch (e) {
            console.error("AI prefill 파싱 실패:", e);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

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

    useEffect(() => {
        if (form.category !== "GENERAL" && !form.title && autoTitle) {
            setForm((prev) => ({ ...prev, title: autoTitle }));
        }
    }, [autoTitle]);

    // ── 금액 100만원 이상 시 대표(한승우) 결재선 자동 추가 ──
    const CEO_ID = "한승우";
    useEffect(() => {
        if (!user || user.id === CEO_ID) return; // 본인이 대표면 스킵

        let totalAmount = 0;
        switch (form.category) {
            case "EXPENSE":
                totalAmount = (formData.expenses || []).reduce((s: number, e: any) => s + ((Number(e.qty) || 0) * (Number(e.unitPrice) || 0)), 0);
                break;
            case "INSPECTION":
                totalAmount = (formData.items || []).reduce((s: number, it: any) => s + ((Number(it.qty) || 0) * (Number(it.unitPrice) || 0)), 0);
                break;
            case "TAX_INVOICE":
                totalAmount = (formData.taxItems || []).reduce((s: number, it: any) => {
                    const supply = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
                    return s + supply + Math.round(supply * 0.1);
                }, 0);
                break;
            case "EXPENDITURE_PLAN":
                totalAmount = (formData.planItems || []).reduce((s: number, it: any) => s + (Number(it.amount) || 0), 0);
                break;
            case "PERSONAL_EXPENSE":
                totalAmount = (formData.expenseItems || []).reduce((s: number, it: any) => s + (Number(it.amount) || 0), 0);
                break;
            case "FIELD_WORK_PLAN": {
                const exp = formData.expenses || {};
                totalAmount = ["transport", "lodging", "meal", "etc"].reduce((s: number, k: string) => s + (Number(exp[k]) || 0), 0);
                break;
            }
            default:
                return; // 금액 기반 카테고리가 아니면 스킵
        }

        const ceoExists = employees.some((e) => e.id === CEO_ID);
        if (!ceoExists) return;

        if (totalAmount >= 1000000 && !approverIds.includes(CEO_ID)) {
            setApproverIds((prev) => [...prev, CEO_ID]);
        }
    }, [form.category, formData, employees, user]);

    // 첨부파일 업로드 핸들러
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploadingFiles(true);
        try {
            const fd = new FormData();
            Array.from(files).forEach((f) => fd.append("files", f));
            const res = await fetch("/api/approvals/upload", { method: "POST", body: fd });
            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();
            setAttachments((prev) => [...prev, ...data.files]);
        } catch (err) {
            console.error("파일 업로드 실패:", err);
            alert("파일 업로드에 실패했습니다.");
        } finally {
            setUploadingFiles(false);
            e.target.value = "";
        }
    };

    const removeAttachment = (idx: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== idx));
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // 파일 첨부 대상 카테고리
    const showAttachments = ["GENERAL", "EXPENSE", "BUSINESS_TRIP", "FIELD_WORK_PLAN", "GRANT_APPLICATION", "INSPECTION", "TAX_INVOICE", "EXPENDITURE_PLAN", "PERSONAL_EXPENSE"].includes(form.category);

    // 금액 기반 자동 추가 대상인지 계산
    const ceoAutoRequired = useMemo(() => {
        if (!user || user.id === CEO_ID) return false;
        let total = 0;
        switch (form.category) {
            case "EXPENSE":
                total = (formData.expenses || []).reduce((s: number, e: any) => s + ((Number(e.qty) || 0) * (Number(e.unitPrice) || 0)), 0);
                break;
            case "INSPECTION":
                total = (formData.items || []).reduce((s: number, it: any) => s + ((Number(it.qty) || 0) * (Number(it.unitPrice) || 0)), 0);
                break;
            case "TAX_INVOICE":
                total = (formData.taxItems || []).reduce((s: number, it: any) => {
                    const supply = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
                    return s + supply + Math.round(supply * 0.1);
                }, 0);
                break;
            case "EXPENDITURE_PLAN":
                total = (formData.planItems || []).reduce((s: number, it: any) => s + (Number(it.amount) || 0), 0);
                break;
            case "PERSONAL_EXPENSE":
                total = (formData.expenseItems || []).reduce((s: number, it: any) => s + (Number(it.amount) || 0), 0);
                break;
            case "FIELD_WORK_PLAN": {
                const exp = formData.expenses || {};
                total = ["transport", "lodging", "meal", "etc"].reduce((s: number, k: string) => s + (Number(exp[k]) || 0), 0);
                break;
            }
        }
        return total >= 1000000;
    }, [form.category, formData, user]);

    const toggleApprover = (id: string) => {
        // 대표님이 금액 조건으로 자동 추가된 경우 해제 불가
        if (id === CEO_ID && ceoAutoRequired && approverIds.includes(id)) return;
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
                return !!(formData.tripStartDate && formData.location?.trim());
            case "FIELD_WORK_PLAN":
                return !!(formData.tripStartDate && (formData.visitCompany?.trim() || formData.visitPlace?.trim()) && formData.purpose?.trim());
            case "EXPENSE":
                return formData.expenses?.some((e: any) => e.content?.trim() && e.qty && e.unitPrice);
            case "GENERAL":
                return !!formData.docTitle?.trim();
            case "INSPECTION":
                return !!formData.docTitle?.trim() && formData.items?.some((it: any) => it.name?.trim());
            case "TAX_INVOICE":
                return formData.taxItems?.some((it: any) => it.company?.trim() || it.product?.trim());
            case "EXPENDITURE_PLAN":
                return formData.planItems?.some((it: any) => it.category?.trim() || it.detail?.trim());
            case "PERSONAL_EXPENSE":
                return formData.expenseItems?.some((it: any) => it.content?.trim() || Number(it.amount) > 0);
            default:
                return true;
        }
    };

    // GENERAL 품의서: formData → title/content 자동 구성
    const isDocumentForm = form.category === "GENERAL" || form.category === "EXPENSE" || form.category === "BUSINESS_TRIP" || form.category === "FIELD_WORK_PLAN" || form.category === "INSPECTION" || form.category === "TAX_INVOICE" || form.category === "EXPENDITURE_PLAN" || form.category === "PERSONAL_EXPENSE";

    const composeGeneralContent = (fd: Record<string, any>): string => {
        const lines: string[] = [];
        if (fd.item) lines.push(`1. 품목: ${fd.item}`);
        if (fd.vendor) lines.push(`2. 업체명: ${fd.vendor}`);
        if (fd.paymentAmount) lines.push(`3. 지급비용: 금 ${Number(fd.paymentAmount).toLocaleString()}원 (부가세 포함)`);
        if (fd.paymentMethod) lines.push(`4. 지급방법: ${fd.paymentMethod} 결제`);
        if (fd.paymentDate) lines.push(`5. 입금일자: ${fd.paymentDate}`);
        if (fd.estimatedCost) lines.push(`\n예상비용: ₩${Number(fd.estimatedCost).toLocaleString()}`);
        if (fd.budgetCategory) lines.push(`비목: ${fd.budgetCategory}`);
        if (fd.project) lines.push(`프로젝트: ${fd.project}`);
        if (fd.notes) lines.push(`\n비고: ${fd.notes}`);
        return lines.join("\n");
    };

    const composeExpenseContent = (fd: Record<string, any>): string => {
        const lines: string[] = [];
        if (fd.periodStart && fd.periodEnd) {
            lines.push(`정산기간: ${fd.periodStart} ~ ${fd.periodEnd}${fd.periodLabel ? ` (${fd.periodLabel})` : ""}`);
        }
        if (fd.linkedDocs) lines.push(`연결 품의: ${fd.linkedDocs}`);
        lines.push("\n[지출 내역]");
        let totalSupply = 0;
        let totalVat = 0;
        fd.expenses?.forEach((exp: any, i: number) => {
            if (exp.content?.trim()) {
                const qty = Number(exp.qty) || 0;
                const up = Number(exp.unitPrice) || 0;
                const supply = qty * up;
                const vat = exp.noVat ? 0 : Math.round(supply * 0.1);
                totalSupply += supply;
                totalVat += vat;
                const vatPart = exp.noVat ? "세액없음" : `세액 ${vat.toLocaleString()}`;
                lines.push(`${i + 1}. ${exp.date || ""} ${exp.vendor || ""} - ${exp.content} (${qty}×${up.toLocaleString()} = 공급가 ${supply.toLocaleString()} + ${vatPart})`);
            }
        });
        lines.push(`\n소계: 공급가 ${totalSupply.toLocaleString()} + 세액 ${totalVat.toLocaleString()}`);
        lines.push(`합계 (VAT 포함): ₩${(totalSupply + totalVat).toLocaleString()}`);
        if (fd.accounts?.some((a: any) => a.vendor?.trim())) {
            lines.push("\n[송금 계좌]");
            fd.accounts.forEach((acc: any, i: number) => {
                if (acc.vendor?.trim()) {
                    lines.push(`${i + 1}. ${acc.vendor} / ${acc.bank} ${acc.accountNo} (${acc.holder}) - ${Number(acc.amount || 0).toLocaleString()}원`);
                }
            });
        }
        if (fd.remarks) lines.push(`\n특이사항: ${fd.remarks}`);
        return lines.join("\n");
    };

    const canSubmit = (() => {
        if (form.category === "GENERAL") return !!formData.docTitle?.trim();
        if (form.category === "EXPENSE") return formData.expenses?.some((e: any) => e.content?.trim());
        if (form.category === "BUSINESS_TRIP") return !!(formData.tripStartDate && formData.location?.trim());
        if (form.category === "FIELD_WORK_PLAN") return !!(formData.tripStartDate && (formData.visitCompany?.trim() || formData.visitPlace?.trim()) && formData.purpose?.trim());
        if (form.category === "INSPECTION") return !!formData.docTitle?.trim() && formData.items?.some((it: any) => it.name?.trim());
        if (form.category === "TAX_INVOICE") return formData.taxItems?.some((it: any) => it.company?.trim() || it.product?.trim());
        if (form.category === "EXPENDITURE_PLAN") return formData.planItems?.some((it: any) => it.category?.trim() || it.detail?.trim());
        if (form.category === "PERSONAL_EXPENSE") return formData.expenseItems?.some((it: any) => it.content?.trim() || Number(it.amount) > 0);
        return !!form.title.trim() && !!form.content.trim();
    })();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!canSubmit) return;
        if (approverIds.length === 0) {
            alert("결재자를 1명 이상 선택해주세요.");
            return;
        }
        if (!validateFormData()) {
            alert("필수 항목을 모두 입력해주세요.");
            return;
        }

        let submitTitle = form.title;
        let submitContent = form.content;

        if (form.category === "GENERAL") {
            submitTitle = formData.docTitle;
            submitContent = composeGeneralContent(formData);
        } else if (form.category === "BUSINESS_TRIP") {
            const dateRange = formData.tripEndDate && formData.tripStartDate !== formData.tripEndDate
                ? `${formData.tripStartDate} ~ ${formData.tripEndDate}`
                : formData.tripStartDate;
            submitTitle = `외근/출장 보고서 - ${formData.visitCompany || formData.location} (${dateRange})`;
            const lines: string[] = [];
            if (formData.tripStartDate) {
                const period = formData.tripEndDate && formData.tripStartDate !== formData.tripEndDate
                    ? `${formData.tripStartDate} ~ ${formData.tripEndDate}`
                    : formData.tripStartDate;
                const timeRange = formData.tripStartTime || formData.tripEndTime
                    ? ` ${formData.tripStartTime || ""} ~ ${formData.tripEndTime || ""}`
                    : "";
                lines.push(`기간: ${period}${timeRange}`);
            }
            if (formData.location) lines.push(`장소: ${formData.location}${formData.locationDetail ? ` (${formData.locationDetail})` : ""}`);
            if (formData.visitCompany) lines.push(`방문기관: ${formData.visitCompany}${formData.visitDepartment ? ` ${formData.visitDepartment}` : ""}`);
            if (formData.contactName) lines.push(`면담자: ${formData.contactName}${formData.contactPhone ? ` (${formData.contactPhone})` : ""}`);
            if (formData.purpose) lines.push(`\n[목적]\n${formData.purpose}`);
            if (formData.schedules?.some((s: any) => s.content?.trim())) {
                lines.push("\n[방문 일정]");
                formData.schedules.forEach((s: any, i: number) => {
                    if (s.content?.trim()) lines.push(`${i + 1}. ${s.time || ""} ${s.location || ""} - ${s.content}${s.result ? ` (${s.result})` : ""}`);
                });
            }
            if (formData.achievements) lines.push(`\n[업무 수행 결과]\n${formData.achievements}`);
            if (formData.followups?.some((f: any) => f.text?.trim())) {
                lines.push("\n[후속 조치]");
                formData.followups.forEach((f: any, i: number) => {
                    if (f.text?.trim()) lines.push(`${i + 1}. ${f.text}${f.dueDate ? ` (기한: ${f.dueDate})` : ""}`);
                });
            }
            if (formData.hasExpense !== false && formData.tripExpenses?.some((e: any) => e.content?.trim())) {
                lines.push("\n[경비 내역]");
                let total = 0;
                formData.tripExpenses.forEach((e: any, i: number) => {
                    if (e.content?.trim()) {
                        const amt = Number(e.amount) || 0;
                        total += amt;
                        lines.push(`${i + 1}. ${e.category || ""} - ${e.content} : ${amt.toLocaleString()}원 (${e.payMethod || ""})`);
                    }
                });
                lines.push(`합계: ₩${total.toLocaleString()}`);
            }
            submitContent = lines.join("\n");
        } else if (form.category === "FIELD_WORK_PLAN") {
            const dateRange = formData.tripEndDate && formData.tripStartDate !== formData.tripEndDate
                ? `${formData.tripStartDate} ~ ${formData.tripEndDate}`
                : formData.tripStartDate;
            const target = formData.visitCompany || formData.visitPlace || "";
            submitTitle = `외근/출장 계획서 - ${target} (${dateRange})`;
            const lines: string[] = [];
            const tripTypeLabel = formData.tripType === "기타" && formData.tripTypeEtc
                ? `기타 (${formData.tripTypeEtc})`
                : formData.tripType || "외근";
            lines.push(`구분: ${tripTypeLabel}`);
            if (formData.tripStartDate) {
                lines.push(`기간: ${dateRange}`);
            }
            if (formData.visitCompany) lines.push(`방문처: ${formData.visitCompany}`);
            if (formData.visitPlace) lines.push(`장소: ${formData.visitPlace}`);
            if (formData.purpose) lines.push(`\n[방문 목적]\n${formData.purpose}`);
            if (formData.schedules?.some((s: any) => s.content?.trim() || s.place?.trim())) {
                lines.push("\n[세부 일정]");
                formData.schedules.forEach((s: any, i: number) => {
                    if (s.content?.trim() || s.place?.trim()) {
                        lines.push(`${i + 1}. ${s.date || ""} ${s.time || ""} ${s.place || ""} - ${s.content || ""}`);
                    }
                });
            }
            const exp = formData.expenses || {};
            const expLabels: Record<string, string> = { transport: "교통비", lodging: "숙박비", meal: "식비", etc: "기타" };
            const expKeys = ["transport", "lodging", "meal", "etc"];
            let expTotal = 0;
            const expLines: string[] = [];
            expKeys.forEach((k) => {
                const amt = Number(exp[k]) || 0;
                if (amt > 0) {
                    expTotal += amt;
                    const pay = formData[`${k}PayMethod`] || "법인카드";
                    const note = formData[`${k}Note`] || "";
                    expLines.push(`- ${expLabels[k]}: ${amt.toLocaleString()}원 (${pay})${note ? ` - ${note}` : ""}`);
                }
            });
            if (expLines.length > 0) {
                lines.push("\n[경비 내역 (예상)]");
                lines.push(...expLines);
                lines.push(`합계: ₩${expTotal.toLocaleString()}`);
            }
            if (formData.remarks) lines.push(`\n[특이사항]\n${formData.remarks}`);
            submitContent = lines.join("\n");
        } else if (form.category === "EXPENSE") {
            const period = formData.periodStart && formData.periodEnd
                ? ` (${formData.periodStart} ~ ${formData.periodEnd}${formData.periodLabel ? " " + formData.periodLabel : ""})`
                : "";
            submitTitle = `지출결의서${period}`;
            submitContent = composeExpenseContent(formData);
        } else if (form.category === "INSPECTION") {
            submitTitle = `납품/검수확인서 - ${formData.docTitle}`;
            const lines: string[] = [];
            if (formData.projectName) lines.push(`사업명: ${formData.projectName}`);
            if (formData.projectPeriod) lines.push(`사업기간: ${formData.projectPeriod}`);
            if (formData.projectCode) lines.push(`과제번호: ${formData.projectCode}`);
            if (formData.docTitle) lines.push(`과제명: ${formData.docTitle}`);
            if (formData.vendor) lines.push(`납품업체: ${formData.vendor}`);
            lines.push("\n[검수 품목]");
            let totalAmt = 0;
            formData.items?.forEach((it: any, i: number) => {
                if (it.name?.trim()) {
                    const amt = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
                    totalAmt += amt;
                    lines.push(`${i + 1}. ${it.name} / ${it.spec || "-"} / ${it.unit || "-"} / 수량:${it.qty || 0} / 단가:${Number(it.unitPrice || 0).toLocaleString()} / 금액:${amt.toLocaleString()}${it.note ? ` (${it.note})` : ""}`);
                }
            });
            lines.push(`합계: ₩${totalAmt.toLocaleString()}`);
            if (formData.inspectionDate) lines.push(`\n검수일: ${formData.inspectionDate}`);
            if (formData.inspector) lines.push(`검수자: ${formData.inspector}`);
            submitContent = lines.join("\n");
        } else if (form.category === "TAX_INVOICE") {
            submitTitle = `세금계산서 발행 요청서${formData.issueDate ? ` (${formData.issueDate})` : ""}`;
            const lines: string[] = [];
            if (formData.issueDate) lines.push(`발행일자: ${formData.issueDate}`);
            lines.push("\n[발행 내역]");
            let totalSupply = 0;
            let totalVat = 0;
            formData.taxItems?.forEach((it: any, i: number) => {
                if (it.company?.trim() || it.product?.trim()) {
                    const qty = Number(it.qty) || 0;
                    const up = Number(it.unitPrice) || 0;
                    const supply = qty * up;
                    const vat = Math.round(supply * 0.1);
                    totalSupply += supply;
                    totalVat += vat;
                    lines.push(`${i + 1}. ${it.company || ""} / ${it.date || ""} / ${it.product || ""} / 수량:${qty} / 단가:${up.toLocaleString()} / 공급가:${supply.toLocaleString()} / 부가세:${vat.toLocaleString()} / 합계:${(supply + vat).toLocaleString()}${it.note ? ` (${it.note})` : ""}`);
                }
            });
            lines.push(`\n합계: 공급가 ${totalSupply.toLocaleString()} + 부가세 ${totalVat.toLocaleString()} = ₩${(totalSupply + totalVat).toLocaleString()}`);
            if (formData.manager) lines.push(`\n담당자: ${formData.manager}`);
            if (formData.managerContact) lines.push(`연락처: ${formData.managerContact}`);
            submitContent = lines.join("\n");
        } else if (form.category === "EXPENDITURE_PLAN") {
            submitTitle = `자금 지출계획서${formData.planDate ? ` (${formData.planDate})` : ""}`;
            const lines: string[] = [];
            if (formData.planDate) lines.push(`작성일: ${formData.planDate}`);
            lines.push("\n[지출 내역]");
            let cumTotal = 0;
            formData.planItems?.forEach((it: any, i: number) => {
                if (it.category?.trim() || it.detail?.trim()) {
                    const amt = Number(it.amount) || 0;
                    cumTotal += amt;
                    lines.push(`${i + 1}. ${it.date || ""} / ${it.category || ""} / ${it.detail || ""} / ${amt.toLocaleString()}원 / 누적:${cumTotal.toLocaleString()}원${it.note ? ` (${it.note})` : ""}`);
                }
            });
            lines.push(`\n합계: ₩${cumTotal.toLocaleString()}`);
            submitContent = lines.join("\n");
        } else if (form.category === "PERSONAL_EXPENSE") {
            submitTitle = "개인경비 사용 청구서";
            const lines: string[] = [];
            if (formData.bankAccount) lines.push(`계좌정보: ${formData.bankAccount}`);
            lines.push("\n[청구 내역]");
            let total = 0;
            formData.expenseItems?.forEach((it: any, i: number) => {
                if (it.content?.trim() || Number(it.amount) > 0) {
                    const amt = Number(it.amount) || 0;
                    total += amt;
                    lines.push(`${i + 1}. ${it.content || ""} / ${amt.toLocaleString()}원${it.note ? ` (${it.note})` : ""}`);
                }
            });
            lines.push(`\n합계: ₩${total.toLocaleString()}`);
            if (formData.specialNote) lines.push(`\n특이사항: ${formData.specialNote}`);
            submitContent = lines.join("\n");
        }

        setIsLoading(true);
        try {
            if (editId) {
                const result = await updateApprovalRequest(editId, {
                    title: submitTitle,
                    content: submitContent,
                    approverIds,
                    formData,
                    attachments,
                });
                if (result.success) {
                    router.push(`/approvals/${editId}`);
                } else {
                    alert(result.error || "수정에 실패했습니다.");
                }
            } else {
                const result = await createApprovalRequest({
                    title: submitTitle,
                    content: submitContent,
                    category: form.category as any,
                    requesterId: user.id,
                    approverIds,
                    formData,
                    attachments: attachments.length > 0 ? attachments : undefined,
                });
                if (result.success) {
                    router.push("/approvals");
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;
    if (isEditLoading) {
        return <div className="p-10 text-center text-sm text-muted-foreground">기존 결재를 불러오는 중…</div>;
    }

    const currentEmployee = employees.find((e) => e.id === user.id);
    const userName = currentEmployee?.name || "";
    const userDepartment = currentEmployee?.departmentName || "";
    const selectedCategory = CATEGORY_OPTIONS.find((c) => c.value === form.category);

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* 헤더 */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(editId ? `/approvals/${editId}` : "/approvals")}
                            className="gap-1.5"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            돌아가기
                        </Button>
                        <div className="h-5 w-px bg-border" />
                        <h1 className="text-lg font-bold">{editId ? "기안 수정" : "기안 작성"}</h1>
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || !canSubmit || approverIds.length === 0}
                        className="gap-1.5"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {editId ? "수정 중..." : "제출 중..."}
                            </>
                        ) : (
                            <>
                                <FilePlus className="h-4 w-4" />
                                {editId ? "수정 완료" : "결재 상신"}
                            </>
                        )}
                    </Button>
                </div>
            </header>

            {/* 본문 */}
            <main className="max-w-4xl mx-auto px-6 py-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* 1. 분류 선택 (아코디언) */}
                    <section className="rounded-xl border overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setCategoryOpen((prev) => !prev)}
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                    분류 선택
                                </h2>
                                {!categoryOpen && selectedCategory && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                        {(() => { const Icon = selectedCategory.icon; return <Icon className="h-3.5 w-3.5" />; })()}
                                        {selectedCategory.label}
                                    </span>
                                )}
                            </div>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${categoryOpen ? "rotate-180" : ""}`} />
                        </button>
                        <div
                            className={`grid transition-all duration-200 ease-in-out ${
                                categoryOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                            }`}
                        >
                            <div className="overflow-hidden">
                                <div className="px-5 pb-4 pt-3 space-y-2">
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                        {CATEGORY_OPTIONS.map((c) => {
                                            const Icon = c.icon;
                                            const isActive = form.category === c.value;
                                            return (
                                                <button
                                                    key={c.value}
                                                    type="button"
                                                    onClick={() => handleCategoryChange(c.value)}
                                                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-xs font-medium ${
                                                        isActive
                                                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                                                            : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:border-muted-foreground/20"
                                                    }`}
                                                >
                                                    <Icon className="h-5 w-5" />
                                                    {c.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {selectedCategory && (
                                        <p className="text-xs text-muted-foreground">{selectedCategory.desc}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2-a. 카테고리별 상세 정보 (VACATION, OVERTIME, BUSINESS_TRIP, EXPENSE) */}
                    {!isDocumentForm && form.category !== "GRANT_APPLICATION" && form.category !== "GENERAL" && (
                        <section>
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                                상세 정보
                            </h2>
                            <div className="p-5 bg-muted/30 rounded-xl border border-dashed">
                                {form.category === "VACATION" && (
                                    <VacationFormFields formData={formData} onChange={setFormData} />
                                )}
                                {form.category === "OVERTIME" && (
                                    <OvertimeFormFields formData={formData} onChange={setFormData} />
                                )}
                            </div>
                        </section>
                    )}

                    {/* 2-b. 품의서 문서형 폼 (GENERAL) */}
                    {form.category === "GENERAL" && (
                        <section>
                            <GeneralFormFields
                                formData={formData}
                                onChange={setFormData}
                                userName={userName}
                                userDepartment={userDepartment}
                            />
                        </section>
                    )}

                    {/* 2-c. 외근/출장 보고서 문서형 폼 (BUSINESS_TRIP) */}
                    {form.category === "BUSINESS_TRIP" && (
                        <section>
                            <BusinessTripDocFormFields
                                formData={formData}
                                onChange={setFormData}
                                userName={userName}
                                userDepartment={userDepartment}
                            />
                        </section>
                    )}

                    {/* 2-c'. 외근/출장 계획서 문서형 폼 (FIELD_WORK_PLAN) */}
                    {form.category === "FIELD_WORK_PLAN" && (
                        <section>
                            <FieldWorkPlanFormFields
                                formData={formData}
                                onChange={setFormData}
                                userName={userName}
                                userDepartment={userDepartment}
                            />
                        </section>
                    )}

                    {/* 2-d. 지출결의서 문서형 폼 (EXPENSE) */}
                    {form.category === "EXPENSE" && (
                        <section>
                            <ExpenseDocFormFields
                                formData={formData}
                                onChange={setFormData}
                                userName={userName}
                                userDepartment={userDepartment}
                            />
                        </section>
                    )}

                    {/* 2-e. 검수조서 문서형 폼 (INSPECTION) */}
                    {form.category === "INSPECTION" && (
                        <section>
                            <InspectionFormFields
                                formData={formData}
                                onChange={setFormData}
                                userName={userName}
                                userDepartment={userDepartment}
                            />
                        </section>
                    )}

                    {/* 2-f. 세금계산서 발행 요청서 (TAX_INVOICE) */}
                    {form.category === "TAX_INVOICE" && (
                        <section>
                            <div className="flex justify-end mb-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    onClick={() => setTaxInvoiceLargeOpen(true)}
                                    className="gap-2 text-base h-11 px-5 border-primary/40 text-primary hover:bg-primary/5"
                                >
                                    <Maximize2 className="h-5 w-5" />
                                    크게 보기 / 편집
                                </Button>
                            </div>
                            <TaxInvoiceFormFields
                                formData={formData}
                                onChange={setFormData}
                                userName={userName}
                                userDepartment={userDepartment}
                            />
                            <TaxInvoiceLargeDialog
                                open={taxInvoiceLargeOpen}
                                onOpenChange={setTaxInvoiceLargeOpen}
                                formData={formData}
                                onChange={setFormData}
                                userName={userName}
                                userDepartment={userDepartment}
                            />
                        </section>
                    )}

                    {/* 2-g. 자금 지출계획서 (EXPENDITURE_PLAN) */}
                    {form.category === "EXPENDITURE_PLAN" && (
                        <section>
                            <ExpenditurePlanFormFields
                                formData={formData}
                                onChange={setFormData}
                                userName={userName}
                                userDepartment={userDepartment}
                            />
                        </section>
                    )}

                    {/* 2-h. 개인경비 사용 청구서 (PERSONAL_EXPENSE) */}
                    {form.category === "PERSONAL_EXPENSE" && (
                        <section>
                            <PersonalExpenseFormFields
                                formData={formData}
                                onChange={setFormData}
                                userName={userName}
                                userDepartment={userDepartment}
                            />
                        </section>
                    )}

                    {/* 3. 제목 & 내용 (문서형 폼이 아닌 경우에만) */}
                    {!isDocumentForm && (
                        <section>
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                                기안 내용
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">제목 *</label>
                                    <Input
                                        placeholder="결재 제목을 입력하세요"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        required
                                        className="text-base"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">사유 / 상세 내용 *</label>
                                    <textarea
                                        placeholder="결재 내용을 작성하세요..."
                                        value={form.content}
                                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                                        required
                                        rows={6}
                                        className="w-full text-sm bg-background border rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {/* 첨부파일 (품의서, 지출결의서, 외근보고서, 정부과제) */}
                    {showAttachments && (
                        <section>
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                                <Paperclip className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                                첨부파일
                            </h2>
                            <div className="p-5 bg-muted/30 rounded-xl border border-dashed space-y-3">
                                <label
                                    className={`flex items-center justify-center gap-2 py-4 px-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                        uploadingFiles
                                            ? "border-muted-foreground/30 bg-muted/50 cursor-wait"
                                            : "border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5"
                                    }`}
                                >
                                    {uploadingFiles ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">업로드 중...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-5 w-5 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">
                                                클릭하여 파일 선택 (다중 선택 가능)
                                            </span>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={uploadingFiles}
                                    />
                                </label>
                                {attachments.length > 0 && (
                                    <div className="space-y-2">
                                        {attachments.map((file, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-3 p-3 bg-background rounded-lg border"
                                            >
                                                <FileIcon className="h-4 w-4 text-blue-500 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAttachment(idx)}
                                                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <p className="text-xs text-muted-foreground text-right">
                                            총 {attachments.length}개 파일
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* 4. 결재자 선택 */}
                    <section>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            결재선 지정
                        </h2>
                        <p className="text-xs text-muted-foreground mb-4">
                            결재자를 순서대로 선택하세요. 선택한 순서대로 결재가 진행됩니다.
                        </p>
                        {ceoAutoRequired && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                                총 금액이 100만원 이상이므로 대표 결재가 자동 추가됩니다.
                            </p>
                        )}
                        <ApproverPicker
                            employees={employees}
                            currentUserId={user.id}
                            selected={approverIds}
                            onToggle={toggleApprover}
                            lockedIds={ceoAutoRequired ? [CEO_ID] : []}
                        />
                    </section>

                    {/* 하단 버튼 */}
                    <div className="flex gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => router.push("/approvals")}
                        >
                            취소
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={isLoading || !canSubmit || approverIds.length === 0}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                    제출 중...
                                </>
                            ) : (
                                "결재 상신"
                            )}
                        </Button>
                    </div>
                </form>
            </main>
        </div>
    );
}

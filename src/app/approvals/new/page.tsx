"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronRight,
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
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { createApprovalRequest } from "@/app/actions/approval";
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
    { value: "BUSINESS_TRIP",     label: "외근보고",    icon: MapPin,     desc: "외근 결과 보고" },
    { value: "EXPENSE",           label: "지출결의",    icon: DollarSign, desc: "지출 내역 정산 및 송금 요청" },
    { value: "GENERAL",           label: "품의서",      icon: FileText,   desc: "구매, 계약 등 일반 품의" },
    { value: "GRANT_APPLICATION", label: "정부과제",    icon: FileText,   desc: "정부과제 신청" },
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

// ─── 외근보고서 (BUSINESS_TRIP) 문서형 폼 ────────────────────────────────────

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

    // 시간 차이 계산
    const calcDuration = (start: string, end: string) => {
        if (!start || !end) return "";
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff <= 0) return "";
        const h = diff / 60;
        return `${h % 1 === 0 ? h : h.toFixed(1)}시간`;
    };

    const duration = calcDuration(formData.tripStartTime || "", formData.tripEndTime || "");

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

                {/* ── 외근 개요 카드 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className={SL}>외근 개요</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 일시 */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">D</div>
                            <div className="flex-1 space-y-1.5">
                                <div className="text-xs text-slate-400 font-medium">외근 일시</div>
                                <input type="date" className={`${DOC_INPUT} text-sm font-medium`} value={formData.tripDate || ""} onChange={(e) => onChange({ ...formData, tripDate: e.target.value })} />
                                <div className="flex items-center gap-1.5">
                                    <input type="time" className={`${DOC_INPUT} text-xs w-24`} value={formData.tripStartTime || ""} onChange={(e) => onChange({ ...formData, tripStartTime: e.target.value })} />
                                    <span className="text-xs text-slate-400">~</span>
                                    <input type="time" className={`${DOC_INPUT} text-xs w-24`} value={formData.tripEndTime || ""} onChange={(e) => onChange({ ...formData, tripEndTime: e.target.value })} />
                                    {duration && <span className="text-xs text-blue-500 font-medium">({duration})</span>}
                                </div>
                            </div>
                        </div>
                        {/* 장소 */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">L</div>
                            <div className="flex-1 space-y-1.5">
                                <div className="text-xs text-slate-400 font-medium">외근 장소</div>
                                <input className={`${DOC_INPUT} text-sm font-medium`} placeholder="주소 또는 장소명" value={formData.location || ""} onChange={(e) => onChange({ ...formData, location: e.target.value })} />
                                <input className={`${DOC_INPUT} text-xs`} placeholder="상세 장소 (건물명 등)" value={formData.locationDetail || ""} onChange={(e) => onChange({ ...formData, locationDetail: e.target.value })} />
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

                {/* ── 외근 목적 ── */}
                <div className="px-6 sm:px-8 mb-6">
                    <div className={SL}>외근 목적</div>
                    <table className="w-full border-collapse text-sm">
                        <tbody>
                            <tr>
                                <th className={`${TH} w-[100px] align-top`}>목 적</th>
                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3">
                                    <textarea
                                        className="w-full border-0 bg-transparent px-1 py-1 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none min-h-[80px]"
                                        placeholder="외근 목적을 작성하세요"
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
                    <div className="flex items-center justify-between mb-3">
                        <div className={SL.replace("mb-3", "mb-0")}>방문 일정</div>
                        {schedules.length < 8 && (
                            <button type="button" onClick={addScheduleRow} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <Plus className="h-3 w-3" /> 행 추가
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto -mx-6 px-6 sm:-mx-8 sm:px-8">
                        <table className="w-full border-collapse text-sm min-w-[640px]">
                            <thead>
                                <tr>
                                    <th className={`${DARK_TH} w-[36px]`}>No.</th>
                                    <th className={`${DARK_TH} w-[130px]`}>시간</th>
                                    <th className={`${DARK_TH} w-[140px]`}>장소 / 대상</th>
                                    <th className={DARK_TH}>수행 내용</th>
                                    <th className={`${DARK_TH} w-[130px]`}>결과</th>
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
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="결과" value={s.result || ""} onChange={(e) => updateSchedule(i, "result", e.target.value)} />
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
                                                <select className={`${DOC_INPUT} text-xs cursor-pointer`} value={exp.category || ""} onChange={(e) => updateTripExpense(i, "category", e.target.value)}>
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
                                                <select className={`${DOC_INPUT} text-xs cursor-pointer`} value={exp.payMethod || "법인카드"} onChange={(e) => updateTripExpense(i, "payMethod", e.target.value)}>
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
                    <p>위와 같이 외근 결과를 보고합니다.</p>
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

const DOC_INPUT = "w-full border-0 border-b border-dashed border-slate-300 dark:border-slate-600 bg-transparent px-1 py-1 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-primary focus:outline-none transition-colors";

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
                                                className={`${DOC_INPUT} cursor-pointer`}
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
            const vat = Math.round(supply * 0.1);
            totalSupply += supply;
            totalVat += vat;
            return { supply, vat };
        });
        return { rows, totalSupply, totalVat, grandTotal: totalSupply + totalVat };
    }, [expenses]);

    const fmt = (n: number) => (n ? n.toLocaleString() : "");

    // ── 지출 내역 행 조작 ──
    const updateExpense = (i: number, field: string, value: string) => {
        const next = expenses.map((e: any, idx: number) => (idx === i ? { ...e, [field]: value } : e));
        onChange({ ...formData, expenses: next });
    };
    const addExpenseRow = () => {
        if (expenses.length >= 10) return;
        onChange({ ...formData, expenses: [...expenses, { date: "", vendor: "", content: "", qty: "", unitPrice: "", note: "" }] });
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
                                    <th className={`${DARK_TH} w-[68px]`}>비고</th>
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
                                            {fmt(calc.rows[i]?.vat)}
                                        </td>
                                        <td className={TD}>
                                            <input className={`${DOC_INPUT} text-xs`} placeholder="" value={exp.note || ""} onChange={(e) => updateExpense(i, "note", e.target.value)} />
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
                        return (
                            <div key={id} className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 text-sm">
                                <span className="text-primary font-bold">{idx + 1}</span>
                                <span className="font-medium">{emp?.name}</span>
                                <button type="button" onClick={() => onToggle(id)}>
                                    <X className="h-3 w-3 text-muted-foreground" />
                                </button>
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

export default function NewApprovalPage() {
    const router = useRouter();
    const user = useStore(useAuthStore, (s) => s.user);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [approverIds, setApproverIds] = useState<string[]>([]);
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
                setFormData({
                    position: "", tripDate: "", tripStartTime: "", tripEndTime: "",
                    location: "", locationDetail: "", visitCompany: "", visitDepartment: "",
                    contactName: "", contactPhone: "", purpose: "", achievements: "",
                    hasExpense: true,
                    schedules: [{ time: "", location: "", content: "", result: "" }],
                    followups: [{ text: "", dueDate: "" }],
                    tripExpenses: [{ category: "", content: "", amount: "", payMethod: "법인카드" }],
                });
                break;
            case "EXPENSE":
                setFormData({
                    position: "", periodStart: "", periodEnd: "", periodLabel: "", linkedDocs: "", remarks: "",
                    accounts: [{ vendor: "", bank: "", accountNo: "", holder: "", amount: "" }],
                    expenses: [{ date: "", vendor: "", content: "", qty: "", unitPrice: "", note: "" }],
                });
                break;
            case "GENERAL":
                setFormData({
                    docTitle: "", position: "", item: "", vendor: "",
                    paymentAmount: "", paymentMethod: "법인카드", paymentDate: "",
                    estimatedCost: "", budgetCategory: "", notes: "", project: "",
                });
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
                return !!(formData.tripDate && formData.location?.trim());
            case "EXPENSE":
                return formData.expenses?.some((e: any) => e.content?.trim() && e.qty && e.unitPrice);
            case "GENERAL":
                return !!formData.docTitle?.trim();
            default:
                return true;
        }
    };

    // GENERAL 품의서: formData → title/content 자동 구성
    const isDocumentForm = form.category === "GENERAL" || form.category === "EXPENSE" || form.category === "BUSINESS_TRIP";

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
                const vat = Math.round(supply * 0.1);
                totalSupply += supply;
                totalVat += vat;
                lines.push(`${i + 1}. ${exp.date || ""} ${exp.vendor || ""} - ${exp.content} (${qty}×${up.toLocaleString()} = 공급가 ${supply.toLocaleString()} + 세액 ${vat.toLocaleString()})`);
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
        if (form.category === "BUSINESS_TRIP") return !!(formData.tripDate && formData.location?.trim());
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
            submitTitle = `외근보고서 - ${formData.visitCompany || formData.location} (${formData.tripDate})`;
            const lines: string[] = [];
            if (formData.tripDate) {
                lines.push(`외근일시: ${formData.tripDate} ${formData.tripStartTime || ""} ~ ${formData.tripEndTime || ""}`);
            }
            if (formData.location) lines.push(`장소: ${formData.location}${formData.locationDetail ? ` (${formData.locationDetail})` : ""}`);
            if (formData.visitCompany) lines.push(`방문기관: ${formData.visitCompany}${formData.visitDepartment ? ` ${formData.visitDepartment}` : ""}`);
            if (formData.contactName) lines.push(`면담자: ${formData.contactName}${formData.contactPhone ? ` (${formData.contactPhone})` : ""}`);
            if (formData.purpose) lines.push(`\n[외근 목적]\n${formData.purpose}`);
            if (formData.schedules?.some((s: any) => s.content?.trim())) {
                lines.push("\n[방문 일정]");
                formData.schedules.forEach((s: any, i: number) => {
                    if (s.content?.trim()) lines.push(`${i + 1}. ${s.time || ""} ${s.location || ""} - ${s.content}${s.result ? ` → ${s.result}` : ""}`);
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
        } else if (form.category === "EXPENSE") {
            const period = formData.periodStart && formData.periodEnd
                ? ` (${formData.periodStart} ~ ${formData.periodEnd}${formData.periodLabel ? " " + formData.periodLabel : ""})`
                : "";
            submitTitle = `지출결의서${period}`;
            submitContent = composeExpenseContent(formData);
        }

        setIsLoading(true);
        try {
            const result = await createApprovalRequest({
                title: submitTitle,
                content: submitContent,
                category: form.category as any,
                requesterId: user.id,
                approverIds,
                formData,
            });
            if (result.success) {
                router.push("/approvals");
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

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
                            onClick={() => router.push("/approvals")}
                            className="gap-1.5"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            돌아가기
                        </Button>
                        <div className="h-5 w-px bg-border" />
                        <h1 className="text-lg font-bold">기안 작성</h1>
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || !canSubmit || approverIds.length === 0}
                        className="gap-1.5"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                제출 중...
                            </>
                        ) : (
                            <>
                                <FilePlus className="h-4 w-4" />
                                결재 상신
                            </>
                        )}
                    </Button>
                </div>
            </header>

            {/* 본문 */}
            <main className="max-w-4xl mx-auto px-6 py-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* 1. 분류 선택 */}
                    <section>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                            분류 선택
                        </h2>
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
                            <p className="text-xs text-muted-foreground mt-2">{selectedCategory.desc}</p>
                        )}
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

                    {/* 2-c. 외근보고서 문서형 폼 (BUSINESS_TRIP) */}
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

                    {/* 4. 결재자 선택 */}
                    <section>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            결재선 지정
                        </h2>
                        <p className="text-xs text-muted-foreground mb-4">
                            결재자를 순서대로 선택하세요. 선택한 순서대로 결재가 진행됩니다.
                        </p>
                        <ApproverPicker
                            employees={employees}
                            currentUserId={user.id}
                            selected={approverIds}
                            onToggle={toggleApprover}
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

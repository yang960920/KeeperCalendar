"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { getTodayAttendance, clockOut } from "@/app/actions/attendance";
import { checkDeviceToken, requestDeviceRegistration } from "@/app/actions/device-auth";
import { requestFieldWork, emergencyFieldClockIn, submitFieldProof } from "@/app/actions/field-work";
import { Clock, LogIn, LogOut, Coffee, ShieldCheck, ShieldAlert, Loader2, Briefcase, MapPin, FileText, Send, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type AttendanceStatus = "NOT_CLOCKED_IN" | "CLOCKED_IN" | "CLOCKED_OUT";
type DeviceStatus = "CHECKING" | "APPROVED" | "PENDING" | "NEED_REGISTRATION" | "AUTO_REGISTERED";

export function WorkClockWidget() {
    const user = useStore(useAuthStore, (s) => s.user);
    const [time, setTime] = useState(new Date());
    const [status, setStatus] = useState<AttendanceStatus>("NOT_CLOCKED_IN");
    const [clockInTime, setClockInTime] = useState<Date | null>(null);
    const [clockOutTimeStr, setClockOutTimeStr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [attendanceId, setAttendanceId] = useState<string | null>(null);
    const [workType, setWorkType] = useState<string>("OFFICE");

    // 기기 인증 상태
    const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>("CHECKING");
    const [deviceLoading, setDeviceLoading] = useState(false);

    // 초기 로딩 상태 (깜빡임 방지용)
    const [initialLoading, setInitialLoading] = useState(true);

    // 외근 관련 상태
    const [showFieldModal, setShowFieldModal] = useState(false);
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [showProofModal, setShowProofModal] = useState(false);
    const [fieldDate, setFieldDate] = useState("");
    const [fieldReason, setFieldReason] = useState("");
    const [emergencyReason, setEmergencyReason] = useState("");
    const [proofText, setProofText] = useState("");
    const [fieldLoading, setFieldLoading] = useState(false);

    // 실시간 시계
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 초기 데이터 패칭 (기기 인증 + 오늘 출퇴근 상태 병렬 조회)
    useEffect(() => {
        if (!user) return;

        let isMounted = true;
        const storedToken = localStorage.getItem("keeper_device_token");

        async function fetchInitialData() {
            try {
                // 병렬 요청: 기기 인증 + 출퇴근 기록
                const [deviceRes, attendanceRes] = await Promise.all([
                    checkDeviceToken(user!.id, storedToken),
                    getTodayAttendance(user!.id),
                ]);

                if (!isMounted) return;

                // 1. 기기 인증 상태 처리
                if (deviceRes.success) {
                    if (deviceRes.status === "AUTO_REGISTERED" && deviceRes.token) {
                        localStorage.setItem("keeper_device_token", deviceRes.token);
                    }
                    setDeviceStatus("APPROVED");
                } else {
                    if (deviceRes.status === "PENDING") {
                        setDeviceStatus("PENDING");
                    } else {
                        setDeviceStatus("NEED_REGISTRATION");
                    }
                }

                // 2. 출퇴근 상태 처리 (기기가 승인되었을 때만 유효함)
                if (deviceRes.success && deviceRes.status !== "PENDING" && attendanceRes.success && attendanceRes.data) {
                    const ci = new Date(attendanceRes.data.clockIn);
                    setClockInTime(ci);
                    setAttendanceId(attendanceRes.data.id);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setWorkType((attendanceRes.data as any).workType || "OFFICE");

                    if (attendanceRes.data.clockOut) {
                        const co = new Date(attendanceRes.data.clockOut);
                        setClockOutTimeStr(co.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
                        setStatus("CLOCKED_OUT");
                    } else {
                        setStatus("CLOCKED_IN");
                    }
                } else {
                    setStatus("NOT_CLOCKED_IN");
                }
            } catch (error) {
                console.error("Failed to fetch widget data:", error);
            } finally {
                if (isMounted) {
                    setInitialLoading(false);
                }
            }
        }

        fetchInitialData();

        return () => {
            isMounted = false;
        };
    }, [user]);

    const handleClockOut = useCallback(async () => {
        if (!user) return;
        // 외근인 경우 증빙 모달 먼저 띄움
        if (workType === "FIELD_PLANNED" || workType === "FIELD_EMERGENCY") {
            setShowProofModal(true);
            return;
        }
        setLoading(true);
        try {
            const res = await clockOut(user.id);
            if (res.success) {
                setStatus("CLOCKED_OUT");
                setClockOutTimeStr(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
            } else {
                alert(res.error);
            }
        } finally {
            setLoading(false);
        }
    }, [user, workType]);

    const handleProofSubmitAndClockOut = useCallback(async () => {
        if (!user || !attendanceId) return;
        setFieldLoading(true);
        try {
            await submitFieldProof(attendanceId, proofText);
            const res = await clockOut(user.id);
            if (res.success) {
                setStatus("CLOCKED_OUT");
                setClockOutTimeStr(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
                setShowProofModal(false);
                setProofText("");
            } else {
                alert(res.error);
            }
        } finally {
            setFieldLoading(false);
        }
    }, [user, attendanceId, proofText]);

    const handleRequestDevice = useCallback(async () => {
        if (!user) return;
        setDeviceLoading(true);
        try {
            const deviceInfo = navigator.userAgent.substring(0, 100);
            const res = await requestDeviceRegistration(user.id, deviceInfo);
            if (res.success && res.token) {
                localStorage.setItem("keeper_device_token", res.token);
                setDeviceStatus("PENDING");
            } else {
                alert("기기 등록 요청에 실패했습니다.");
            }
        } finally {
            setDeviceLoading(false);
        }
    }, [user]);

    const handleFieldRequest = useCallback(async () => {
        if (!user || !fieldDate || !fieldReason.trim()) return;
        setFieldLoading(true);
        try {
            const res = await requestFieldWork(user.id, fieldDate, fieldReason.trim());
            if (res.success) {
                alert("외근 신청이 등록되었습니다. 관리자 승인을 기다려 주세요.");
                setShowFieldModal(false);
                setFieldDate("");
                setFieldReason("");
            } else {
                alert(res.error);
            }
        } finally {
            setFieldLoading(false);
        }
    }, [user, fieldDate, fieldReason]);

    const handleEmergencyClockIn = useCallback(async () => {
        if (!user || !emergencyReason.trim()) return;
        setFieldLoading(true);
        try {
            const res = await emergencyFieldClockIn(user.id, emergencyReason.trim());
            if (res.success && res.data) {
                setClockInTime(new Date(res.data.clockIn));
                setAttendanceId(res.data.id);
                setWorkType("FIELD_EMERGENCY");
                setStatus("CLOCKED_IN");
                setDeviceStatus("APPROVED");
                setShowEmergencyModal(false);
                setEmergencyReason("");
            } else {
                alert(res.error);
            }
        } finally {
            setFieldLoading(false);
        }
    }, [user, emergencyReason]);

    const getElapsedTime = () => {
        if (!clockInTime || status !== "CLOCKED_IN") return null;
        const diffMs = time.getTime() - clockInTime.getTime();
        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        return `${h}시간 ${m}분`;
    };

    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();
    const elapsed = getElapsedTime();

    const hourDeg = ((hours % 12) + minutes / 60) * 30;
    const minDeg = (minutes + seconds / 60) * 6;
    const secDeg = seconds * 6;



    if (initialLoading || deviceStatus === "CHECKING") {
        return (
            <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400 opacity-80" />
                <p className="text-sm text-muted-foreground font-medium">근무 정보 동기화 중...</p>
                <div className="w-32 h-1 bg-muted rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-cyan-400/50 w-1/2 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]" />
                </div>
            </div>
        );
    }

    if (deviceStatus === "NEED_REGISTRATION" || deviceStatus === "PENDING") {
        return (
            <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col h-full relative">
                {showEmergencyModal && (
                    <ModalOverlay onClose={() => setShowEmergencyModal(false)}>
                        <div className="flex items-center gap-2 text-amber-400">
                            <MapPin className="h-4 w-4" />
                            <h4 className="text-sm font-bold">긴급 외근 출근</h4>
                        </div>
                        <p className="text-[11px] text-muted-foreground">현재 시간으로 출근이 기록됩니다.</p>
                        <textarea
                            className="w-full bg-muted border rounded p-2 text-xs resize-none h-16"
                            placeholder="외근 사유 (예: A사 긴급 미팅)"
                            value={emergencyReason}
                            onChange={(e) => setEmergencyReason(e.target.value)}
                        />
                        <Button size="sm" className="w-full text-xs bg-amber-600 hover:bg-amber-700" onClick={handleEmergencyClockIn} disabled={fieldLoading || !emergencyReason.trim()}>
                            {fieldLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                            {fieldLoading ? "처리 중..." : "긴급 외근 출근하기"}
                        </Button>
                    </ModalOverlay>
                )}

                <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-sm font-bold">근무 체크</h3>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                    {deviceStatus === "PENDING" ? (
                        <>
                            <ShieldAlert className="h-12 w-12 text-amber-400 opacity-60" />
                            <p className="text-sm font-medium text-amber-400">기기 승인 대기 중</p>
                            <p className="text-xs text-muted-foreground">
                                관리자의 승인을 기다리고 있습니다.<br />
                                승인 후 이 페이지를 새로고침 하세요.
                            </p>
                        </>
                    ) : (
                        <>
                            <ShieldCheck className="h-10 w-10 text-muted-foreground opacity-40" />
                            <p className="text-sm font-medium">등록되지 않은 기기</p>
                            <p className="text-xs text-muted-foreground">
                                이 기기에서 출퇴근을 사용하려면<br />
                                기기 등록이 필요합니다.
                            </p>
                            <div className="flex flex-col gap-1.5 w-full mt-1">
                                <Button variant="outline" size="sm" onClick={handleRequestDevice} disabled={deviceLoading} className="w-full text-xs">
                                    {deviceLoading ? (<><Loader2 className="h-3 w-3 mr-1 animate-spin" /> 요청 중...</>) : "기기 등록 요청하기"}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setShowEmergencyModal(true)} className="w-full text-xs border-amber-600/50 text-amber-400 hover:bg-amber-600/10">
                                    <MapPin className="h-3 w-3 mr-1" />긴급 외근 출근
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col h-full relative">
            {showFieldModal && (
                <ModalOverlay onClose={() => setShowFieldModal(false)}>
                    <div className="flex items-center gap-2 text-blue-400">
                        <Briefcase className="h-4 w-4" />
                        <h4 className="text-sm font-bold">외근 사전 신청</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground">승인되면 해당 날짜에 자동 출근 처리됩니다.</p>
                    <input type="date" className="w-full bg-muted border rounded p-2 text-xs" value={fieldDate} onChange={(e) => setFieldDate(e.target.value)} min={new Date(Date.now() + 86400000).toISOString().split("T")[0]} />
                    <textarea className="w-full bg-muted border rounded p-2 text-xs resize-none h-16" placeholder="외근 사유 (예: B사 영업 미팅)" value={fieldReason} onChange={(e) => setFieldReason(e.target.value)} />
                    <Button size="sm" className="w-full text-xs" onClick={handleFieldRequest} disabled={fieldLoading || !fieldDate || !fieldReason.trim()}>
                        {fieldLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                        {fieldLoading ? "신청 중..." : "외근 신청하기"}
                    </Button>
                </ModalOverlay>
            )}

            {showProofModal && (
                <ModalOverlay onClose={() => setShowProofModal(false)}>
                    <div className="flex items-center gap-2 text-emerald-400">
                        <FileText className="h-4 w-4" />
                        <h4 className="text-sm font-bold">외근 결과 보고</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground">오늘 외근 활동에 대한 간단한 보고를 작성해 주세요.</p>
                    <textarea className="w-full bg-muted border rounded p-2 text-xs resize-none h-20" placeholder="미팅 결과, 진행 상황 등을 간략히 적어주세요." value={proofText} onChange={(e) => setProofText(e.target.value)} />
                    <Button size="sm" className="w-full text-xs bg-emerald-600 hover:bg-emerald-700" onClick={handleProofSubmitAndClockOut} disabled={fieldLoading || !proofText.trim()}>
                        {fieldLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <LogOut className="h-3 w-3 mr-1" />}
                        {fieldLoading ? "처리 중..." : "보고 제출 및 퇴근하기"}
                    </Button>
                </ModalOverlay>
            )}

            <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold">근무 체크</h3>
                <div className="ml-auto flex items-center gap-1">
                    {(workType === "FIELD_PLANNED" || workType === "FIELD_EMERGENCY") && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-500/20 text-blue-400">
                            {workType === "FIELD_PLANNED" ? "사전외근" : "긴급외근"}
                        </span>
                    )}
                    <StatusBadge status={status} />
                </div>
            </div>

            <div className="flex items-center justify-center gap-4 flex-1">
                <div className="relative">
                    <svg width="120" height="120" viewBox="0 0 120 120" className="drop-shadow-lg">
                        <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/20" />
                        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/10" />
                        {Array.from({ length: 12 }).map((_, i) => {
                            const angle = (i * 30 - 90) * (Math.PI / 180);
                            return <line key={i} x1={60 + 48 * Math.cos(angle)} y1={60 + 48 * Math.sin(angle)} x2={60 + 42 * Math.cos(angle)} y2={60 + 42 * Math.sin(angle)} strokeWidth={i % 3 === 0 ? "2.5" : "1"} className="text-muted-foreground" stroke="currentColor" />;
                        })}
                        {Array.from({ length: 60 }).map((_, i) => {
                            if (i % 5 === 0) return null;
                            const angle = (i * 6 - 90) * (Math.PI / 180);
                            return <line key={`m${i}`} x1={60 + 48 * Math.cos(angle)} y1={60 + 48 * Math.sin(angle)} x2={60 + 46 * Math.cos(angle)} y2={60 + 46 * Math.sin(angle)} strokeWidth="0.5" className="text-muted-foreground/30" stroke="currentColor" />;
                        })}
                        <line x1="60" y1="60" x2={60 + 28 * Math.cos((hourDeg - 90) * (Math.PI / 180))} y2={60 + 28 * Math.sin((hourDeg - 90) * (Math.PI / 180))} strokeWidth="3" strokeLinecap="round" className="text-foreground" stroke="currentColor" />
                        <line x1="60" y1="60" x2={60 + 38 * Math.cos((minDeg - 90) * (Math.PI / 180))} y2={60 + 38 * Math.sin((minDeg - 90) * (Math.PI / 180))} strokeWidth="2" strokeLinecap="round" className="text-foreground" stroke="currentColor" />
                        <line x1="60" y1="60" x2={60 + 42 * Math.cos((secDeg - 90) * (Math.PI / 180))} y2={60 + 42 * Math.sin((secDeg - 90) * (Math.PI / 180))} strokeWidth="1" strokeLinecap="round" className="text-cyan-400" stroke="currentColor" />
                        <circle cx="60" cy="60" r="3" className="fill-cyan-400" />
                        <circle cx="60" cy="60" r="1.5" className="fill-background" />
                    </svg>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                    <div className="text-2xl font-mono font-bold tracking-wider">
                        <span>{String(hours).padStart(2, "0")}</span>
                        <span className="animate-pulse">:</span>
                        <span>{String(minutes).padStart(2, "0")}</span>
                        <span className="text-muted-foreground text-lg">:{String(seconds).padStart(2, "0")}</span>
                    </div>
                    {elapsed && <p className="text-[11px] text-primary/70">근무 {elapsed}</p>}
                    <div className="space-y-0.5 text-[11px] text-muted-foreground">
                        {clockInTime && (
                            <span className="flex items-center gap-1">
                                <LogIn className="h-3 w-3 text-emerald-400" /> 출근 {clockInTime.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                        )}
                        {clockOutTimeStr && (
                            <span className="flex items-center gap-1">
                                <LogOut className="h-3 w-3 text-orange-400" /> 퇴근 {clockOutTimeStr}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-2 space-y-1.5">
                {status === "CLOCKED_IN" && (
                    <Button variant="outline" size="sm" onClick={handleClockOut} disabled={loading} className="w-full text-xs">
                        <LogOut className="h-3 w-3 mr-1" />
                        {loading ? "처리 중..." : (workType !== "OFFICE" ? "외근 보고 & 퇴근" : "퇴근하기")}
                    </Button>
                )}
                {status === "NOT_CLOCKED_IN" && (
                    <div className="w-full text-center text-xs text-muted-foreground">
                        <Coffee className="h-4 w-4 mx-auto mb-1 opacity-50" />
                        로그인 시 자동 출근됩니다
                    </div>
                )}
                {status === "CLOCKED_OUT" && (
                    <div className="w-full text-center text-xs text-emerald-400">✓ 오늘 근무 완료</div>
                )}
                <Button variant="ghost" size="sm" onClick={() => setShowFieldModal(true)} className="w-full text-[11px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-7">
                    <CalendarPlus className="h-3 w-3 mr-1" />
                    외근 사전 신청
                </Button>
            </div>
        </div>
    );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl z-10 flex items-center justify-center p-4" onMouseDown={onClose}>
            <div className="bg-card border rounded-lg p-4 w-full max-w-[280px] space-y-3" onMouseDown={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
    if (status === "CLOCKED_IN") return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">출근 중</span>;
    if (status === "CLOCKED_OUT") return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/20 text-orange-400">퇴근</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-500/20 text-zinc-400">출근 전</span>;
}

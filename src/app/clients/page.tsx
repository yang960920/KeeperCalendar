"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, RotateCcw, Search, Building2, Phone, Mail, MapPin, FileText, User, Camera, IdCard, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import {
    listClients,
    createClient,
    updateClient,
    softDeleteClient,
    restoreClient,
    type ClientInput,
} from "@/app/actions/client";
import { ocrClientFromImage, type OcrMode } from "@/app/actions/client-ocr";

type ClientRow = {
    id: string;
    name: string;
    bizNo: string | null;
    ceoName: string | null;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    memo: string | null;
    deletedAt: string | Date | null;
    createdById: string;
    createdAt: string | Date;
    updatedAt: string | Date;
};

const EMPTY_FORM: ClientInput = {
    name: "",
    bizNo: "",
    ceoName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    memo: "",
};

export default function ClientsPage() {
    const user = useStore(useAuthStore, (s) => s.user);
    const [clients, setClients] = useState<ClientRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [includeDeleted, setIncludeDeleted] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ClientInput>(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // OCR 관련 상태 — 결과는 추가 다이얼로그에 prefill, 출처/경고/검증결과만 따로 보관
    const bizFileRef = useRef<HTMLInputElement | null>(null);
    const cardFileRef = useRef<HTMLInputElement | null>(null);
    const supplementFileRef = useRef<HTMLInputElement | null>(null);
    const [ocrLoading, setOcrLoading] = useState<OcrMode | null>(null);
    const [ocrError, setOcrError] = useState<string | null>(null);
    const [ocrSource, setOcrSource] = useState<OcrMode | null>(null);
    const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);
    const [ocrBrnValid, setOcrBrnValid] = useState<boolean | undefined>(undefined);
    // 보완 흐름: 어느 거래처에 사업자등록증 OCR 결과를 머지할지
    const [supplementTargetId, setSupplementTargetId] = useState<string | null>(null);
    const [supplementLoading, setSupplementLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await listClients({ includeDeleted, q: search });
        if (res.success && res.data) setClients(res.data as any);
        setLoading(false);
    }, [includeDeleted, search]);

    useEffect(() => {
        const t = setTimeout(() => { load(); }, 200);
        return () => clearTimeout(t);
    }, [load]);

    const activeCount = useMemo(() => clients.filter((c) => !c.deletedAt).length, [clients]);

    const resetOcrMeta = () => {
        setOcrSource(null);
        setOcrWarnings([]);
        setOcrBrnValid(undefined);
    };

    const openAddDialog = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormError(null);
        resetOcrMeta();
        setDialogOpen(true);
    };

    const openEditDialog = (c: ClientRow) => {
        setEditingId(c.id);
        setForm({
            name: c.name,
            bizNo: c.bizNo ?? "",
            ceoName: c.ceoName ?? "",
            contactName: c.contactName ?? "",
            email: c.email ?? "",
            phone: c.phone ?? "",
            address: c.address ?? "",
            memo: c.memo ?? "",
        });
        setFormError(null);
        resetOcrMeta();
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!user) return;
        if (!form.name.trim()) {
            setFormError("상호는 필수입니다.");
            return;
        }
        setSubmitting(true);
        setFormError(null);
        try {
            const res = editingId
                ? await updateClient(editingId, form)
                : await createClient(form, user.id);
            if (!res.success) {
                setFormError(res.error || "처리 중 오류가 발생했습니다.");
                return;
            }
            setDialogOpen(false);
            await load();
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (c: ClientRow) => {
        if (!confirm(`"${c.name}" 거래처를 비활성화 처리할까요?\n(목록에서 숨겨지며, 과거 문서 참조는 유지됩니다.)`)) return;
        const res = await softDeleteClient(c.id);
        if (res.success) await load();
        else alert(res.error);
    };

    const handleRestore = async (c: ClientRow) => {
        const res = await restoreClient(c.id);
        if (res.success) await load();
        else alert(res.error);
    };

    // ── OCR 흐름 ──
    const blobToBase64 = (blob: Blob): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                const comma = result.indexOf(",");
                resolve(comma >= 0 ? result.slice(comma + 1) : result);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });

    // 핸드폰 사진은 8~12MB까지 나옴 → OCR엔 과도하니 긴 변 2400px JPEG로 자동 압축.
    // EXIF 회전도 createImageBitmap이 자동 처리. 사용자는 파일 크기 신경 안 써도 됨.
    const resizeImageIfNeeded = async (file: File): Promise<{ data: string; mimeType: string }> => {
        // PDF는 원본 그대로 (Hometax PDF는 본래 작음)
        if (file.type === "application/pdf") {
            return { data: await blobToBase64(file), mimeType: "application/pdf" };
        }
        // 이미지가 아니면 원본 그대로 (서버에서 mimeType 검증으로 거부)
        if (!file.type.startsWith("image/")) {
            return { data: await blobToBase64(file), mimeType: file.type || "application/octet-stream" };
        }

        try {
            const MAX_DIM = 2400;
            const QUALITY = 0.85;
            const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
            let { width, height } = bitmap;
            const longSide = Math.max(width, height);
            if (longSide > MAX_DIM) {
                const scale = MAX_DIM / longSide;
                width = Math.round(width * scale);
                height = Math.round(height * scale);
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas 2D context unavailable");
            ctx.drawImage(bitmap, 0, 0, width, height);
            bitmap.close();
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob 실패"))),
                    "image/jpeg",
                    QUALITY,
                );
            });
            return { data: await blobToBase64(blob), mimeType: "image/jpeg" };
        } catch (e) {
            // 리사이즈 실패 (HEIC 미지원 등) → 원본을 그대로 보냄. 서버에서 받을 수 있으면 처리됨.
            console.warn("Image resize failed, sending original:", e);
            return { data: await blobToBase64(file), mimeType: file.type || "image/jpeg" };
        }
    };

    const handleOcrPick = async (mode: OcrMode, file: File | null) => {
        if (!file) return;
        setOcrError(null);
        setOcrLoading(mode);
        try {
            const { data, mimeType } = await resizeImageIfNeeded(file);
            const res = await ocrClientFromImage(mode, data, mimeType);
            if (!res.success || !res.data) {
                setOcrError(res.error || "이미지 분석에 실패했습니다.");
                return;
            }
            // OCR이 일부만 성공해도 — 보이는 만큼 채워서 추가 폼을 열고, 사용자가 빈칸 채우거나 잘못된 값을 수정
            const r = res.data;
            setEditingId(null);
            setForm({
                name: r.name || "",
                bizNo: r.bizNo || "",
                ceoName: r.ceoName || "",
                contactName: r.contactName || "",
                email: r.email || "",
                phone: r.phone || "",
                address: r.address || "",
                memo: "",
            });
            setFormError(null);
            setOcrSource(mode);
            setOcrWarnings(r.warnings || []);
            setOcrBrnValid(r.brnValid);
            setDialogOpen(true);
        } catch (e: any) {
            setOcrError(e?.message || "이미지 처리 중 오류가 발생했습니다.");
        } finally {
            setOcrLoading(null);
            // 같은 파일 다시 선택 가능하도록 input 초기화
            if (bizFileRef.current) bizFileRef.current.value = "";
            if (cardFileRef.current) cardFileRef.current.value = "";
        }
    };

    // ── 명함으로만 등록된 거래처에 사업자등록증 정보 보완 ──
    const handleSupplementBizClick = (clientId: string) => {
        setSupplementTargetId(clientId);
        setOcrError(null);
        // ref가 mount될 시점 보장 위해 미세 지연
        setTimeout(() => supplementFileRef.current?.click(), 0);
    };

    const handleSupplementPick = async (file: File | null) => {
        if (!file || !supplementTargetId) {
            setSupplementTargetId(null);
            return;
        }
        const target = clients.find((c) => c.id === supplementTargetId);
        if (!target) {
            setSupplementTargetId(null);
            return;
        }
        setOcrError(null);
        setSupplementLoading(true);
        try {
            const { data, mimeType } = await resizeImageIfNeeded(file);
            const res = await ocrClientFromImage("biz", data, mimeType);
            if (!res.success || !res.data) {
                setOcrError(res.error || "이미지 분석에 실패했습니다.");
                return;
            }
            // 기존 거래처 데이터 위에 OCR 결과를 덮어씀 — 빈 필드만 채우고, OCR이 인식한 값은 우선
            // 단 상호(name)는 기존 값을 유지 (사용자가 의도적으로 등록한 명칭이므로)
            const r = res.data;
            setEditingId(target.id);
            setForm({
                name: target.name,
                bizNo: r.bizNo || target.bizNo || "",
                ceoName: r.ceoName || target.ceoName || "",
                contactName: target.contactName || "",
                email: target.email || "",
                phone: target.phone || "",
                address: r.address || target.address || "",
                memo: target.memo || "",
            });
            setFormError(null);
            setOcrSource("biz");
            setOcrWarnings(r.warnings || []);
            setOcrBrnValid(r.brnValid);
            setDialogOpen(true);
        } catch (e: any) {
            setOcrError(e?.message || "이미지 처리 중 오류가 발생했습니다.");
        } finally {
            setSupplementLoading(false);
            setSupplementTargetId(null);
            if (supplementFileRef.current) supplementFileRef.current.value = "";
        }
    };

    const formatBizNo = (raw?: string | null) => {
        if (!raw) return "";
        const digits = raw.replace(/\D/g, "");
        if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
        return raw;
    };

    return (
        <div className="p-6 sm:p-8 max-w-6xl mx-auto">
            <header className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Building2 className="h-6 w-6 text-primary" />
                    거래처 관리
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    거래명세표·세금계산서 발행 시 공급받는자로 사용할 거래처를 관리합니다.
                </p>
            </header>

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="상호, 사업자번호, 대표자, 담당자로 검색"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={includeDeleted}
                        onChange={(e) => setIncludeDeleted(e.target.checked)}
                        className="h-4 w-4 accent-slate-700"
                    />
                    비활성 포함
                </label>
                <Button
                    variant="outline"
                    onClick={() => bizFileRef.current?.click()}
                    disabled={ocrLoading !== null}
                    className="gap-1"
                    title="사업자등록증 PDF 또는 사진으로 자동 등록"
                >
                    {ocrLoading === "biz" ? <Loader2 className="h-4 w-4 animate-spin" /> : <IdCard className="h-4 w-4" />}
                    사업자등록증 (PDF/사진)
                </Button>
                <Button
                    variant="outline"
                    onClick={() => cardFileRef.current?.click()}
                    disabled={ocrLoading !== null}
                    className="gap-1"
                    title="명함 사진으로 자동 등록"
                >
                    {ocrLoading === "card" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    명함
                </Button>
                <Button onClick={openAddDialog} className="gap-1">
                    <Plus className="h-4 w-4" /> 직접 입력
                </Button>
                {/* 사등은 PDF가 기본 — capture 제거하여 모바일에서도 파일 선택 가능 */}
                <input
                    ref={bizFileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => handleOcrPick("biz", e.target.files?.[0] || null)}
                />
                {/* 명함은 실물 촬영이 주 시나리오 — 모바일 후면 카메라 우선 */}
                <input
                    ref={cardFileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleOcrPick("card", e.target.files?.[0] || null)}
                />
                {/* 보완 흐름: 기존 거래처에 사업자등록증 정보 추가 */}
                <input
                    ref={supplementFileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => handleSupplementPick(e.target.files?.[0] || null)}
                />
            </div>

            {ocrError && (
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="flex-1">{ocrError}</div>
                    <button onClick={() => setOcrError(null)} className="text-xs underline">닫기</button>
                </div>
            )}

            <div className="text-xs text-muted-foreground mb-2">
                {loading ? "불러오는 중…" : `활성 ${activeCount}개${includeDeleted ? ` / 전체 ${clients.length}개` : ""}`}
            </div>

            <div className="rounded-xl border overflow-hidden bg-card">
                {loading ? (
                    <div className="p-10 text-center text-sm text-muted-foreground">불러오는 중…</div>
                ) : clients.length === 0 ? (
                    <div className="p-10 text-center text-sm text-muted-foreground">
                        {search ? "검색 결과가 없습니다." : "등록된 거래처가 없습니다. '거래처 추가' 버튼을 눌러 시작하세요."}
                    </div>
                ) : (
                    <ul className="divide-y">
                        {clients.map((c) => {
                            const isDeleted = !!c.deletedAt;
                            return (
                                <li
                                    key={c.id}
                                    className={`p-4 flex flex-wrap items-start gap-4 hover:bg-muted/30 transition-colors ${isDeleted ? "opacity-60" : ""}`}
                                >
                                    <div className="flex-1 min-w-[200px]">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="font-semibold text-base">{c.name}</span>
                                            {isDeleted && <Badge variant="outline" className="text-[10px]">비활성</Badge>}
                                            {c.bizNo ? (
                                                <span className="text-xs text-muted-foreground tabular-nums">
                                                    {formatBizNo(c.bizNo)}
                                                </span>
                                            ) : !isDeleted && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400"
                                                >
                                                    사업자등록증 미등록
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            {c.ceoName && <span className="flex items-center gap-1"><User className="h-3 w-3" />대표 {c.ceoName}</span>}
                                            {c.contactName && <span className="flex items-center gap-1"><User className="h-3 w-3" />담당 {c.contactName}</span>}
                                            {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                                            {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                                            {c.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.address}</span>}
                                        </div>
                                        {c.memo && (
                                            <div className="mt-1 text-xs text-muted-foreground/80 flex items-start gap-1">
                                                <FileText className="h-3 w-3 mt-0.5" />
                                                <span className="whitespace-pre-wrap">{c.memo}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {isDeleted ? (
                                            <Button size="sm" variant="ghost" onClick={() => handleRestore(c)} title="복원">
                                                <RotateCcw className="h-4 w-4" />
                                            </Button>
                                        ) : (
                                            <>
                                                {!c.bizNo && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleSupplementBizClick(c.id)}
                                                        disabled={supplementLoading && supplementTargetId === c.id}
                                                        title="사업자등록증 추가 (PDF/사진)"
                                                    >
                                                        {supplementLoading && supplementTargetId === c.id
                                                            ? <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                                                            : <IdCard className="h-4 w-4 text-amber-600" />}
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="ghost" onClick={() => openEditDialog(c)} title="수정">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => handleDelete(c)} title="비활성 처리">
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) resetOcrMeta();
                }}
            >
                <DialogContent className={ocrSource ? "max-w-2xl" : "max-w-xl"}>
                    <DialogHeader>
                        <DialogTitle className={ocrSource ? "text-2xl" : ""}>
                            {editingId && ocrSource === "biz"
                                ? "사업자등록증으로 보완"
                                : editingId
                                    ? "거래처 수정"
                                    : ocrSource === "biz"
                                        ? "사업자등록증에서 자동으로 읽었습니다"
                                        : ocrSource === "card"
                                            ? "명함에서 자동으로 읽었습니다"
                                            : "거래처 추가"}
                        </DialogTitle>
                        {ocrSource && (
                            <p className="text-base text-muted-foreground mt-1">
                                {editingId
                                    ? "기존 거래처에 사업자등록증 정보를 합칩니다. 확인 후 저장해주세요."
                                    : "내용이 맞는지 확인하고, 빈칸이나 잘못된 부분은 직접 고쳐주세요."}
                            </p>
                        )}
                    </DialogHeader>

                    {ocrSource && ocrWarnings.length > 0 && (
                        <div className="flex items-start gap-3 rounded-lg border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
                            <AlertTriangle className="h-6 w-6 mt-0.5 shrink-0 text-amber-600" />
                            <div className="text-base text-amber-900 dark:text-amber-200 space-y-1">
                                {ocrWarnings.map((w, i) => (
                                    <div key={i}>{w}</div>
                                ))}
                                <div className="text-sm mt-1">아래 입력란에서 직접 채우거나 고쳐주세요.</div>
                            </div>
                        </div>
                    )}

                    {ocrSource === "biz" && ocrBrnValid === true && (
                        <div className="flex items-center gap-2 rounded-lg border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-4 py-3">
                            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                            <div className="text-base text-emerald-900 dark:text-emerald-200 font-medium">
                                사업자번호 검증 통과
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                        <div className="sm:col-span-2">
                            <Label className={ocrSource ? "text-base" : ""}>상호 <span className="text-red-500">*</span></Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="주식회사 ○○"
                                autoFocus
                                className={ocrSource ? "text-lg h-11" : ""}
                            />
                        </div>
                        <div>
                            <Label className={ocrSource ? "text-base" : ""}>사업자번호</Label>
                            <Input
                                value={form.bizNo || ""}
                                onChange={(e) => setForm({ ...form, bizNo: e.target.value })}
                                placeholder="123-45-67890"
                                className={ocrSource ? "text-lg h-11" : ""}
                            />
                        </div>
                        <div>
                            <Label className={ocrSource ? "text-base" : ""}>대표자</Label>
                            <Input
                                value={form.ceoName || ""}
                                onChange={(e) => setForm({ ...form, ceoName: e.target.value })}
                                className={ocrSource ? "text-lg h-11" : ""}
                            />
                        </div>
                        <div>
                            <Label className={ocrSource ? "text-base" : ""}>담당자</Label>
                            <Input
                                value={form.contactName || ""}
                                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                                className={ocrSource ? "text-lg h-11" : ""}
                            />
                        </div>
                        <div>
                            <Label className={ocrSource ? "text-base" : ""}>전화</Label>
                            <Input
                                value={form.phone || ""}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                placeholder="010-0000-0000"
                                className={ocrSource ? "text-lg h-11" : ""}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <Label className={ocrSource ? "text-base" : ""}>이메일</Label>
                            <Input
                                type="email"
                                value={form.email || ""}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="contact@example.com"
                                className={ocrSource ? "text-lg h-11" : ""}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <Label className={ocrSource ? "text-base" : ""}>주소</Label>
                            <Input
                                value={form.address || ""}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                className={ocrSource ? "text-lg h-11" : ""}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <Label className={ocrSource ? "text-base" : ""}>메모</Label>
                            <Textarea
                                value={form.memo || ""}
                                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                                rows={2}
                                placeholder="특이사항, 결제조건 등"
                                className={ocrSource ? "text-lg" : ""}
                            />
                        </div>
                    </div>
                    {formError && (
                        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 px-3 py-2 rounded">
                            {formError}
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setDialogOpen(false)}
                            className={ocrSource ? "text-base h-11" : ""}
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || !form.name.trim()}
                            className={ocrSource ? "text-base h-11" : ""}
                        >
                            {submitting ? "저장 중…" : editingId ? "수정" : "등록"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

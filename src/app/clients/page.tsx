"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, RotateCcw, Search, Building2, Phone, Mail, MapPin, FileText, User } from "lucide-react";
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

    const openAddDialog = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormError(null);
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
                <Button onClick={openAddDialog} className="gap-1">
                    <Plus className="h-4 w-4" /> 거래처 추가
                </Button>
            </div>

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
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-base">{c.name}</span>
                                            {isDeleted && <Badge variant="outline" className="text-[10px]">비활성</Badge>}
                                            {c.bizNo && (
                                                <span className="text-xs text-muted-foreground tabular-nums">
                                                    {formatBizNo(c.bizNo)}
                                                </span>
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

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "거래처 수정" : "거래처 추가"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                        <div className="sm:col-span-2">
                            <Label>상호 <span className="text-red-500">*</span></Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="주식회사 ○○"
                                autoFocus
                            />
                        </div>
                        <div>
                            <Label>사업자번호</Label>
                            <Input
                                value={form.bizNo || ""}
                                onChange={(e) => setForm({ ...form, bizNo: e.target.value })}
                                placeholder="123-45-67890"
                            />
                        </div>
                        <div>
                            <Label>대표자</Label>
                            <Input
                                value={form.ceoName || ""}
                                onChange={(e) => setForm({ ...form, ceoName: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>담당자</Label>
                            <Input
                                value={form.contactName || ""}
                                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>전화</Label>
                            <Input
                                value={form.phone || ""}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                placeholder="010-0000-0000"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <Label>이메일</Label>
                            <Input
                                type="email"
                                value={form.email || ""}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="contact@example.com"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <Label>주소</Label>
                            <Input
                                value={form.address || ""}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <Label>메모</Label>
                            <Textarea
                                value={form.memo || ""}
                                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                                rows={2}
                                placeholder="특이사항, 결제조건 등"
                            />
                        </div>
                    </div>
                    {formError && (
                        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 px-3 py-2 rounded">
                            {formError}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>취소</Button>
                        <Button onClick={handleSubmit} disabled={submitting || !form.name.trim()}>
                            {submitting ? "저장 중…" : editingId ? "수정" : "등록"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, ChevronDown, ChevronRight, Sparkles, Loader2, Package, Truck, Building2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { listClients } from "@/app/actions/client";
import { createStatement, type TsItemInput } from "@/app/actions/transaction-statement";
import { prefillStatement } from "@/app/actions/ts-ai-prefill";

type ClientRow = {
    id: string;
    name: string;
    bizNo: string | null;
    ceoName: string | null;
    address: string | null;
    email: string | null;
};

type Row = TsItemInput & { _id: string };

const genId = () => Math.random().toString(36).slice(2, 9);

function makeProductRow(): Row {
    return { _id: genId(), type: "PRODUCT", name: "", qty: undefined, unitPrice: undefined };
}
function makeFreightRow(): Row {
    return { _id: genId(), type: "FREIGHT", name: "운임", supply: undefined };
}

const DOC_INPUT = "w-full border-0 border-b border-dashed border-slate-300 dark:border-slate-600 bg-transparent px-1 py-1 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none transition-colors";

function Accordion({ title, icon, children, open, onToggle, badge }: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    open: boolean;
    onToggle: () => void;
    badge?: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
            >
                <div className="text-primary">{icon}</div>
                <span className="font-medium">{title}</span>
                {badge && <span className="ml-2">{badge}</span>}
                <div className="ml-auto text-muted-foreground">
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
            </button>
            {open && <div className="px-5 pb-5 pt-1 border-t">{children}</div>}
        </div>
    );
}

export default function NewStatementPage() {
    const router = useRouter();
    const user = useStore(useAuthStore, (s) => s.user);

    const [clients, setClients] = useState<ClientRow[]>([]);
    const [clientId, setClientId] = useState<string>("");
    const [clientSearch, setClientSearch] = useState("");
    const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [clientPerson, setClientPerson] = useState<string>("");
    const [memo, setMemo] = useState<string>("");
    const [rows, setRows] = useState<Row[]>([makeProductRow()]);

    const [openClient, setOpenClient] = useState(true);
    const [openMeta, setOpenMeta] = useState(true);
    const [openItems, setOpenItems] = useState(true);
    const [openMemo, setOpenMemo] = useState(false);

    const [aiText, setAiText] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiBanner, setAiBanner] = useState<string | null>(null);
    const [aiUnmatchedClient, setAiUnmatchedClient] = useState<string | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        listClients().then((res) => {
            if (res.success && res.data) setClients(res.data as any);
        });
    }, []);

    const selectedClient = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);

    const filteredClients = useMemo(() => {
        if (!clientSearch.trim()) return clients;
        const q = clientSearch.toLowerCase();
        return clients.filter(
            (c) => c.name.toLowerCase().includes(q) || (c.bizNo || "").includes(q) || (c.ceoName || "").toLowerCase().includes(q)
        );
    }, [clients, clientSearch]);

    // 각 행 계산
    const calcRow = (r: Row): { supply: number; vat: number } => {
        if (r.type === "FREIGHT") {
            const supply = Math.round(Number(r.supply) || 0);
            return { supply, vat: Math.round(supply * 0.1) };
        }
        const qty = Number(r.qty) || 0;
        const up = Number(r.unitPrice) || 0;
        const supply = Math.round(qty * up);
        return { supply, vat: Math.round(supply * 0.1) };
    };

    const totals = useMemo(() => {
        let s = 0, v = 0;
        for (const r of rows) {
            const c = calcRow(r);
            s += c.supply;
            v += c.vat;
        }
        return { supply: s, vat: v, sum: s + v };
    }, [rows]);

    const updateRow = (id: string, field: keyof TsItemInput, value: any) => {
        setRows((prev) => prev.map((r) => (r._id === id ? { ...r, [field]: value } : r)));
    };
    const removeRow = (id: string) => setRows((prev) => prev.length > 1 ? prev.filter((r) => r._id !== id) : prev);

    const handleAiPrefill = async () => {
        if (!aiText.trim() || aiLoading) return;
        setAiLoading(true);
        setAiBanner(null);
        setAiUnmatchedClient(null);
        try {
            const res = await prefillStatement(aiText);
            if (!res.success || !res.data) {
                setAiBanner(res.error || "AI 분석에 실패했습니다.");
                return;
            }
            const d = res.data;
            if (d.issueDate) setIssueDate(d.issueDate);
            if (d.clientPerson) setClientPerson(d.clientPerson);
            if (d.memo) setMemo(d.memo);

            // 거래처 매칭 (정확 일치 우선, 부분 일치 차선)
            if (d.clientNameHint) {
                const hint = d.clientNameHint.trim();
                const exact = clients.find((c) => c.name === hint);
                const partial = !exact ? clients.find((c) => c.name.includes(hint) || hint.includes(c.name)) : null;
                const matched = exact || partial;
                if (matched) {
                    setClientId(matched.id);
                    setAiUnmatchedClient(null);
                } else {
                    setAiUnmatchedClient(hint);
                }
            }

            // 행 치환
            if (d.items?.length) {
                setRows(d.items.map((it) => ({
                    _id: genId(),
                    type: it.type,
                    date: it.date,
                    name: it.name || (it.type === "FREIGHT" ? "운임" : ""),
                    spec: it.spec,
                    qty: it.qty,
                    unitPrice: it.unitPrice,
                    supply: it.supply,
                    note: it.note,
                })));
            }
            setAiBanner("AI가 작성한 내용을 아래에서 확인·수정해주세요.");
            setOpenItems(true);
            setOpenClient(true);
        } finally {
            setAiLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!user) return;
        setSubmitError(null);

        if (!clientId) { setSubmitError("거래처를 선택하세요."); setOpenClient(true); return; }
        if (!issueDate) { setSubmitError("일자를 선택하세요."); setOpenMeta(true); return; }
        const validRows = rows.filter((r) => r.type === "FREIGHT" ? (r.supply || 0) > 0 : (r.name?.trim() && (r.qty || 0) > 0 && (r.unitPrice || 0) > 0));
        if (validRows.length === 0) { setSubmitError("내역을 1행 이상 입력하세요."); setOpenItems(true); return; }

        setSubmitting(true);
        try {
            const res = await createStatement({
                issueDate,
                clientId,
                clientPerson: clientPerson || null,
                items: rows.map(({ _id, ...rest }) => rest),
                memo: memo || null,
            }, user.id);
            if (!res.success) {
                setSubmitError(res.error || "저장 중 오류가 발생했습니다.");
                return;
            }
            const created: any = res.data;
            router.push(`/transaction-statements/${created.id}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 sm:p-8 max-w-5xl mx-auto pb-24">
            <header className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">거래명세표 작성</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    AI에게 한 줄 요약을 주고 자동 채운 뒤 수정하거나, 직접 입력할 수 있습니다.
                </p>
            </header>

            {/* AI 러프 입력 */}
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h2 className="font-medium text-sm">빠른 입력 (AI 자동 채움)</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                    예: "어제 파주월드건축자재에 1면준불연PF 50T*1000*1200*94 112.8장 장당 8,100원에 공급, 방성리현장 운임 120,000원 별도. 인수자 임순복대표님"
                </p>
                <div className="flex gap-2">
                    <Textarea
                        className="flex-1 min-h-[72px]"
                        value={aiText}
                        onChange={(e) => setAiText(e.target.value)}
                        placeholder="거래 내용을 한두 문장으로 자유롭게 입력"
                    />
                    <Button
                        type="button"
                        onClick={handleAiPrefill}
                        disabled={aiLoading || !aiText.trim()}
                        className="h-[72px] gap-1 self-stretch"
                    >
                        {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        자동 채움
                    </Button>
                </div>
            </div>

            {aiBanner && (
                <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{aiBanner}</span>
                </div>
            )}
            {aiUnmatchedClient && (
                <div className="mb-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-4 py-3 text-sm text-rose-800 dark:text-rose-200 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                        "{aiUnmatchedClient}" 거래처가 목록에 없습니다. 먼저{" "}
                        <Link href="/clients" className="underline font-medium" target="_blank">거래처 관리</Link>에서 등록한 뒤 새로고침하여 다시 시도하세요.
                    </span>
                </div>
            )}

            <div className="space-y-4">
                {/* 거래처 선택 */}
                <Accordion
                    title="거래처 (공급받는자)"
                    icon={<Building2 className="h-5 w-5" />}
                    open={openClient}
                    onToggle={() => setOpenClient(!openClient)}
                    badge={selectedClient && <Badge variant="outline" className="text-xs">{selectedClient.name}</Badge>}
                >
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                        <Input
                            placeholder="거래처 검색 (상호·사업자번호·대표자)"
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            className="max-w-md"
                        />
                        <Link href="/clients" target="_blank" className="text-xs text-primary hover:underline">
                            + 새 거래처 등록
                        </Link>
                    </div>
                    <div className="max-h-60 overflow-y-auto rounded border">
                        {filteredClients.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">검색 결과 없음</div>
                        ) : (
                            <ul className="divide-y">
                                {filteredClients.map((c) => (
                                    <li
                                        key={c.id}
                                        onClick={() => setClientId(c.id)}
                                        className={`p-3 cursor-pointer hover:bg-muted/50 flex items-start gap-3 ${clientId === c.id ? "bg-primary/10 border-l-4 border-primary" : ""}`}
                                    >
                                        <input type="radio" checked={clientId === c.id} onChange={() => setClientId(c.id)} className="mt-1" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm">{c.name}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                {c.bizNo && <span>{c.bizNo} · </span>}
                                                {c.ceoName && <span>대표 {c.ceoName} · </span>}
                                                {c.address && <span className="truncate">{c.address}</span>}
                                            </div>
                                            {c.email && <div className="text-xs text-muted-foreground mt-0.5">{c.email}</div>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </Accordion>

                {/* 발행 정보 */}
                <Accordion
                    title="발행 정보"
                    icon={<Building2 className="h-5 w-5" />}
                    open={openMeta}
                    onToggle={() => setOpenMeta(!openMeta)}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label>일자</Label>
                            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                        </div>
                        <div>
                            <Label>인수자</Label>
                            <Input value={clientPerson} onChange={(e) => setClientPerson(e.target.value)} placeholder="예: 임순복대표님" />
                        </div>
                    </div>
                </Accordion>

                {/* 내역 */}
                <Accordion
                    title="내역 (품목 / 운임)"
                    icon={<Package className="h-5 w-5" />}
                    open={openItems}
                    onToggle={() => setOpenItems(!openItems)}
                    badge={<Badge variant="outline" className="text-xs">{rows.length}행</Badge>}
                >
                    <div className="flex gap-2 mb-3">
                        <Button type="button" size="sm" variant="outline" onClick={() => setRows([...rows, makeProductRow()])} className="gap-1">
                            <Package className="h-3 w-3" /> 품목 추가
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setRows([...rows, makeFreightRow()])} className="gap-1">
                            <Truck className="h-3 w-3" /> 운임 추가
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-800 text-white text-xs">
                                    <th className="px-2 py-2 border border-slate-700 w-[70px]">구분</th>
                                    <th className="px-2 py-2 border border-slate-700 w-[70px]">월일</th>
                                    <th className="px-2 py-2 border border-slate-700">품명 / 규격</th>
                                    <th className="px-2 py-2 border border-slate-700 w-[70px]">수량</th>
                                    <th className="px-2 py-2 border border-slate-700 w-[90px]">단가</th>
                                    <th className="px-2 py-2 border border-slate-700 w-[100px]">공급가액</th>
                                    <th className="px-2 py-2 border border-slate-700 w-[90px]">세액</th>
                                    <th className="px-2 py-2 border border-slate-700 w-[90px]">비고</th>
                                    <th className="px-2 py-2 border border-slate-700 w-[30px]"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => {
                                    const c = calcRow(r);
                                    const isFreight = r.type === "FREIGHT";
                                    return (
                                        <tr key={r._id} className="border-b">
                                            <td className="border px-1 py-1 text-center">
                                                <Badge variant={isFreight ? "secondary" : "outline"} className="text-[10px]">
                                                    {isFreight ? "운임" : "품목"}
                                                </Badge>
                                            </td>
                                            <td className="border px-1 py-1">
                                                <input className={`${DOC_INPUT} text-xs text-center`} placeholder="M/D" value={r.date || ""} onChange={(e) => updateRow(r._id, "date", e.target.value)} />
                                            </td>
                                            <td className="border px-1 py-1">
                                                {isFreight ? (
                                                    <input className={`${DOC_INPUT} text-xs`} placeholder="운임" value={r.name || ""} onChange={(e) => updateRow(r._id, "name", e.target.value)} />
                                                ) : (
                                                    <div className="flex gap-1">
                                                        <input className={`${DOC_INPUT} text-xs flex-1`} placeholder="품명" value={r.name || ""} onChange={(e) => updateRow(r._id, "name", e.target.value)} />
                                                        <input className={`${DOC_INPUT} text-xs flex-1`} placeholder="규격" value={r.spec || ""} onChange={(e) => updateRow(r._id, "spec", e.target.value)} />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="border px-1 py-1">
                                                <input
                                                    className={`${DOC_INPUT} text-xs text-right`}
                                                    type="number"
                                                    step="0.01"
                                                    placeholder={isFreight ? "—" : "0"}
                                                    value={r.qty ?? ""}
                                                    disabled={isFreight}
                                                    onChange={(e) => updateRow(r._id, "qty", e.target.value === "" ? undefined : Number(e.target.value))}
                                                />
                                            </td>
                                            <td className="border px-1 py-1">
                                                <input
                                                    className={`${DOC_INPUT} text-xs text-right`}
                                                    type="number"
                                                    placeholder={isFreight ? "—" : "0"}
                                                    value={r.unitPrice ?? ""}
                                                    disabled={isFreight}
                                                    onChange={(e) => updateRow(r._id, "unitPrice", e.target.value === "" ? undefined : Number(e.target.value))}
                                                />
                                            </td>
                                            <td className="border px-1 py-1 text-right tabular-nums text-xs">
                                                {isFreight ? (
                                                    <input
                                                        className={`${DOC_INPUT} text-xs text-right`}
                                                        type="number"
                                                        placeholder="0"
                                                        value={r.supply ?? ""}
                                                        onChange={(e) => updateRow(r._id, "supply", e.target.value === "" ? undefined : Number(e.target.value))}
                                                    />
                                                ) : (
                                                    c.supply ? c.supply.toLocaleString() : ""
                                                )}
                                            </td>
                                            <td className="border px-1 py-1 text-right tabular-nums text-xs text-muted-foreground">
                                                {c.vat ? c.vat.toLocaleString() : ""}
                                            </td>
                                            <td className="border px-1 py-1">
                                                <input className={`${DOC_INPUT} text-xs`} placeholder="" value={r.note || ""} onChange={(e) => updateRow(r._id, "note", e.target.value)} />
                                            </td>
                                            <td className="border px-1 py-1 text-center">
                                                {rows.length > 1 && (
                                                    <button type="button" onClick={() => removeRow(r._id)} className="text-slate-400 hover:text-red-500">
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                <tr className="bg-slate-100 dark:bg-slate-800 font-semibold">
                                    <td colSpan={5} className="border px-2 py-2 text-right">합 계</td>
                                    <td className="border px-2 py-2 text-right tabular-nums">{totals.supply.toLocaleString()}</td>
                                    <td className="border px-2 py-2 text-right tabular-nums">{totals.vat.toLocaleString()}</td>
                                    <td colSpan={2} className="border px-2 py-2 text-right tabular-nums">
                                        {totals.sum.toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </Accordion>

                {/* 메모 */}
                <Accordion
                    title="메모"
                    icon={<Package className="h-5 w-5" />}
                    open={openMemo}
                    onToggle={() => setOpenMemo(!openMemo)}
                >
                    <Textarea
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        rows={3}
                        placeholder="하단에 표시될 메모 (선택)"
                    />
                </Accordion>
            </div>

            {submitError && (
                <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    {submitError}
                </div>
            )}

            <div className="fixed bottom-0 left-64 right-0 bg-background/95 backdrop-blur border-t px-6 py-4 flex justify-between items-center z-10">
                <div className="text-sm">
                    <span className="text-muted-foreground">합계 (VAT 포함): </span>
                    <span className="text-lg font-bold tabular-nums">₩{totals.sum.toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => router.back()}>취소</Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                        저장하고 PDF 미리보기
                    </Button>
                </div>
            </div>
        </div>
    );
}

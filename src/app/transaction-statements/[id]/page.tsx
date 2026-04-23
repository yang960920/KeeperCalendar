"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Mail, Trash2, Loader2, CheckCircle2, AlertTriangle, Send, Plus, X, FileCheck2 } from "lucide-react";
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
import {
    getStatement,
    generateStatementPdf,
    sendStatementEmail,
    deleteStatement,
    createTaxInvoiceFromStatement,
} from "@/app/actions/transaction-statement";

type StatementDetail = {
    id: string;
    docNo: string;
    issueDate: string;
    clientId: string;
    clientPerson: string | null;
    items: any[];
    totalSupply: number;
    totalVat: number;
    totalSum: number;
    memo: string | null;
    emailSentAt: string | null;
    emailSentTo: string | null;
    linkedApprovalId: string | null;
    createdAt: string;
    client: { id: string; name: string; email: string | null; bizNo: string | null; ceoName: string | null; address: string | null } | null;
};

export default function StatementDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = params.id;

    const [data, setData] = useState<StatementDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [downloading, setDownloading] = useState(false);
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [linkingTax, setLinkingTax] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await getStatement(id);
        if (res.success && res.data) setData(res.data as any);
        else setError(res.error || "불러오지 못했습니다.");
        setLoading(false);
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const handleDownload = async () => {
        if (!data) return;
        setDownloading(true);
        try {
            const res = await generateStatementPdf(data.id);
            if (!res.success || !res.pdfBase64 || !res.filename) {
                alert(res.error || "PDF 생성 실패");
                return;
            }
            const byteChars = atob(res.pdfBase64);
            const bytes = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
            const blob = new Blob([bytes], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = res.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } finally {
            setDownloading(false);
        }
    };

    const handleLinkToTaxInvoice = async () => {
        if (!data) return;
        if (!confirm(`"${data.client?.name || "거래처"}" 건으로 세금계산서 발행 요청서를 생성하고\n진호열·변진순에게 결재 요청을 보낼까요?`)) return;
        setLinkingTax(true);
        try {
            const res = await createTaxInvoiceFromStatement(data.id);
            if (!res.success) {
                alert(res.error || "생성 실패");
                return;
            }
            await load();
        } finally {
            setLinkingTax(false);
        }
    };

    const handleDelete = async () => {
        if (!data) return;
        if (!confirm(`거래명세표 ${data.docNo}를 삭제할까요? 되돌릴 수 없습니다.`)) return;
        const res = await deleteStatement(data.id);
        if (res.success) router.push("/transaction-statements");
        else alert(res.error);
    };

    if (loading) return <div className="p-10 text-center text-sm text-muted-foreground">불러오는 중…</div>;
    if (error || !data) return <div className="p-10 text-center text-sm text-red-500">{error}</div>;

    return (
        <div className="p-6 sm:p-8 max-w-5xl mx-auto">
            <header className="mb-6">
                <Link href="/transaction-statements" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
                    <ArrowLeft className="h-3 w-3" /> 거래명세표 목록
                </Link>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                            <span>거래명세표</span>
                            <Badge variant="outline" className="tabular-nums">{data.docNo}</Badge>
                        </h1>
                        <div className="text-sm text-muted-foreground mt-1">
                            {new Date(data.issueDate).toISOString().slice(0, 10)} · {data.client?.name || "(거래처 미지정)"}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                        <Button variant="outline" onClick={handleDownload} disabled={downloading} className="gap-1">
                            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            PDF 다운로드
                        </Button>
                        <Button onClick={() => setEmailDialogOpen(true)} variant="outline" className="gap-1">
                            <Mail className="h-4 w-4" /> 이메일 발송
                        </Button>
                        {!data.linkedApprovalId && (
                            <Button onClick={handleLinkToTaxInvoice} disabled={linkingTax} className="gap-1">
                                {linkingTax ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                                세금계산서 발행 요청
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* 상태 배너 */}
            {data.emailSentAt && (
                <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-200 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                        <div className="font-medium">이메일 발송 완료</div>
                        <div className="text-xs mt-0.5">{new Date(data.emailSentAt).toLocaleString()} · 수신자: {data.emailSentTo}</div>
                    </div>
                </div>
            )}
            {data.linkedApprovalId && (
                <div className="mb-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4" />
                    <span>세금계산서 발행 요청서가 생성되었습니다.</span>
                    <Link href={`/approvals`} className="underline font-medium ml-auto">전자결재 이동</Link>
                </div>
            )}

            {/* 요약 섹션 */}
            <div className="rounded-xl border bg-card p-6 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">공급받는자</div>
                        <div className="font-medium">{data.client?.name || "-"}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                            {data.client?.bizNo && <div>{data.client.bizNo}</div>}
                            {data.client?.ceoName && <div>대표 {data.client.ceoName}</div>}
                            {data.client?.email && <div>{data.client.email}</div>}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">인수자</div>
                        <div className="font-medium">{data.clientPerson || "-"}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">합계 (VAT 포함)</div>
                        <div className="text-2xl font-bold tabular-nums">₩{data.totalSum.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                            공급가 {data.totalSupply.toLocaleString()} + 세액 {data.totalVat.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm min-w-[700px]">
                        <thead className="bg-slate-800 text-white text-xs">
                            <tr>
                                <th className="px-2 py-2 border border-slate-700 w-[70px]">구분</th>
                                <th className="px-2 py-2 border border-slate-700 w-[70px]">월일</th>
                                <th className="px-2 py-2 border border-slate-700">품명 / 규격</th>
                                <th className="px-2 py-2 border border-slate-700 w-[70px]">수량</th>
                                <th className="px-2 py-2 border border-slate-700 w-[90px]">단가</th>
                                <th className="px-2 py-2 border border-slate-700 w-[100px]">공급가액</th>
                                <th className="px-2 py-2 border border-slate-700 w-[90px]">세액</th>
                                <th className="px-2 py-2 border border-slate-700 w-[100px]">비고</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.items || []).map((it: any, i: number) => (
                                <tr key={i} className="border-b">
                                    <td className="border px-2 py-2 text-center">
                                        <Badge variant={it.type === "FREIGHT" ? "secondary" : "outline"} className="text-[10px]">
                                            {it.type === "FREIGHT" ? "운임" : "품목"}
                                        </Badge>
                                    </td>
                                    <td className="border px-2 py-2 text-center text-xs">{it.date || ""}</td>
                                    <td className="border px-2 py-2 text-xs">{[it.name, it.spec].filter(Boolean).join(" ")}</td>
                                    <td className="border px-2 py-2 text-right tabular-nums text-xs">{it.qty ? it.qty : ""}</td>
                                    <td className="border px-2 py-2 text-right tabular-nums text-xs">{it.unitPrice ? it.unitPrice.toLocaleString() : ""}</td>
                                    <td className="border px-2 py-2 text-right tabular-nums text-xs">{it.supply ? it.supply.toLocaleString() : ""}</td>
                                    <td className="border px-2 py-2 text-right tabular-nums text-xs text-muted-foreground">{it.vat ? it.vat.toLocaleString() : ""}</td>
                                    <td className="border px-2 py-2 text-xs">{it.note || ""}</td>
                                </tr>
                            ))}
                            <tr className="bg-slate-100 dark:bg-slate-800 font-semibold">
                                <td colSpan={5} className="border px-2 py-2 text-right">합 계</td>
                                <td className="border px-2 py-2 text-right tabular-nums">{data.totalSupply.toLocaleString()}</td>
                                <td className="border px-2 py-2 text-right tabular-nums">{data.totalVat.toLocaleString()}</td>
                                <td className="border px-2 py-2 text-right tabular-nums">{data.totalSum.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {data.memo && (
                    <div className="mt-4 rounded-md bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap">
                        <span className="text-xs text-muted-foreground mr-2">메모</span>
                        {data.memo}
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <Button variant="ghost" onClick={handleDelete} className="text-red-500 gap-1">
                    <Trash2 className="h-4 w-4" /> 삭제
                </Button>
            </div>

            <EmailDialog
                open={emailDialogOpen}
                onOpenChange={setEmailDialogOpen}
                statement={data}
                onSent={async () => { setEmailDialogOpen(false); await load(); }}
            />
        </div>
    );
}

function EmailDialog({
    open, onOpenChange, statement, onSent,
}: {
    open: boolean;
    onOpenChange: (b: boolean) => void;
    statement: StatementDetail;
    onSent: () => void;
}) {
    const [recipients, setRecipients] = useState<string[]>([]);
    const [newEmail, setNewEmail] = useState("");
    const [cc, setCc] = useState<string[]>([]);
    const [newCc, setNewCc] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            // 초기: 거래처 이메일이 있으면 프리필
            setRecipients(statement.client?.email ? [statement.client.email] : []);
            setCc([]);
            setNewEmail("");
            setNewCc("");
            setSubject("");
            setMessage("");
            setErr(null);
        }
    }, [open, statement.client?.email]);

    const addRecipient = () => {
        const e = newEmail.trim();
        if (!e) return;
        if (!/.+@.+\..+/.test(e)) { setErr("이메일 형식이 올바르지 않습니다."); return; }
        if (recipients.includes(e)) return;
        setRecipients([...recipients, e]);
        setNewEmail("");
        setErr(null);
    };
    const addCc = () => {
        const e = newCc.trim();
        if (!e) return;
        if (!/.+@.+\..+/.test(e)) { setErr("이메일 형식이 올바르지 않습니다."); return; }
        if (cc.includes(e)) return;
        setCc([...cc, e]);
        setNewCc("");
        setErr(null);
    };

    const handleSend = async () => {
        if (recipients.length === 0) { setErr("수신자를 1명 이상 입력하세요."); return; }
        setSending(true);
        setErr(null);
        try {
            const res = await sendStatementEmail({
                statementId: statement.id,
                to: recipients,
                cc: cc.length ? cc : undefined,
                subjectOverride: subject || undefined,
                messageOverride: message || undefined,
            });
            if (!res.success) {
                setErr(res.error || "발송 실패");
                return;
            }
            onSent();
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>이메일 발송</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <div>
                        <Label>수신자 (필수)</Label>
                        <div className="flex flex-wrap gap-1 mt-1 mb-2">
                            {recipients.map((e) => (
                                <Badge key={e} variant="outline" className="gap-1 text-xs">
                                    {e}
                                    <button onClick={() => setRecipients(recipients.filter((x) => x !== e))}><X className="h-3 w-3" /></button>
                                </Badge>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="email@example.com"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }}
                            />
                            <Button type="button" variant="outline" onClick={addRecipient} size="sm"><Plus className="h-4 w-4" /></Button>
                        </div>
                        {!statement.client?.email && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                                거래처에 이메일이 등록돼 있지 않습니다. 직접 입력해주세요.
                            </p>
                        )}
                    </div>
                    <div>
                        <Label>참조 (CC)</Label>
                        <div className="flex flex-wrap gap-1 mt-1 mb-2">
                            {cc.map((e) => (
                                <Badge key={e} variant="outline" className="gap-1 text-xs">
                                    {e}
                                    <button onClick={() => setCc(cc.filter((x) => x !== e))}><X className="h-3 w-3" /></button>
                                </Badge>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="cc@example.com"
                                value={newCc}
                                onChange={(e) => setNewCc(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCc(); } }}
                            />
                            <Button type="button" variant="outline" onClick={addCc} size="sm"><Plus className="h-4 w-4" /></Button>
                        </div>
                    </div>
                    <div>
                        <Label>제목 (비워두면 기본값)</Label>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder={`[한미르㈜] 거래명세표 (${statement.docNo})`}
                        />
                    </div>
                    <div>
                        <Label>추가 메시지 (선택)</Label>
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="본문 상단에 표시될 안내 문구"
                            rows={3}
                        />
                    </div>
                    {err && (
                        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 px-3 py-2 rounded flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5" />
                            <span>{err}</span>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
                    <Button onClick={handleSend} disabled={sending || recipients.length === 0} className="gap-1">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        발송
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

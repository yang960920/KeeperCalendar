"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, FileText, Mail, Calendar, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listStatements } from "@/app/actions/transaction-statement";

type StatementRow = {
    id: string;
    docNo: string;
    issueDate: string | Date;
    clientId: string;
    client: { id: string; name: string; bizNo: string | null } | null;
    clientPerson: string | null;
    totalSum: number;
    emailSentAt: string | Date | null;
    linkedApprovalId: string | null;
    createdAt: string | Date;
};

export default function StatementsPage() {
    const [items, setItems] = useState<StatementRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        const res = await listStatements({ q: search });
        if (res.success && res.data) setItems(res.data as any);
        setLoading(false);
    }, [search]);

    useEffect(() => {
        const t = setTimeout(() => load(), 200);
        return () => clearTimeout(t);
    }, [load]);

    const formatDate = (d: string | Date) => {
        try { return new Date(d).toISOString().slice(0, 10); } catch { return String(d); }
    };

    return (
        <div className="p-6 sm:p-8 max-w-6xl mx-auto">
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <FileText className="h-6 w-6 text-primary" />
                        거래명세표
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        공급받는자에게 보내는 거래명세표를 작성·발송·보관합니다.
                    </p>
                </div>
                <Link href="/transaction-statements/new">
                    <Button className="gap-1"><Plus className="h-4 w-4" /> 새 거래명세표</Button>
                </Link>
            </header>

            <div className="mb-4 relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="문서번호·메모 검색"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-sm text-muted-foreground">불러오는 중…</div>
                ) : items.length === 0 ? (
                    <div className="p-10 text-center text-sm text-muted-foreground">
                        {search ? "검색 결과가 없습니다." : "작성된 거래명세표가 없습니다."}
                    </div>
                ) : (
                    <ul className="divide-y">
                        {items.map((s) => (
                            <li key={s.id}>
                                <Link
                                    href={`/transaction-statements/${s.id}`}
                                    className="block p-4 hover:bg-muted/30 transition-colors"
                                >
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Badge variant="outline" className="tabular-nums">{s.docNo}</Badge>
                                        <span className="font-medium">{s.client?.name || "(거래처 미지정)"}</span>
                                        {s.clientPerson && <span className="text-xs text-muted-foreground">인수자 {s.clientPerson}</span>}
                                        <span className="ml-auto text-base font-bold tabular-nums">₩{Number(s.totalSum).toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(s.issueDate)}</span>
                                        {s.emailSentAt && (
                                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                <Mail className="h-3 w-3" />
                                                {formatDate(s.emailSentAt)} 발송
                                            </span>
                                        )}
                                        {s.linkedApprovalId && (
                                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                                <Building2 className="h-3 w-3" />세금계산서 발행요청 연결
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

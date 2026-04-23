"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import nodemailer from "nodemailer";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { TransactionStatementPdf, type TsItem, type TsPdfData } from "@/lib/transaction-statement/pdf-template";
import { COMPANY_PROFILE, DEFAULT_TAX_APPROVER_IDS } from "@/lib/company-profile";
import { createApprovalRequest } from "@/app/actions/approval";

// ─── 타입 ──────────────────────────────────────────────────────────────────────

export type TsItemInput = {
    type: "PRODUCT" | "FREIGHT";
    date?: string;
    name: string;
    spec?: string;
    qty?: number | null;
    unitPrice?: number | null;
    supply?: number | null; // FREIGHT는 직접 입력
    note?: string;
};

export interface TransactionStatementInput {
    issueDate: string; // YYYY-MM-DD
    clientId: string;
    clientPerson?: string | null;
    items: TsItemInput[];
    memo?: string | null;
}

// ─── 채번 ──────────────────────────────────────────────────────────────────────

async function getNextDocNo(year: number): Promise<string> {
    // upsert + 원자적 증가 보장
    const counter = await prisma.transactionStatementCounter.upsert({
        where: { year },
        update: { lastSeq: { increment: 1 } },
        create: { year, lastSeq: 1 },
    });
    const seq = String(counter.lastSeq).padStart(4, "0");
    return `${year}-${seq}`;
}

// ─── 계산 유틸 ─────────────────────────────────────────────────────────────────

function computeRow(input: TsItemInput): TsItem {
    if (input.type === "FREIGHT") {
        const supply = Math.round(Number(input.supply) || 0);
        const vat = Math.round(supply * 0.1);
        return {
            type: "FREIGHT",
            date: input.date,
            name: input.name?.trim() || "운임",
            qty: 1,
            unitPrice: undefined,
            supply,
            vat,
            note: input.note,
        };
    }
    const qty = Number(input.qty) || 0;
    const up = Number(input.unitPrice) || 0;
    const supply = Math.round(qty * up);
    const vat = Math.round(supply * 0.1);
    return {
        type: "PRODUCT",
        date: input.date,
        name: input.name?.trim() || "",
        spec: input.spec?.trim() || undefined,
        qty,
        unitPrice: up,
        supply,
        vat,
        note: input.note,
    };
}

function computeTotals(items: TsItem[]) {
    let totalSupply = 0;
    let totalVat = 0;
    for (const it of items) {
        totalSupply += it.supply;
        totalVat += it.vat;
    }
    return { totalSupply, totalVat, totalSum: totalSupply + totalVat };
}

// ─── 조회 ──────────────────────────────────────────────────────────────────────

export async function listStatements(options?: { q?: string }) {
    noStore();
    try {
        const where: any = {};
        if (options?.q?.trim()) {
            const q = options.q.trim();
            where.OR = [
                { docNo: { contains: q } },
                { memo: { contains: q, mode: "insensitive" } },
            ];
        }
        const items = await prisma.transactionStatement.findMany({
            where,
            orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
            take: 200,
        });
        // 거래처 정보 조인
        const clientIds = Array.from(new Set(items.map((i) => i.clientId)));
        const clients = clientIds.length
            ? await prisma.client.findMany({ where: { id: { in: clientIds } } })
            : [];
        const clientMap = new Map(clients.map((c) => [c.id, c]));
        return {
            success: true,
            data: items.map((i) => ({ ...i, client: clientMap.get(i.clientId) || null })),
        };
    } catch (error) {
        console.error("Error listing statements:", error);
        return { success: false, error: "거래명세표 목록을 불러오지 못했습니다." };
    }
}

export async function getStatement(id: string) {
    noStore();
    try {
        const stmt = await prisma.transactionStatement.findUnique({ where: { id } });
        if (!stmt) return { success: false, error: "거래명세표를 찾을 수 없습니다." };
        const client = await prisma.client.findUnique({ where: { id: stmt.clientId } });
        return { success: true, data: { ...stmt, client } };
    } catch (error) {
        console.error("Error getting statement:", error);
        return { success: false, error: "거래명세표 조회 중 오류가 발생했습니다." };
    }
}

// ─── 생성 / 수정 ───────────────────────────────────────────────────────────────

export async function createStatement(input: TransactionStatementInput, createdById: string) {
    try {
        if (!input.clientId) return { success: false, error: "거래처를 선택하세요." };
        if (!input.issueDate) return { success: false, error: "일자를 입력하세요." };
        if (!input.items?.length) return { success: false, error: "내역을 1행 이상 입력하세요." };

        const client = await prisma.client.findUnique({ where: { id: input.clientId } });
        if (!client) return { success: false, error: "거래처를 찾을 수 없습니다." };

        const rows = input.items.filter((x) => x.name?.trim() || x.supply).map(computeRow);
        if (rows.length === 0) return { success: false, error: "내역 행 중 유효한 것이 없습니다." };
        const totals = computeTotals(rows);

        const year = new Date(input.issueDate).getFullYear();
        const docNo = await getNextDocNo(year);

        const created = await prisma.transactionStatement.create({
            data: {
                docNo,
                issueDate: new Date(input.issueDate),
                clientId: input.clientId,
                clientPerson: input.clientPerson?.trim() || null,
                items: rows as any,
                totalSupply: totals.totalSupply,
                totalVat: totals.totalVat,
                totalSum: totals.totalSum,
                memo: input.memo?.trim() || null,
                createdById,
            },
        });
        revalidatePath("/transaction-statements");
        return { success: true, data: created };
    } catch (error) {
        console.error("Error creating statement:", error);
        return { success: false, error: "거래명세표 생성 중 오류가 발생했습니다." };
    }
}

export async function updateStatement(id: string, input: TransactionStatementInput) {
    try {
        const existing = await prisma.transactionStatement.findUnique({ where: { id } });
        if (!existing) return { success: false, error: "거래명세표를 찾을 수 없습니다." };

        const rows = input.items.filter((x) => x.name?.trim() || x.supply).map(computeRow);
        if (rows.length === 0) return { success: false, error: "내역 행 중 유효한 것이 없습니다." };
        const totals = computeTotals(rows);

        const updated = await prisma.transactionStatement.update({
            where: { id },
            data: {
                issueDate: new Date(input.issueDate),
                clientId: input.clientId,
                clientPerson: input.clientPerson?.trim() || null,
                items: rows as any,
                totalSupply: totals.totalSupply,
                totalVat: totals.totalVat,
                totalSum: totals.totalSum,
                memo: input.memo?.trim() || null,
            },
        });
        revalidatePath("/transaction-statements");
        revalidatePath(`/transaction-statements/${id}`);
        return { success: true, data: updated };
    } catch (error) {
        console.error("Error updating statement:", error);
        return { success: false, error: "거래명세표 수정 중 오류가 발생했습니다." };
    }
}

export async function deleteStatement(id: string) {
    try {
        await prisma.transactionStatement.delete({ where: { id } });
        revalidatePath("/transaction-statements");
        return { success: true };
    } catch (error) {
        console.error("Error deleting statement:", error);
        return { success: false, error: "거래명세표 삭제 중 오류가 발생했습니다." };
    }
}

// ─── PDF 생성 (Buffer) ─────────────────────────────────────────────────────────

async function buildPdfBuffer(stmtId: string): Promise<{ buffer: Buffer; filename: string; data: TsPdfData }> {
    const res = await getStatement(stmtId);
    if (!res.success || !res.data) throw new Error(res.error || "거래명세표 조회 실패");
    const stmt = res.data;
    const client = (stmt as any).client;
    if (!client) throw new Error("거래처 정보를 찾을 수 없습니다.");

    const items = (stmt.items as unknown as TsItem[]) || [];
    const data: TsPdfData = {
        docNo: stmt.docNo,
        issueDate: new Date(stmt.issueDate).toISOString().slice(0, 10),
        client: {
            name: client.name,
            ceoName: client.ceoName,
            address: client.address,
            bizNo: client.bizNo,
        },
        clientPerson: stmt.clientPerson || "",
        items,
        totalSupply: stmt.totalSupply,
        totalVat: stmt.totalVat,
        totalSum: stmt.totalSum,
        memo: stmt.memo || "",
    };

    const buffer = await renderToBuffer(
        React.createElement(TransactionStatementPdf, { data }) as any
    );
    const safeClient = client.name.replace(/[<>:"/\\|?*\n\r]/g, "_").slice(0, 40);
    const filename = `거래명세표_${stmt.docNo}_${safeClient}.pdf`;
    return { buffer, filename, data };
}

export async function generateStatementPdf(stmtId: string): Promise<{ success: boolean; pdfBase64?: string; filename?: string; error?: string }> {
    try {
        const { buffer, filename } = await buildPdfBuffer(stmtId);
        return {
            success: true,
            pdfBase64: buffer.toString("base64"),
            filename,
        };
    } catch (error: any) {
        console.error("Error generating PDF:", error);
        return { success: false, error: error?.message || "PDF 생성 실패" };
    }
}

// ─── 이메일 발송 ────────────────────────────────────────────────────────────────

export interface SendEmailInput {
    statementId: string;
    to: string[]; // 수신자 이메일 배열
    cc?: string[];
    subjectOverride?: string;
    messageOverride?: string;
}

export async function sendStatementEmail(input: SendEmailInput) {
    try {
        if (!input.to?.length) return { success: false, error: "수신자 이메일이 필요합니다." };
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            return { success: false, error: "이메일 환경변수(EMAIL_USER/PASS)가 설정되지 않았습니다." };
        }

        const { buffer, filename, data } = await buildPdfBuffer(input.statementId);

        const subject = input.subjectOverride?.trim()
            || `[${COMPANY_PROFILE.name}] 거래명세표 (${data.docNo})`;
        const htmlBody = buildStatementEmailHtml(data, input.messageOverride);

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || "smtps.hiworks.com",
            port: parseInt(process.env.EMAIL_PORT || "465"),
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || `"${COMPANY_PROFILE.name}" <${process.env.EMAIL_USER}>`,
            to: input.to.join(", "),
            cc: input.cc?.length ? input.cc.join(", ") : undefined,
            subject,
            html: htmlBody,
            attachments: [
                {
                    filename,
                    content: buffer,
                    contentType: "application/pdf",
                },
            ],
        });

        await prisma.transactionStatement.update({
            where: { id: input.statementId },
            data: {
                emailSentAt: new Date(),
                emailSentTo: [...input.to, ...(input.cc || [])].join(", "),
            },
        });

        revalidatePath(`/transaction-statements/${input.statementId}`);
        return { success: true, data: { messageId: info.messageId } };
    } catch (error: any) {
        console.error("Error sending email:", error);
        return { success: false, error: error?.message || "이메일 발송 실패" };
    }
}

function buildStatementEmailHtml(data: TsPdfData, customMessage?: string) {
    const customBlock = customMessage?.trim()
        ? `<div style="background:#fefce8;border-left:3px solid #eab308;padding:12px 16px;margin-bottom:16px;border-radius:4px;white-space:pre-wrap;font-size:13px;color:#713f12;">${escapeHtml(customMessage.trim())}</div>`
        : "";

    return `
    <div style="font-family:'Malgun Gothic',sans-serif;max-width:640px;margin:0 auto;padding:20px;">
        <div style="background:#1e293b;color:#fff;padding:18px 22px;border-radius:6px 6px 0 0;">
            <h2 style="margin:0;font-size:17px;letter-spacing:1px;">거래명세표 송부</h2>
            <p style="margin:4px 0 0;color:#cbd5e1;font-size:12px;">문서번호 ${data.docNo}</p>
        </div>
        <div style="background:#f8fafc;padding:20px 22px;border:1px solid #e2e8f0;">
            <p style="margin:0 0 14px;color:#334155;font-size:13px;">
                ${escapeHtml(data.client.name)} 귀하,<br/>
                거래명세표를 첨부하여 송부드립니다. 내용 확인 부탁드립니다.
            </p>
            ${customBlock}
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <tr>
                    <td style="padding:6px 10px;background:#fff;border:1px solid #e2e8f0;width:110px;color:#64748b;">공급자</td>
                    <td style="padding:6px 10px;background:#fff;border:1px solid #e2e8f0;">${escapeHtml(COMPANY_PROFILE.name)} / ${escapeHtml(COMPANY_PROFILE.ceoName)}</td>
                </tr>
                <tr>
                    <td style="padding:6px 10px;background:#fff;border:1px solid #e2e8f0;color:#64748b;">일자</td>
                    <td style="padding:6px 10px;background:#fff;border:1px solid #e2e8f0;">${data.issueDate}</td>
                </tr>
                <tr>
                    <td style="padding:6px 10px;background:#fff;border:1px solid #e2e8f0;color:#64748b;">합계 (VAT 포함)</td>
                    <td style="padding:6px 10px;background:#fff;border:1px solid #e2e8f0;font-weight:700;">₩ ${data.totalSum.toLocaleString()}</td>
                </tr>
            </table>
        </div>
        <div style="padding:16px 22px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 6px 6px;background:#fff;">
            <p style="margin:0;color:#64748b;font-size:11px;">본 메일은 ${escapeHtml(COMPANY_PROFILE.name)}에서 발송되었습니다. 문의: ${escapeHtml(COMPANY_PROFILE.contactPhone)}</p>
        </div>
    </div>`;
}

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}

// ─── 세금계산서 발행 요청서 연결 (Phase 2) ─────────────────────────────────────

export async function createTaxInvoiceFromStatement(statementId: string) {
    try {
        const res = await getStatement(statementId);
        if (!res.success || !res.data) return { success: false, error: res.error || "거래명세표 조회 실패" };
        const stmt = res.data as any;
        const client = stmt.client;
        if (!client) return { success: false, error: "거래처 정보가 없습니다." };

        if (stmt.linkedApprovalId) {
            return { success: false, error: "이미 세금계산서 발행 요청서가 생성되어 있습니다." };
        }

        const issueDateStr = new Date(stmt.issueDate).toISOString().slice(0, 10);
        const items: TsItem[] = (stmt.items || []) as TsItem[];

        const taxItems = items.map((it) => {
            if (it.type === "FREIGHT") {
                return {
                    company: client.name,
                    date: it.date || issueDateStr,
                    product: it.name || "운임",
                    qty: 1,
                    unitPrice: it.supply,
                    note: it.note || "운임",
                };
            }
            return {
                company: client.name,
                date: it.date || issueDateStr,
                product: [it.name, it.spec].filter(Boolean).join(" / "),
                qty: it.qty || 0,
                unitPrice: it.unitPrice || 0,
                note: it.note || "",
            };
        });

        const formData = {
            issueDate: issueDateStr,
            taxItems,
            manager: "",
            managerContact: "",
            linkedTransactionStatementId: stmt.id,
            linkedTransactionStatementDocNo: stmt.docNo,
        };

        const title = `세금계산서 발행 요청서 - ${client.name} (${stmt.docNo})`;

        const lines: string[] = [];
        lines.push(`발행일자: ${issueDateStr}`);
        lines.push(`연결 거래명세표: ${stmt.docNo}`);
        lines.push("");
        lines.push("[발행 내역]");
        items.forEach((it, i) => {
            const name = it.type === "FREIGHT" ? (it.name || "운임") : [it.name, it.spec].filter(Boolean).join(" ");
            const q = it.type === "FREIGHT" ? 1 : (it.qty || 0);
            const up = it.type === "FREIGHT" ? (it.supply || 0) : (it.unitPrice || 0);
            lines.push(`${i + 1}. ${it.date || issueDateStr} / ${client.name} / ${name} / 수량:${q} / 단가:${up.toLocaleString()} / 공급가:${it.supply.toLocaleString()} / 부가세:${it.vat.toLocaleString()}`);
        });
        lines.push("");
        lines.push(`합계: 공급가 ${stmt.totalSupply.toLocaleString()} + 부가세 ${stmt.totalVat.toLocaleString()} = ₩${stmt.totalSum.toLocaleString()}`);

        const content = lines.join("\n");

        // createApprovalRequest는 세션에서 requesterId를 취득하므로 여기서 넘길 필요 없음
        const createRes = await createApprovalRequest({
            title,
            content,
            category: "TAX_INVOICE",
            requesterId: "", // 서버에서 세션으로 덮어씀
            approverIds: [...DEFAULT_TAX_APPROVER_IDS],
            formData,
        });

        if (!createRes.success || !createRes.data) {
            return { success: false, error: createRes.error || "세금계산서 발행 요청서 생성 실패" };
        }

        await prisma.transactionStatement.update({
            where: { id: statementId },
            data: { linkedApprovalId: createRes.data.id },
        });

        revalidatePath(`/transaction-statements/${statementId}`);
        revalidatePath("/approvals");
        return { success: true, data: { approvalId: createRes.data.id } };
    } catch (error: any) {
        console.error("Error linking to tax invoice:", error);
        return { success: false, error: error?.message || "세금계산서 발행 요청서 생성 중 오류" };
    }
}

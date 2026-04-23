import React from "react";
import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import path from "path";
import { COMPANY_PROFILE } from "@/lib/company-profile";

// 한글 폰트 (기존 report와 동일 소스 재사용)
const fontPath = path.join(process.cwd(), "public/fonts/NotoSansKR-Variable.ttf");
try {
    Font.register({
        family: "NotoSansKR",
        fonts: [
            { src: fontPath, fontWeight: 400 },
            { src: fontPath, fontWeight: 700 },
        ],
    });
} catch {
    /* ignore re-register */
}

export interface TsItem {
    type: "PRODUCT" | "FREIGHT";
    date?: string; // "3/5" 형태 또는 빈값
    name: string; // 품명 (운임의 경우 "운임")
    spec?: string; // 규격 (품목용)
    qty?: number;
    unitPrice?: number;
    supply: number;
    vat: number;
    note?: string;
}

export interface TsPdfData {
    docNo: string;
    issueDate: string; // YYYY-MM-DD or ""
    client: {
        name: string;
        ceoName?: string | null;
        address?: string | null;
        bizNo?: string | null;
    };
    clientPerson?: string;
    items: TsItem[];
    totalSupply: number;
    totalVat: number;
    totalSum: number;
    memo?: string;
}

const styles = StyleSheet.create({
    page: {
        fontFamily: "NotoSansKR",
        fontSize: 9,
        padding: 28,
        color: "#1a1a1a",
    },
    copyTag: {
        fontSize: 9,
        fontWeight: 700,
        marginBottom: 4,
    },
    outerBox: {
        borderWidth: 1.5,
        borderColor: "#000",
    },
    // 최상단 (제목 + 메타 영역)
    topRow: {
        flexDirection: "row",
        alignItems: "stretch",
    },
    titleCell: {
        width: 200,
        borderRightWidth: 1,
        borderRightColor: "#000",
        padding: 10,
        justifyContent: "center",
    },
    titleText: {
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: 4,
    },
    metaWrap: {
        flex: 1,
        flexDirection: "row",
    },
    metaLabelCell: {
        width: 44,
        backgroundColor: "#f3f4f6",
        padding: 6,
        borderRightWidth: 1,
        borderRightColor: "#000",
        justifyContent: "center",
        alignItems: "center",
    },
    metaLabelText: { fontSize: 9, fontWeight: 700 },
    metaValueCell: {
        flex: 1,
        padding: 6,
        borderRightWidth: 1,
        borderRightColor: "#000",
        justifyContent: "center",
    },
    metaValueCellLast: {
        flex: 1,
        padding: 6,
        justifyContent: "center",
    },
    metaStack: {
        flex: 1,
        flexDirection: "column",
    },
    metaStackRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#000",
        flex: 1,
    },
    metaStackRowLast: {
        flexDirection: "row",
        flex: 1,
    },
    // 공급자 / 공급받는자 헤더
    partyHeader: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: "#000",
    },
    partyHeaderCell: {
        flex: 1,
        padding: 5,
        alignItems: "center",
        fontWeight: 700,
    },
    partyHeaderCellDiv: {
        borderLeftWidth: 1,
        borderLeftColor: "#000",
    },
    partyHeaderText: { fontSize: 10, fontWeight: 700 },
    // 공급자 / 공급받는자 정보 2-col 병렬
    partyBody: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: "#000",
    },
    partyHalf: {
        flex: 1,
    },
    partyHalfDiv: {
        borderLeftWidth: 1,
        borderLeftColor: "#000",
    },
    partyRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#000",
    },
    partyRowLast: {
        flexDirection: "row",
    },
    partyLabel: {
        width: 42,
        padding: 5,
        backgroundColor: "#f3f4f6",
        borderRightWidth: 1,
        borderRightColor: "#000",
        alignItems: "center",
        justifyContent: "center",
    },
    partyLabelText: { fontSize: 9, fontWeight: 700 },
    partyValue: {
        flex: 1,
        padding: 5,
        justifyContent: "center",
    },
    partyValueWithInnerLabel: {
        flex: 1,
        flexDirection: "row",
        borderRightWidth: 0,
    },
    partyInnerLabel: {
        width: 42,
        padding: 5,
        backgroundColor: "#f3f4f6",
        borderLeftWidth: 1,
        borderLeftColor: "#000",
        borderRightWidth: 1,
        borderRightColor: "#000",
        alignItems: "center",
        justifyContent: "center",
    },
    partyInnerValue: {
        flex: 1,
        padding: 5,
        justifyContent: "center",
    },
    partyValueText: { fontSize: 9 },
    // 테이블
    table: {
        borderTopWidth: 1,
        borderTopColor: "#000",
    },
    th: {
        flexDirection: "row",
        backgroundColor: "#f3f4f6",
    },
    thCell: {
        padding: 5,
        borderRightWidth: 1,
        borderRightColor: "#000",
        alignItems: "center",
        justifyContent: "center",
    },
    thCellLast: {
        padding: 5,
        alignItems: "center",
        justifyContent: "center",
    },
    thText: { fontSize: 9, fontWeight: 700 },
    tr: {
        flexDirection: "row",
        borderTopWidth: 0.5,
        borderTopColor: "#000",
    },
    td: {
        padding: 5,
        borderRightWidth: 1,
        borderRightColor: "#000",
        justifyContent: "center",
    },
    tdLast: {
        padding: 5,
        justifyContent: "center",
    },
    tdText: { fontSize: 9 },
    tdTextRight: { fontSize: 9, textAlign: "right" },
    tdTextCenter: { fontSize: 9, textAlign: "center" },
    // 합계 행
    totalRow: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: "#000",
        backgroundColor: "#f9fafb",
    },
    totalLabel: {
        padding: 5,
        borderRightWidth: 1,
        borderRightColor: "#000",
        alignItems: "center",
        justifyContent: "center",
    },
    totalLabelText: { fontSize: 10, fontWeight: 700 },
    memoRow: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: "#000",
    },
    memoLabel: {
        width: 42,
        padding: 6,
        backgroundColor: "#f3f4f6",
        borderRightWidth: 1,
        borderRightColor: "#000",
        alignItems: "center",
        justifyContent: "center",
    },
    memoValue: { flex: 1, padding: 6, minHeight: 26 },
});

// ── 컬럼 비율 (공급자 / 공급받는자 공통) ──
// 월일 / 품명·규격 / 수량 / 장당단가 / 공급가액 / 세액 / 비고
const COLS = {
    date: 38,
    name: 0, // flex
    qty: 46,
    unitPrice: 58,
    supply: 70,
    vat: 60,
    note: 76,
};

const fmt = (n?: number | null) => {
    if (n === undefined || n === null || n === 0) return "";
    try { return Number(n).toLocaleString(); } catch { return String(n); }
};

// 행을 최소 N개까지 빈 행으로 채움 (예시와 동일하게 표 높이 확보)
function padRows(items: TsItem[], min: number): (TsItem | null)[] {
    const out: (TsItem | null)[] = [...items];
    while (out.length < min) out.push(null);
    return out;
}

interface CopyProps {
    data: TsPdfData;
    copyLabel: string; // "공급 받는 자 보관용" 또는 "공급자 보관용"
    accent: string; // 외곽선 색상
}

const StatementCopy: React.FC<CopyProps> = ({ data, copyLabel, accent }) => {
    const rows = padRows(data.items, 15);

    const issueDateDisplay = data.issueDate
        ? `${data.issueDate.slice(0, 4)}-${data.issueDate.slice(5, 7)}-${data.issueDate.slice(8, 10)}`
        : "";

    return (
        <View>
            <Text style={[styles.copyTag, { color: accent }]}>
                {"<" + copyLabel + ">"}
            </Text>
            <View style={[styles.outerBox, { borderColor: accent }]}>
                {/* 상단: 제목 + 메타 */}
                <View style={styles.topRow}>
                    <View style={styles.titleCell}>
                        <Text style={styles.titleText}>거래명세표</Text>
                    </View>
                    <View style={styles.metaWrap}>
                        <View style={styles.metaStack}>
                            {/* 1행: 일자 / No */}
                            <View style={styles.metaStackRow}>
                                <View style={styles.metaLabelCell}><Text style={styles.metaLabelText}>일자</Text></View>
                                <View style={styles.metaValueCell}><Text style={styles.partyValueText}>{issueDateDisplay}</Text></View>
                                <View style={styles.metaLabelCell}><Text style={styles.metaLabelText}>No</Text></View>
                                <View style={styles.metaValueCellLast}><Text style={styles.partyValueText}>{data.docNo}</Text></View>
                            </View>
                            {/* 2행: 공급자 연락처 */}
                            <View style={styles.metaStackRowLast}>
                                <View style={styles.metaLabelCell}>
                                    <Text style={styles.metaLabelText}>공급자</Text>
                                    <Text style={styles.metaLabelText}>연락처</Text>
                                </View>
                                <View style={styles.metaValueCellLast}><Text style={styles.partyValueText}>{COMPANY_PROFILE.contactPhone}</Text></View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 공급자 / 공급받는자 헤더 */}
                <View style={styles.partyHeader}>
                    <View style={styles.partyHeaderCell}><Text style={styles.partyHeaderText}>공급자</Text></View>
                    <View style={[styles.partyHeaderCell, styles.partyHeaderCellDiv]}><Text style={styles.partyHeaderText}>공급 받는 자</Text></View>
                </View>

                {/* 공급자 / 공급받는자 정보 */}
                <View style={styles.partyBody}>
                    {/* 공급자 (한미르) */}
                    <View style={styles.partyHalf}>
                        <View style={styles.partyRow}>
                            <View style={styles.partyLabel}><Text style={styles.partyLabelText}>상호</Text></View>
                            <View style={styles.partyInnerValue}><Text style={styles.partyValueText}>{COMPANY_PROFILE.name}</Text></View>
                            <View style={styles.partyInnerLabel}><Text style={styles.partyLabelText}>성명</Text></View>
                            <View style={styles.partyInnerValue}><Text style={styles.partyValueText}>{COMPANY_PROFILE.ceoName}</Text></View>
                        </View>
                        <View style={styles.partyRow}>
                            <View style={styles.partyLabel}><Text style={styles.partyLabelText}>주소</Text></View>
                            <View style={styles.partyValue}><Text style={styles.partyValueText}>{COMPANY_PROFILE.address}</Text></View>
                        </View>
                        <View style={styles.partyRowLast}>
                            <View style={styles.partyLabel}><Text style={styles.partyLabelText}>업태</Text></View>
                            <View style={styles.partyInnerValue}><Text style={styles.partyValueText}>{COMPANY_PROFILE.bizType}</Text></View>
                            <View style={styles.partyInnerLabel}><Text style={styles.partyLabelText}>종목</Text></View>
                            <View style={styles.partyInnerValue}><Text style={styles.partyValueText}>{COMPANY_PROFILE.bizItem}</Text></View>
                        </View>
                    </View>

                    {/* 공급받는자 (거래처) */}
                    <View style={[styles.partyHalf, styles.partyHalfDiv]}>
                        <View style={styles.partyRow}>
                            <View style={styles.partyLabel}><Text style={styles.partyLabelText}>상호</Text></View>
                            <View style={styles.partyInnerValue}><Text style={styles.partyValueText}>{data.client.name}</Text></View>
                            <View style={styles.partyInnerLabel}><Text style={styles.partyLabelText}>성명</Text></View>
                            <View style={styles.partyInnerValue}><Text style={styles.partyValueText}>{data.client.ceoName || ""}</Text></View>
                        </View>
                        <View style={styles.partyRow}>
                            <View style={styles.partyLabel}><Text style={styles.partyLabelText}>주소</Text></View>
                            <View style={styles.partyValue}><Text style={styles.partyValueText}>{data.client.address || ""}</Text></View>
                        </View>
                        <View style={styles.partyRowLast}>
                            <View style={styles.partyLabel}><Text style={styles.partyLabelText}>비고</Text></View>
                            <View style={styles.partyInnerValue}><Text style={styles.partyValueText}>{data.client.bizNo || ""}</Text></View>
                            <View style={styles.partyInnerLabel}><Text style={styles.partyLabelText}>인수자</Text></View>
                            <View style={styles.partyInnerValue}><Text style={styles.partyValueText}>{data.clientPerson || ""}</Text></View>
                        </View>
                    </View>
                </View>

                {/* 내역 테이블 헤더 */}
                <View style={[styles.table]}>
                    <View style={styles.th}>
                        <View style={[styles.thCell, { width: COLS.date }]}><Text style={styles.thText}>월일</Text></View>
                        <View style={[styles.thCell, { flex: 1 }]}><Text style={styles.thText}>품명 / 규격</Text></View>
                        <View style={[styles.thCell, { width: COLS.qty }]}><Text style={styles.thText}>수량</Text></View>
                        <View style={[styles.thCell, { width: COLS.unitPrice }]}><Text style={styles.thText}>장당단가</Text></View>
                        <View style={[styles.thCell, { width: COLS.supply }]}><Text style={styles.thText}>공급가액</Text></View>
                        <View style={[styles.thCell, { width: COLS.vat }]}><Text style={styles.thText}>세액</Text></View>
                        <View style={[styles.thCellLast, { width: COLS.note }]}><Text style={styles.thText}>비고</Text></View>
                    </View>

                    {/* 내역 행 */}
                    {rows.map((it, i) => (
                        <View key={i} style={styles.tr}>
                            <View style={[styles.td, { width: COLS.date }]}>
                                <Text style={styles.tdTextCenter}>{it?.date || ""}</Text>
                            </View>
                            <View style={[styles.td, { flex: 1 }]}>
                                <Text style={styles.tdText}>
                                    {it ? (it.type === "FREIGHT" ? (it.name || "운임") : [it.name, it.spec].filter(Boolean).join(" ")) : ""}
                                </Text>
                            </View>
                            <View style={[styles.td, { width: COLS.qty }]}>
                                <Text style={styles.tdTextCenter}>{it?.qty != null && it.qty > 0 ? String(it.qty) : ""}</Text>
                            </View>
                            <View style={[styles.td, { width: COLS.unitPrice }]}>
                                <Text style={styles.tdTextRight}>{fmt(it?.unitPrice)}</Text>
                            </View>
                            <View style={[styles.td, { width: COLS.supply }]}>
                                <Text style={styles.tdTextRight}>{fmt(it?.supply)}</Text>
                            </View>
                            <View style={[styles.td, { width: COLS.vat }]}>
                                <Text style={styles.tdTextRight}>{fmt(it?.vat)}</Text>
                            </View>
                            <View style={[styles.tdLast, { width: COLS.note }]}>
                                <Text style={styles.tdText}>{it?.note || ""}</Text>
                            </View>
                        </View>
                    ))}

                    {/* 합계 */}
                    <View style={styles.totalRow}>
                        <View style={{
                            flex: 1,
                            padding: 5,
                            borderRightWidth: 1,
                            borderRightColor: "#000",
                            alignItems: "center",
                            justifyContent: "center",
                        }}>
                            <Text style={styles.totalLabelText}>합 계</Text>
                        </View>
                        <View style={[styles.totalLabel, { width: COLS.supply, alignItems: "flex-end", paddingRight: 5 }]}><Text style={[styles.tdTextRight, { fontWeight: 700 }]}>{fmt(data.totalSupply)}</Text></View>
                        <View style={[styles.totalLabel, { width: COLS.vat, alignItems: "flex-end", paddingRight: 5 }]}><Text style={[styles.tdTextRight, { fontWeight: 700 }]}>{fmt(data.totalVat)}</Text></View>
                        <View style={{ width: COLS.note, padding: 5, alignItems: "flex-end", justifyContent: "center" }}><Text style={[styles.tdTextRight, { fontWeight: 700 }]}>{fmt(data.totalSum)}</Text></View>
                    </View>
                </View>

                {/* 메모 */}
                <View style={styles.memoRow}>
                    <View style={styles.memoLabel}><Text style={styles.partyLabelText}>메모</Text></View>
                    <View style={styles.memoValue}><Text style={styles.partyValueText}>{data.memo || ""}</Text></View>
                </View>
            </View>
        </View>
    );
};

export const TransactionStatementPdf = ({ data }: { data: TsPdfData }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <StatementCopy data={data} copyLabel="공급 받는 자 보관용" accent="#2563eb" />
        </Page>
        <Page size="A4" style={styles.page}>
            <StatementCopy data={data} copyLabel="공급자 보관용" accent="#dc2626" />
        </Page>
    </Document>
);

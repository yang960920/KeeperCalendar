import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { commonStyles, colors } from "./shared-styles";
import type { DepartmentReportData, ReportPeriod } from "../data-collector";

interface DepartmentReportProps {
    data: DepartmentReportData;
    period: ReportPeriod;
    insight: string;
}

const Footer = ({ period, deptName }: { period: ReportPeriod; deptName: string }) => (
    <View style={commonStyles.footer} fixed>
        <Text>Keeper Calendar — {deptName} {period.type === "WEEKLY" ? "주간" : "월간"} 리포트</Text>
        <Text>본 리포트는 Keeper Calendar 시스템에서 자동 생성되었습니다.</Text>
    </View>
);

export const DepartmentReport = ({ data, period, insight }: DepartmentReportProps) => (
    <Document>
        <Page size="A4" style={commonStyles.page}>
            {/* 헤더 */}
            <View style={commonStyles.header}>
                <View>
                    <Text style={commonStyles.headerTitle}>{data.name} {period.type === "WEEKLY" ? "주간" : "월간"} 리포트</Text>
                    <Text style={commonStyles.headerSubtitle}>{period.label} ({period.start.toISOString().slice(0, 10)} ~ {period.end.toISOString().slice(0, 10)})</Text>
                </View>
                <Text style={commonStyles.headerSubtitle}>생성: {new Date().toISOString().slice(0, 10)}</Text>
            </View>

            {/* KPI */}
            <View style={commonStyles.kpiRow}>
                <View style={commonStyles.kpiCard}>
                    <Text style={commonStyles.kpiLabel}>총 업무</Text>
                    <Text style={commonStyles.kpiValue}>{data.totalTasks}</Text>
                </View>
                <View style={commonStyles.kpiCard}>
                    <Text style={commonStyles.kpiLabel}>완료율</Text>
                    <Text style={[commonStyles.kpiValue, { color: colors.success }]}>{data.completionRate}%</Text>
                </View>
                <View style={commonStyles.kpiCard}>
                    <Text style={commonStyles.kpiLabel}>지연</Text>
                    <Text style={[commonStyles.kpiValue, { color: data.delayedTasks > 0 ? colors.danger : colors.success }]}>{data.delayedTasks}</Text>
                </View>
                <View style={commonStyles.kpiCard}>
                    <Text style={commonStyles.kpiLabel}>총 공헌도</Text>
                    <Text style={[commonStyles.kpiValue, { color: colors.primary }]}>{data.totalContribution}</Text>
                </View>
            </View>

            {/* 직원별 성과 */}
            <Text style={commonStyles.sectionTitle}>[Members] 직원별 성과</Text>
            <View style={commonStyles.tableHeader}>
                <Text style={[commonStyles.tableCell, { flex: 2 }]}>이름</Text>
                <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>업무</Text>
                <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>완료</Text>
                <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>지연</Text>
                <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>완료율</Text>
                <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>공헌도</Text>
                <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>기한준수</Text>
            </View>
            {data.members.map((m, i) => (
                <View key={i} style={commonStyles.tableRow}>
                    <Text style={[commonStyles.tableCell, { flex: 2 }]}>{m.name}</Text>
                    <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>{m.totalTasks}</Text>
                    <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>{m.completedTasks}</Text>
                    <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center", color: m.delayedTasks > 0 ? colors.danger : undefined }]}>{m.delayedTasks}</Text>
                    <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>{m.completionRate}%</Text>
                    <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center", fontWeight: 700 }]}>{m.contribution}</Text>
                    <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>{m.timelinessRate}%</Text>
                </View>
            ))}

            {/* 카테고리 분포 */}
            {data.categoryBreakdown.length > 0 && (
                <>
                    <Text style={[commonStyles.sectionTitle, { marginTop: 16 }]}>[Category] 카테고리별 업무 분포</Text>
                    {data.categoryBreakdown.map((c, i) => (
                        <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 6 }}>
                            <Text style={{ fontSize: 8, width: 50 }}>{c.category}</Text>
                            <View style={[commonStyles.progressBarBg, { flex: 1 }]}>
                                <View style={[commonStyles.progressBarFill, {
                                    width: `${c.rate}%`,
                                    backgroundColor: colors.primary,
                                }]} />
                            </View>
                            <Text style={{ fontSize: 8, width: 50, textAlign: "right" }}>{c.count}건 ({c.rate}%)</Text>
                        </View>
                    ))}
                </>
            )}

            {/* AI 인사이트 */}
            <View style={commonStyles.insightBox}>
                <Text style={commonStyles.insightTitle}>[AI] 분석 인사이트</Text>
                <Text style={commonStyles.insightText}>{insight}</Text>
            </View>

            <Footer period={period} deptName={data.name} />
        </Page>
    </Document>
);

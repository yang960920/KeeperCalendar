import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { commonStyles, colors } from "./shared-styles";
import type { MemberReportData, ReportPeriod } from "../data-collector";

interface IndividualReportProps {
    data: MemberReportData;
    departmentName: string;
    period: ReportPeriod;
    insight: string;
}

export const IndividualReport = ({ data, departmentName, period, insight }: IndividualReportProps) => (
    <Document>
        <Page size="A4" style={commonStyles.page}>
            {/* 헤더 */}
            <View style={commonStyles.header}>
                <View>
                    <Text style={commonStyles.headerTitle}>{data.name} — 개인 업무 리포트</Text>
                    <Text style={commonStyles.headerSubtitle}>{departmentName} | {period.label}</Text>
                </View>
                <Text style={commonStyles.headerSubtitle}>생성: {new Date().toISOString().slice(0, 10)}</Text>
            </View>

            {/* 핵심 지표 */}
            <View style={commonStyles.kpiRow}>
                <View style={commonStyles.kpiCard}>
                    <Text style={commonStyles.kpiLabel}>완료율</Text>
                    <Text style={[commonStyles.kpiValue, { color: colors.success }]}>{data.completionRate}%</Text>
                    <Text style={{ fontSize: 7, color: colors.gray500, marginTop: 2 }}>{data.completedTasks}/{data.totalTasks}건</Text>
                </View>
                <View style={commonStyles.kpiCard}>
                    <Text style={commonStyles.kpiLabel}>공헌도</Text>
                    <Text style={[commonStyles.kpiValue, { color: colors.primary }]}>{data.contribution}</Text>
                </View>
                <View style={commonStyles.kpiCard}>
                    <Text style={commonStyles.kpiLabel}>기한 준수율</Text>
                    <Text style={[commonStyles.kpiValue, { color: data.timelinessRate >= 80 ? colors.success : colors.warning }]}>{data.timelinessRate}%</Text>
                </View>
            </View>

            {/* 업무 상세 테이블 */}
            <Text style={commonStyles.sectionTitle}>[Tasks] 업무 상세</Text>
            <View style={commonStyles.tableHeader}>
                <Text style={[commonStyles.tableCell, { flex: 3 }]}>업무명</Text>
                <Text style={[commonStyles.tableCell, { flex: 1.5 }]}>프로젝트</Text>
                <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>카테고리</Text>
                <Text style={[commonStyles.tableCell, { flex: 0.7, textAlign: "center" }]}>상태</Text>
                <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>마감일</Text>
                <Text style={[commonStyles.tableCell, { flex: 0.7, textAlign: "center" }]}>공헌도</Text>
            </View>
            {data.tasks.map((t, i) => (
                <View key={i} style={[commonStyles.tableRow, {
                    backgroundColor: t.status === "완료" ? colors.successLight
                        : t.isDelayed ? colors.dangerLight : undefined,
                }]}>
                    <Text style={[commonStyles.tableCell, { flex: 3 }]}>
                        {t.status === "완료" ? "[V] " : t.isDelayed ? "[!] " : ""}{t.title}
                    </Text>
                    <Text style={[commonStyles.tableCell, { flex: 1.5, color: colors.gray500 }]}>{t.project}</Text>
                    <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>{t.category}</Text>
                    <Text style={[commonStyles.tableCell, { flex: 0.7, textAlign: "center",
                        color: t.status === "완료" ? colors.success : t.isDelayed ? colors.danger : colors.gray600,
                    }]}>
                        {t.isDelayed ? `${t.delayDays}일 지연` : t.status}
                    </Text>
                    <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>{t.dueDate}</Text>
                    <Text style={[commonStyles.tableCell, { flex: 0.7, textAlign: "center" }]}>{t.contributionScore}</Text>
                </View>
            ))}

            {/* 카테고리 비율 */}
            {data.categoryBreakdown.length > 0 && (
                <>
                    <Text style={[commonStyles.sectionTitle, { marginTop: 14 }]}>[Category] 카테고리별 비율</Text>
                    <View style={{ flexDirection: "row", height: 14, borderRadius: 7, overflow: "hidden" }}>
                        {data.categoryBreakdown.map((c, i) => {
                            const catColors = [colors.primary, colors.success, colors.warning, colors.danger, "#8b5cf6", colors.gray400];
                            const proportion = data.totalTasks > 0 ? (c.count / data.totalTasks) * 100 : 0;
                            return (
                                <View key={i} style={{
                                    width: `${proportion}%`,
                                    backgroundColor: catColors[i % catColors.length],
                                    height: 14,
                                }} />
                            );
                        })}
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                        {data.categoryBreakdown.map((c, i) => {
                            const catColors = [colors.primary, colors.success, colors.warning, colors.danger, "#8b5cf6", colors.gray400];
                            return (
                                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: catColors[i % catColors.length] }} />
                                    <Text style={{ fontSize: 7 }}>{c.category} ({c.count}건)</Text>
                                </View>
                            );
                        })}
                    </View>
                </>
            )}

            {/* AI 코멘트 */}
            <View style={[commonStyles.insightBox, { backgroundColor: colors.gray100, borderLeftColor: colors.gray400 }]}>
                <Text style={[commonStyles.insightTitle, { color: colors.gray600 }]}>[AI Comment] 관리자 전용</Text>
                <Text style={[commonStyles.insightText, { color: colors.gray600 }]}>{insight}</Text>
            </View>

            {/* 푸터 */}
            <View style={commonStyles.footer} fixed>
                <Text>Keeper Calendar — {data.name} 개인 리포트</Text>
                <Text>본 리포트는 관리자 전용입니다.</Text>
            </View>
        </Page>
    </Document>
);

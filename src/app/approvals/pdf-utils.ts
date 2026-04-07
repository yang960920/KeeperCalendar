// ─── 전자결재 PDF 생성 유틸리티 ──────────────────────────────────────────────

interface PdfApproval {
    id: string;
    title: string;
    content: string;
    category: string;
    status: string;
    requesterId: string;
    formData?: Record<string, any>;
    steps: { id: string; approverId: string; stepOrder: number; status: string; comment?: string; actedAt?: string }[];
    createdAt: string;
}

interface PdfEmployee {
    id: string;
    name: string;
    departmentName: string;
}

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

const sanitizeFilename = (name: string) =>
    name.replace(/[<>:"/\\|?*\n\r]/g, "_").replace(/\s+/g, " ").trim().slice(0, 100);

const fmtDate = (d: string) => {
    try {
        const date = new Date(d);
        return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, "0")}. ${String(date.getDate()).padStart(2, "0")}`;
    } catch { return d; }
};

const fmtShortDate = (d: string) => {
    try {
        const date = new Date(d);
        return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
    } catch { return ""; }
};

const fmtNum = (n: number | string) => {
    const num = Number(n);
    return isNaN(num) ? "0" : num.toLocaleString();
};

const statusLabel: Record<string, string> = {
    PENDING: "대기 중", IN_PROGRESS: "결재 중", APPROVED: "승인", REJECTED: "반려", WITHDRAWN: "철회",
    WAITING: "", APPROVED_STEP: "승인",
};

const categoryLabel: Record<string, string> = {
    VACATION: "휴 가 신 청 서", OVERTIME: "시간외근무 신청서", BUSINESS_TRIP: "외근/출장 보고서",
    EXPENSE: "지 출 결 의 서", GENERAL: "품 의 서", GRANT_APPLICATION: "정부과제 신청서",
    INSPECTION: "납품/검수확인서",
    TAX_INVOICE: "세금계산서 발행 요청서",
    EXPENDITURE_PLAN: "자금 지출계획서",
    PERSONAL_EXPENSE: "개인경비 사용 청구서",
};

// ─── 공통 CSS ──────────────────────────────────────────────────────────────────

const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body, div, td, th, p, span { font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif; }
.doc { max-width: 794px; background: #fff; color: #1a1a1a; line-height: 1.6; }
.hdr { background: #1e293b; color: #fff; padding: 28px 40px; display: flex; justify-content: space-between; align-items: center; }
.hdr h1 { font-size: 26px; font-weight: 700; letter-spacing: 2px; }
.hdr .meta { text-align: right; font-size: 12px; color: #94a3b8; line-height: 1.8; }
.hdr .meta b { color: #fff; font-weight: 500; }
.appr { padding: 20px 40px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: flex-end; }
.ab { border: 1px solid #d1d5db; text-align: center; min-width: 80px; }
.ab + .ab { border-left: none; }
.ab .at { background: #f1f5f9; padding: 5px 12px; font-size: 11px; font-weight: 600; color: #475569; border-bottom: 1px solid #d1d5db; }
.ab .an { padding: 16px 12px; font-size: 13px; font-weight: 500; min-height: 56px; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 2px; }
.ab .an .st { font-size: 10px; color: #64748b; }
.ab .ad { padding: 3px 12px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e5e7eb; }
.body { padding: 28px 40px 36px; }
.sl { font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 10px; padding-left: 10px; border-left: 3px solid #1e293b; }
table.ft { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
table.ft th, table.ft td { border: 1px solid #d1d5db; padding: 8px 14px; vertical-align: middle; }
table.ft th { background: #f8fafc; font-weight: 500; color: #475569; text-align: center; white-space: nowrap; }
table.ft td { color: #1e293b; }
.dth { background: #1e293b !important; color: #fff !important; font-weight: 500 !important; font-size: 11px !important; padding: 8px 10px !important; letter-spacing: 0.3px; }
.r { text-align: right; }
.c { text-align: center; }
.bold { font-weight: 600; }
.sub td { background: #f1f5f9 !important; font-weight: 600; color: #334155; border-top: 2px solid #cbd5e1; }
.total-bar { display: flex; border: 1px solid #d1d5db; border-radius: 4px; overflow: hidden; margin-bottom: 24px; }
.total-bar .tl { background: #f8fafc; padding: 16px 20px; font-size: 13px; font-weight: 600; color: #475569; border-right: 1px solid #d1d5db; min-width: 120px; display: flex; align-items: center; justify-content: center; text-align: center; line-height: 1.3; }
.total-bar .ta { flex: 1; padding: 16px 24px; font-size: 22px; font-weight: 700; color: #1e293b; display: flex; align-items: center; justify-content: center; }
.ic { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; }
.icc { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; display: flex; gap: 10px; align-items: flex-start; }
.icc .ico { width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0; }
.icc .lbl { font-size: 11px; color: #94a3b8; font-weight: 500; margin-bottom: 1px; }
.icc .val { font-size: 13px; font-weight: 500; color: #1e293b; }
.icc .sub2 { font-size: 11px; color: #64748b; margin-top: 1px; }
.badge { display: inline-block; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 3px; background: #fef3c7; border: 1px solid #fde68a; color: #92400e; margin-left: 6px; }
.fup { padding: 6px 0; }
.fup + .fup { border-top: 1px dashed #e5e7eb; }
.fup .ft2 { font-size: 13px; color: #334155; }
.fup .fd { font-size: 11px; color: #94a3b8; margin-top: 1px; }
.footer { text-align: center; padding: 24px 40px 36px; color: #475569; font-size: 13px; line-height: 2; }
.footer .dt { font-size: 14px; font-weight: 500; color: #1e293b; margin-bottom: 16px; }
.footer .nm { font-size: 16px; font-weight: 600; color: #1e293b; }
.footer .dp { color: #64748b; font-weight: 400; }
.footer .seal { color: #94a3b8; font-size: 13px; margin-left: 6px; }
.content-pre { white-space: pre-wrap; font-size: 13px; line-height: 2; padding: 14px 18px; }
`;

// ─── 결재선 렌더링 ─────────────────────────────────────────────────────────────

function renderApprovalLine(approval: PdfApproval, employees: PdfEmployee[]): string {
    const requester = employees.find((e) => e.id === approval.requesterId);
    let html = `<div class="appr"><div class="ab"><div class="at">기안</div><div class="an">${requester?.name || ""}</div><div class="ad">${fmtShortDate(approval.createdAt)}</div></div>`;
    approval.steps.forEach((step, i) => {
        const name = employees.find((e) => e.id === step.approverId)?.name || "";
        const st = step.status === "APPROVED" ? "승인" : step.status === "REJECTED" ? "반려" : "";
        const title = i === approval.steps.length - 1 ? "최종 결재" : `${i + 1}차 결재`;
        html += `<div class="ab"><div class="at">${title}</div><div class="an">${name}${st ? `<span class="st">${st}</span>` : ""}</div><div class="ad">${step.actedAt ? fmtShortDate(step.actedAt) : ""}</div></div>`;
    });
    html += `</div>`;
    return html;
}

// ─── 작성자 정보 ───────────────────────────────────────────────────────────────

function renderWriterInfo(approval: PdfApproval, employees: PdfEmployee[]): string {
    const requester = employees.find((e) => e.id === approval.requesterId);
    const name = requester?.name || "";
    const dept = requester?.departmentName || "";
    const position = approval.formData?.position || "";
    const dateStr = fmtDate(approval.createdAt);
    return `
    <div class="sl">작성자 정보</div>
    <table class="ft" style="margin-bottom:20px;">
        <tr><th style="width:90px">성 명</th><td>${name}</td><th style="width:90px">작 성 일</th><td>${dateStr}</td></tr>
        <tr><th>소 속</th><td>${dept}</td><th>직 급</th><td>${position}</td></tr>
    </table>`;
}

// ─── 서명 영역 ─────────────────────────────────────────────────────────────────

function renderFooter(approval: PdfApproval, employees: PdfEmployee[], closingText: string): string {
    const requester = employees.find((e) => e.id === approval.requesterId);
    const name = requester?.name || "";
    const dept = requester?.departmentName || "";
    const d = new Date(approval.createdAt);
    const dateStr = `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, "0")}월 ${String(d.getDate()).padStart(2, "0")}일`;
    return `<div class="footer"><div style="margin-bottom:24px;">${closingText}</div><div class="dt">${dateStr}</div><div><span class="dp">${dept}</span>&nbsp;&nbsp;<span class="nm">${name.split("").join(" ")}</span><span class="seal">(인)</span></div></div>`;
}

// ─── 품의서 (GENERAL) ──────────────────────────────────────────────────────────

function renderGeneral(a: PdfApproval, emps: PdfEmployee[]): string {
    const fd = a.formData || {};
    let detailRows = "";
    if (fd.item) detailRows += `<div>1. 품 목 : ${fd.item}</div>`;
    if (fd.vendor) detailRows += `<div>2. 업체명 : ${fd.vendor}</div>`;
    if (fd.paymentAmount) detailRows += `<div>3. 지급비용 : 금 ${fmtNum(fd.paymentAmount)}원 (부가세 포함)</div>`;
    if (fd.paymentMethod) detailRows += `<div>4. 지급방법 : ${fd.paymentMethod} 결제</div>`;
    if (fd.paymentDate) detailRows += `<div>5. 입금일자 : ${fd.paymentDate}</div>`;
    if (!detailRows) detailRows = `<div style="white-space:pre-wrap;">${a.content}</div>`;

    const title = fd.docTitle || a.title;
    return `
    ${renderWriterInfo(a, emps)}
    <table class="ft" style="margin-bottom:20px;">
        <tr><th style="width:90px">제 목</th><td colspan="3">${title}</td></tr>
    </table>
    ${fd.project ? `<div style="display:inline-block;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-size:12px;font-weight:500;padding:3px 10px;border-radius:4px;margin-bottom:14px;">${fd.project}</div>` : ""}
    <div class="sl">품의 내용</div>
    <table class="ft">
        <tr><th style="width:110px;vertical-align:top;">품의 사유<br>및<br>상세 내역</th><td class="content-pre">${detailRows}</td></tr>
        ${fd.estimatedCost ? `<tr><th>예상 비용</th><td class="r bold" style="font-size:15px;">₩ ${fmtNum(fd.estimatedCost)}</td></tr>` : ""}
        ${fd.budgetCategory ? `<tr><th>비 목</th><td>${fd.budgetCategory}</td></tr>` : ""}
        ${fd.notes ? `<tr><th>비 고</th><td style="min-height:60px;">${fd.notes}</td></tr>` : ""}
    </table>`;
}

// ─── 지출결의서 (EXPENSE) ──────────────────────────────────────────────────────

function renderExpense(a: PdfApproval, emps: PdfEmployee[]): string {
    const fd = a.formData || {};
    const expenses: any[] = fd.expenses || [];
    const accounts: any[] = fd.accounts || [];

    // 자동 계산
    let totalSupply = 0, totalVat = 0;
    const calcRows = expenses.map((exp: any) => {
        const qty = Number(exp.qty) || 0;
        const up = Number(exp.unitPrice) || 0;
        const supply = qty * up;
        const vat = Math.round(supply * 0.1);
        totalSupply += supply;
        totalVat += vat;
        return { supply, vat };
    });
    const grandTotal = totalSupply + totalVat;

    // 구형 데이터 호환
    if (expenses.length === 0 && fd.expenseItem) {
        return `${renderWriterInfo(a, emps)}
        <div class="sl">지출 내용</div>
        <table class="ft">
            <tr><th style="width:110px">지출 항목</th><td>${fd.expenseItem}</td></tr>
            <tr><th>금 액</th><td class="r bold">₩ ${fmtNum(fd.amount)}</td></tr>
            <tr><th>사용일</th><td>${fd.expenseDate || ""}</td></tr>
            <tr><th>증빙 구분</th><td>${fd.receiptType || ""}</td></tr>
        </table>
        <div style="white-space:pre-wrap;font-size:13px;padding:10px 0;">${a.content}</div>`;
    }

    let periodHtml = "";
    if (fd.periodStart && fd.periodEnd) {
        periodHtml = `<div style="display:inline-flex;align-items:center;gap:5px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:12px;font-weight:500;padding:3px 12px;border-radius:4px;margin-bottom:14px;">
            <span style="width:7px;height:7px;background:#22c55e;border-radius:50%;display:inline-block;"></span>
            정산 기간 : ${fd.periodStart} ~ ${fd.periodEnd}${fd.periodLabel ? ` (${fd.periodLabel})` : ""}
        </div>`;
    }

    let accountHtml = "";
    if (accounts.some((ac: any) => ac.vendor)) {
        accountHtml = `<div class="sl">송금 계좌 정보</div><table class="ft"><thead><tr>
            <th class="dth" style="width:36px">No.</th><th class="dth">거래처</th><th class="dth" style="width:80px">은행명</th>
            <th class="dth" style="width:150px">계좌번호</th><th class="dth" style="width:90px">예금주</th><th class="dth" style="width:100px">송금액</th>
        </tr></thead><tbody>`;
        accounts.forEach((ac: any, i: number) => {
            if (ac.vendor) {
                accountHtml += `<tr><td class="c">${i + 1}</td><td>${ac.vendor}</td><td>${ac.bank || ""}</td><td>${ac.accountNo || ""}</td><td>${ac.holder || ""}</td><td class="r bold">${fmtNum(ac.amount)}</td></tr>`;
            }
        });
        accountHtml += `</tbody></table>`;
    }

    let expenseHtml = "";
    if (expenses.some((ex: any) => ex.content)) {
        expenseHtml = `<div class="sl">지출 내역</div><table class="ft"><thead><tr>
            <th class="dth" style="width:36px">No.</th><th class="dth" style="width:70px">일자</th><th class="dth" style="width:90px">거래처</th>
            <th class="dth">내용</th><th class="dth" style="width:40px">수량</th><th class="dth" style="width:80px">단가</th>
            <th class="dth" style="width:80px">공급가액</th><th class="dth" style="width:70px">세액</th><th class="dth" style="width:60px">비고</th>
        </tr></thead><tbody>`;
        expenses.forEach((ex: any, i: number) => {
            if (ex.content) {
                expenseHtml += `<tr><td class="c">${i + 1}</td><td class="c">${ex.date || ""}</td><td>${ex.vendor || ""}</td><td>${ex.content}</td><td class="c">${ex.qty || ""}</td><td class="r">${fmtNum(ex.unitPrice)}</td><td class="r bold">${fmtNum(calcRows[i]?.supply)}</td><td class="r">${fmtNum(calcRows[i]?.vat)}</td><td>${ex.note || ""}</td></tr>`;
            }
        });
        expenseHtml += `<tr class="sub"><td colspan="6" class="r" style="padding-right:14px;">소 계</td><td class="r">${fmtNum(totalSupply)}</td><td class="r">${fmtNum(totalVat)}</td><td></td></tr></tbody></table>`;
    }

    return `
    ${periodHtml}
    ${fd.linkedDocs ? `<div style="font-size:12px;color:#475569;margin-bottom:14px;">연결 품의 : ${fd.linkedDocs}</div>` : ""}
    ${renderWriterInfo(a, emps)}
    <div class="total-bar"><div class="tl">합 계<br>(VAT 포함)</div><div class="ta">₩ ${fmtNum(grandTotal)}</div></div>
    ${accountHtml}
    ${expenseHtml}
    ${fd.remarks ? `<table class="ft"><tr><th style="width:110px;vertical-align:top;">특이사항</th><td style="min-height:60px;">${fd.remarks}</td></tr></table>` : ""}`;
}

// ─── 외근/출장 보고서 (BUSINESS_TRIP) ────────────────────────────────────────

function renderBusinessTrip(a: PdfApproval, emps: PdfEmployee[]): string {
    const fd = a.formData || {};
    const schedules: any[] = fd.schedules || [];
    const followups: any[] = fd.followups || [];
    const tripExpenses: any[] = fd.tripExpenses || [];

    // 구형 데이터 호환 (destination 기반 레거시)
    if (!fd.tripStartDate && !fd.tripDate && fd.destination) {
        return `${renderWriterInfo(a, emps)}
        <div class="sl">출장 정보</div>
        <table class="ft">
            <tr><th style="width:110px">출장지</th><td>${fd.destination}</td></tr>
            <tr><th>기 간</th><td>${fd.startDate || ""} ~ ${fd.endDate || ""}</td></tr>
            ${fd.estimatedCost ? `<tr><th>예상비용</th><td class="r bold">₩ ${fmtNum(fd.estimatedCost)}</td></tr>` : ""}
        </table>
        <div style="white-space:pre-wrap;font-size:13px;padding:10px 0;">${a.content}</div>`;
    }

    // 기간 / 시간 표시
    const startDate = fd.tripStartDate || fd.tripDate || "";
    const endDate = fd.tripEndDate || "";
    let durationText = "";
    if (endDate && startDate !== endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        const nights = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
        if (nights > 0) durationText = ` (${nights}박${nights + 1}일)`;
    } else if (fd.tripStartTime && fd.tripEndTime) {
        const [sh, sm] = fd.tripStartTime.split(":").map(Number);
        const [eh, em] = fd.tripEndTime.split(":").map(Number);
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff > 0) { const h = diff / 60; durationText = ` (${h % 1 === 0 ? h : h.toFixed(1)}시간)`; }
    }

    const dateDisplay = endDate && startDate !== endDate ? `${startDate} ~ ${endDate}` : startDate;
    const timeDisplay = fd.tripStartTime || fd.tripEndTime ? `${fd.tripStartTime || ""} ~ ${fd.tripEndTime || ""}` : "";

    // 개요 카드
    const cardsHtml = `<div class="sl">개요</div><div class="ic">
        <div class="icc"><div class="ico" style="background:#3b82f6;">D</div><div><div class="lbl">기간</div><div class="val">${dateDisplay}${durationText}</div><div class="sub2">${timeDisplay}</div></div></div>
        <div class="icc"><div class="ico" style="background:#10b981;">L</div><div><div class="lbl">장소</div><div class="val">${fd.location || ""}</div><div class="sub2">${fd.locationDetail || ""}</div></div></div>
        <div class="icc"><div class="ico" style="background:#8b5cf6;">C</div><div><div class="lbl">방문 기관</div><div class="val">${fd.visitCompany || ""}</div><div class="sub2">${fd.visitDepartment || ""}</div></div></div>
        <div class="icc"><div class="ico" style="background:#f59e0b;">P</div><div><div class="lbl">면담자</div><div class="val">${fd.contactName || ""}</div><div class="sub2">${fd.contactPhone || ""}</div></div></div>
    </div>`;

    // 목적
    const purposeHtml = fd.purpose ? `<div class="sl">목적</div><table class="ft"><tr><th style="width:90px;vertical-align:top;">목 적</th><td class="content-pre">${fd.purpose}</td></tr></table>` : "";

    // 방문 일정
    let scheduleHtml = "";
    if (schedules.some((s: any) => s.content)) {
        scheduleHtml = `<div class="sl">방문 일정</div><table class="ft"><thead><tr>
            <th class="dth" style="width:36px">No.</th><th class="dth" style="width:120px">시간</th><th class="dth" style="width:130px">장소 / 대상</th><th class="dth">수행 내용</th><th class="dth" style="width:120px">비고</th>
        </tr></thead><tbody>`;
        schedules.forEach((s: any, i: number) => {
            if (s.content) scheduleHtml += `<tr><td class="c">${i + 1}</td><td class="c">${s.time || ""}</td><td>${s.location || ""}</td><td>${s.content}</td><td>${s.result || ""}</td></tr>`;
        });
        scheduleHtml += `</tbody></table>`;
    }

    // 업무 수행 결과
    const achieveHtml = fd.achievements ? `<div class="sl">업무 수행 결과</div><table class="ft"><tr><th style="width:90px;vertical-align:top;">주요 성과</th><td class="content-pre">${fd.achievements}</td></tr></table>` : "";

    // 후속 조치
    let followupHtml = "";
    if (followups.some((f: any) => f.text)) {
        followupHtml = `<div class="sl">후속 조치 사항</div><table class="ft"><tr><th style="width:90px;vertical-align:top;">조치 내용</th><td style="padding:12px 16px;">`;
        followups.forEach((f: any) => {
            if (f.text) followupHtml += `<div class="fup"><div class="ft2">${f.text}</div>${f.dueDate ? `<div class="fd">기한 : ${f.dueDate}</div>` : ""}</div>`;
        });
        followupHtml += `</td></tr></table>`;
    }

    // 경비
    let expenseHtml = "";
    if (fd.hasExpense !== false && tripExpenses.some((e: any) => e.content)) {
        const total = tripExpenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
        expenseHtml = `<div class="sl">경비 발생 내역<span class="badge">경비 발생</span></div><table class="ft"><thead><tr>
            <th class="dth" style="width:36px">No.</th><th class="dth" style="width:90px">항목</th><th class="dth">내용</th><th class="dth" style="width:100px;text-align:right;">금액</th><th class="dth" style="width:80px">결제 수단</th>
        </tr></thead><tbody>`;
        tripExpenses.forEach((e: any, i: number) => {
            if (e.content) expenseHtml += `<tr><td class="c">${i + 1}</td><td>${e.category || ""}</td><td>${e.content}</td><td class="r bold">${fmtNum(e.amount)}</td><td>${e.payMethod || ""}</td></tr>`;
        });
        expenseHtml += `<tr class="sub"><td colspan="3" class="r" style="padding-right:14px;">합 계</td><td class="r bold">${fmtNum(total)}</td><td></td></tr></tbody></table>`;
    }

    return `${renderWriterInfo(a, emps)}${cardsHtml}${purposeHtml}${scheduleHtml}${achieveHtml}${followupHtml}${expenseHtml}`;
}

// ─── 납품/검수확인서 (INSPECTION) ─────────────────────────────────────────────

function renderInspection(a: PdfApproval, emps: PdfEmployee[]): string {
    const fd = a.formData || {};
    const items: any[] = fd.items || [];

    // 과제 정보 테이블
    const infoHtml = `<div class="sl">과제 정보</div>
    <table class="ft">
        <tr><th style="width:100px">주관기관</th><td>한미르 (주)</td><th style="width:100px">사 업 명</th><td>${fd.projectName || ""}</td></tr>
        <tr><th>사업기간</th><td>${fd.projectPeriod || ""}</td><th>과제번호</th><td>${fd.projectCode || ""}</td></tr>
        <tr><th>과 제 명</th><td colspan="3">${fd.docTitle || ""}</td></tr>
        <tr><th>납품업체</th><td>${fd.vendor || ""}</td><th>제 목</th><td>${fd.inspectionTitle || ""}</td></tr>
    </table>`;

    // 품목 테이블
    let itemsHtml = `<div class="sl">검수 품목</div><table class="ft"><thead><tr>
        <th class="dth" style="width:36px">No.</th><th class="dth" style="width:150px">품 명</th><th class="dth" style="width:90px">규격</th>
        <th class="dth" style="width:60px">단위</th><th class="dth" style="width:60px">수량</th><th class="dth" style="width:90px">단 가</th>
        <th class="dth" style="width:90px">금 액</th><th class="dth">비고</th>
    </tr></thead><tbody>`;
    let total = 0;
    items.forEach((it: any, i: number) => {
        if (it.name) {
            const amt = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
            total += amt;
            itemsHtml += `<tr><td class="c">${i + 1}</td><td>${it.name}</td><td>${it.spec || ""}</td><td class="c">${it.unit || ""}</td><td class="c">${it.qty || ""}</td><td class="r">${fmtNum(it.unitPrice)}</td><td class="r bold">${fmtNum(amt)}</td><td>${it.note || ""}</td></tr>`;
        }
    });
    itemsHtml += `<tr class="sub"><td colspan="6" class="r" style="padding-right:14px;">합 계</td><td class="r bold">${fmtNum(total)}</td><td></td></tr></tbody></table>`;

    // 검수 정보
    const inspInfoHtml = (fd.inspectionDate || fd.inspector)
        ? `<div class="sl">검수 정보</div><table class="ft" style="max-width:400px;margin:0 auto;">
            ${fd.inspectionDate ? `<tr><th style="width:100px;background:#a9a9a9;color:#fff;">검수일</th><td class="c">${fd.inspectionDate}</td></tr>` : ""}
            ${fd.inspector ? `<tr><th style="width:100px;background:#a9a9a9;color:#fff;">검수자</th><td class="c">${fd.inspector}</td></tr>` : ""}
        </table>` : "";

    return `${renderWriterInfo(a, emps)}${infoHtml}${itemsHtml}${inspInfoHtml}`;
}

// ─── 세금계산서 발행 요청서 (TAX_INVOICE) ────────────────────────────────────

function renderTaxInvoice(a: PdfApproval, emps: PdfEmployee[]): string {
    const fd = a.formData || {};
    const items: any[] = fd.taxItems || [];

    // 발행 일자
    const issueDateHtml = fd.issueDate
        ? `<table class="ft" style="max-width:300px;margin-bottom:20px;"><tr><th style="width:100px">발행 일자</th><td class="c">${fd.issueDate}</td></tr></table>`
        : "";

    // 품목 테이블
    let itemsHtml = `<div class="sl">발행 내역</div><table class="ft"><thead><tr>
        <th class="dth" style="width:36px">No.</th><th class="dth" style="width:110px">업체명</th><th class="dth" style="width:80px">날짜</th>
        <th class="dth">제품명/모델명/단위</th><th class="dth" style="width:50px">수량</th><th class="dth" style="width:80px">단가(원)</th>
        <th class="dth" style="width:90px">공급가액</th><th class="dth" style="width:80px">부가세</th><th class="dth" style="width:90px">합계</th><th class="dth" style="width:70px">비고</th>
    </tr></thead><tbody>`;
    let totalSupply = 0;
    let totalVat = 0;
    items.forEach((it: any, i: number) => {
        if (it.company || it.product) {
            const qty = Number(it.qty) || 0;
            const up = Number(it.unitPrice) || 0;
            const hasValue = qty > 0 && up > 0;
            const supply = hasValue ? qty * up : 0;
            const vat = hasValue ? Math.round(supply * 0.1) : 0;
            const sum = supply + vat;
            totalSupply += supply;
            totalVat += vat;
            itemsHtml += `<tr><td class="c">${i + 1}</td><td>${it.company || ""}</td><td class="c">${it.date || ""}</td><td>${it.product || ""}</td><td class="c">${hasValue ? it.qty : ""}</td><td class="r">${hasValue ? fmtNum(it.unitPrice) : ""}</td><td class="r bold">${hasValue ? fmtNum(supply) : ""}</td><td class="r">${hasValue ? fmtNum(vat) : ""}</td><td class="r bold">${hasValue ? fmtNum(sum) : ""}</td><td>${it.note || ""}</td></tr>`;
        }
    });
    const totalSum = totalSupply + totalVat;
    const hasTotal = totalSum > 0;
    itemsHtml += `<tr class="sub"><td colspan="6" class="r" style="padding-right:14px;">합 계</td><td class="r bold">${hasTotal ? fmtNum(totalSupply) : ""}</td><td class="r">${hasTotal ? fmtNum(totalVat) : ""}</td><td class="r bold">${hasTotal ? fmtNum(totalSum) : ""}</td><td></td></tr></tbody></table>`;

    // 담당자 정보
    let managerHtml = "";
    if (fd.manager || fd.managerContact) {
        managerHtml = `<div class="sl">담당자 정보</div><table class="ft" style="max-width:400px;">
            ${fd.manager ? `<tr><th style="width:100px">담당자</th><td>${fd.manager}</td></tr>` : ""}
            ${fd.managerContact ? `<tr><th style="width:100px">연락처</th><td>${fd.managerContact}</td></tr>` : ""}
        </table>`;
    }

    return `${renderWriterInfo(a, emps)}${issueDateHtml}${itemsHtml}${managerHtml}`;
}

// ─── 자금 지출계획서 (EXPENDITURE_PLAN) ──────────────────────────────────────

function renderExpenditurePlan(a: PdfApproval, emps: PdfEmployee[]): string {
    const fd = a.formData || {};
    const items: any[] = fd.planItems || [];
    const requester = emps.find((e) => e.id === a.requesterId);
    const name = requester?.name || "";
    const dept = requester?.departmentName || "";
    const position = fd.position || "";
    const planDate = fd.planDate || fmtDate(a.createdAt);

    // 작성자 정보 (원본 HTML 형식)
    const headerHtml = `<table class="ft" style="margin-bottom:20px;">
        <tr><th style="width:100px;background:#ccc;">작 성 일</th><td class="c">${planDate}</td><th style="width:100px;background:#ccc;">부 서 명</th><td class="c">${dept}</td><th style="width:80px;background:#ccc;">직 급</th><td class="c">${position}</td><th style="width:80px;background:#ccc;">성 명</th><td class="c">${name}</td></tr>
    </table>`;

    // 지출 내역 테이블
    let itemsHtml = `<div class="sl">지출 내역</div><table class="ft"><thead><tr>
        <th class="dth" style="width:36px">No.</th><th class="dth" style="width:100px">날 짜</th><th class="dth" style="width:110px">지출항목</th>
        <th class="dth">세부내역</th><th class="dth" style="width:100px">지출금액</th><th class="dth" style="width:100px">지출누적금액</th><th class="dth" style="width:80px">비고</th>
    </tr></thead><tbody>`;
    let cumTotal = 0;
    items.forEach((it: any, i: number) => {
        if (it.category || it.detail) {
            const amt = Number(it.amount) || 0;
            cumTotal += amt;
            itemsHtml += `<tr><td class="c">${i + 1}</td><td class="c">${it.date || ""}</td><td>${it.category || ""}</td><td>${it.detail || ""}</td><td class="r bold">${amt > 0 ? fmtNum(amt) : ""}</td><td class="r bold">${cumTotal > 0 ? fmtNum(cumTotal) : ""}</td><td>${it.note || ""}</td></tr>`;
        }
    });
    itemsHtml += `<tr class="sub"><td colspan="4" class="r" style="padding-right:14px;">합 계</td><td class="r bold">${cumTotal > 0 ? fmtNum(cumTotal) : ""}</td><td colspan="2"></td></tr></tbody></table>`;

    return `${headerHtml}${itemsHtml}`;
}

// ─── 개인경비 사용 청구서 (PERSONAL_EXPENSE) ────────────────────────────────────

function renderPersonalExpense(a: PdfApproval, emps: PdfEmployee[]): string {
    const fd = a.formData || {};
    const items: any[] = fd.expenseItems || [];

    // 합계 / 계좌 정보
    let total = 0;
    items.forEach((it: any) => { total += Number(it.amount) || 0; });

    const summaryHtml = `<table class="ft" style="margin-bottom:20px;">
        <tr><th style="width:100px;background:#ccc;" class="c">합계</th><td class="r bold" style="width:300px;">${total > 0 ? fmtNum(total) + "원" : ""}</td><th style="width:130px;background:#ccc;" class="c">계좌번호<br/>(은행명/예금주)</th><td>${fd.bankAccount || ""}</td></tr>
    </table>`;

    // 청구 내역 테이블
    let itemsHtml = `<div class="sl">청구 내역</div><table class="ft"><thead><tr>
        <th class="dth" style="width:50px">No.</th><th class="dth">내용</th>
        <th class="dth" style="width:130px">금액</th><th class="dth" style="width:140px">비고</th>
    </tr></thead><tbody>`;
    items.forEach((it: any, i: number) => {
        if (it.content || Number(it.amount) > 0) {
            const amt = Number(it.amount) || 0;
            itemsHtml += `<tr><td class="c">${i + 1}</td><td>${it.content || ""}</td><td class="r bold">${amt > 0 ? fmtNum(amt) : ""}</td><td>${it.note || ""}</td></tr>`;
        }
    });
    itemsHtml += `<tr class="sub"><td colspan="2" class="r" style="padding-right:14px;">합 계</td><td class="r bold">${total > 0 ? fmtNum(total) : ""}</td><td></td></tr></tbody></table>`;

    // 특이사항
    let noteHtml = "";
    if (fd.specialNote) {
        noteHtml = `<div class="sl">특이사항</div><table class="ft"><tr><td style="padding:10px;min-height:60px;">${fd.specialNote}</td></tr></table>`;
    }

    return `${renderWriterInfo(a, emps)}${summaryHtml}${itemsHtml}${noteHtml}`;
}

// ─── 일반 (VACATION, OVERTIME, GRANT_APPLICATION) ──────────────────────────────

function renderGeneric(a: PdfApproval, emps: PdfEmployee[]): string {
    const fd = a.formData || {};
    let detailHtml = "";

    switch (a.category) {
        case "VACATION": {
            detailHtml = `<table class="ft">
                ${fd.vacationType ? `<tr><th style="width:110px">휴가 유형</th><td>${fd.vacationType}</td></tr>` : ""}
                <tr><th style="width:110px">기 간</th><td>${fd.startDate || ""} ~ ${fd.endDate || ""}</td></tr>
            </table>`;
            break;
        }
        case "OVERTIME": {
            detailHtml = `<table class="ft">
                <tr><th style="width:110px">근무일</th><td>${fd.overtimeDate || ""}</td></tr>
                <tr><th>시 간</th><td>${fd.startTime || ""} ~ ${fd.endTime || ""}</td></tr>
            </table>`;
            break;
        }
        case "GRANT_APPLICATION": {
            detailHtml = `<table class="ft">
                ${fd.project_name ? `<tr><th style="width:110px">과제명</th><td>${fd.project_name}</td></tr>` : ""}
                ${fd.funding_agency ? `<tr><th>주관기관</th><td>${fd.funding_agency}</td></tr>` : ""}
                ${fd.deadline ? `<tr><th>마감일</th><td>${fd.deadline}</td></tr>` : ""}
                ${fd.product_line ? `<tr><th>제품라인</th><td>${fd.product_line}</td></tr>` : ""}
            </table>`;
            break;
        }
    }

    return `
    ${renderWriterInfo(a, emps)}
    <div class="sl">신청 내용</div>
    ${detailHtml}
    <table class="ft"><tr><th style="width:110px;vertical-align:top;">상세 내용</th><td class="content-pre">${a.content}</td></tr></table>`;
}

// ─── 문서 조합 ─────────────────────────────────────────────────────────────────

function renderDocument(approval: PdfApproval, employees: PdfEmployee[]): string {
    const effectiveCategory = approval.formData?.source === "GRANT_APPLICATION" ? "GRANT_APPLICATION" : approval.category;
    const docTitle = categoryLabel[effectiveCategory] || "결 재 문 서";
    const dateStr = fmtDate(approval.createdAt);

    let bodyContent: string;
    let closingText: string;
    switch (effectiveCategory) {
        case "GENERAL":
            bodyContent = renderGeneral(approval, employees);
            closingText = "위와 같은 사유로 품의서를 제출하오니 허가하여 주시기 바랍니다.";
            break;
        case "EXPENSE":
            bodyContent = renderExpense(approval, employees);
            closingText = "위와 같은 금액을 청구하오니, 결재하여 주시기 바랍니다.";
            break;
        case "BUSINESS_TRIP":
            bodyContent = renderBusinessTrip(approval, employees);
            closingText = "위와 같이 외근/출장 결과를 보고합니다.";
            break;
        case "INSPECTION":
            bodyContent = renderInspection(approval, employees);
            closingText = "상기와 같이 입고물품에 대하여 검사/검수를 완료함.";
            break;
        case "TAX_INVOICE":
            bodyContent = renderTaxInvoice(approval, employees);
            closingText = "위와 같이 세금계산서 발행을 요청하오니 처리하여 주시기 바랍니다.";
            break;
        case "EXPENDITURE_PLAN":
            bodyContent = renderExpenditurePlan(approval, employees);
            closingText = "위와 같이 자금 지출계획서를 제출하오니 승인하여 주시기 바랍니다.";
            break;
        case "PERSONAL_EXPENSE":
            bodyContent = renderPersonalExpense(approval, employees);
            closingText = "위와 같은 금액을 청구하오니, 결재하여 주시기 바랍니다.";
            break;
        default:
            bodyContent = renderGeneric(approval, employees);
            closingText = "위와 같이 신청하오니 결재하여 주시기 바랍니다.";
    }

    return `<div class="doc"><style>${CSS}</style>
        <div class="hdr"><h1>${docTitle}</h1><div class="meta">기 안 일 : <b>${dateStr}</b></div></div>
        ${renderApprovalLine(approval, employees)}
        <div class="body">${bodyContent}</div>
        ${renderFooter(approval, employees, closingText)}
    </div>`;
}

// ─── PDF 생성 ──────────────────────────────────────────────────────────────────

async function htmlToPdfBlob(htmlString: string): Promise<Blob> {
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    // iframe으로 격리하여 페이지 CSS(lab() 등)가 html2canvas에 영향 주지 않도록 함
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-20000px";
    iframe.style.left = "-20000px";
    iframe.style.width = "794px";
    iframe.style.height = "1200px";
    iframe.style.border = "none";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error("iframe 생성 실패");
    }

    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff;color:#000;font-family:'Malgun Gothic',sans-serif}</style></head><body>${htmlString}</body></html>`);
    iframeDoc.close();

    // 렌더링 대기
    await new Promise((r) => setTimeout(r, 200));

    const target = iframeDoc.body;
    const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 794,
        windowWidth: 794,
    });

    document.body.removeChild(iframe);

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
    }

    return pdf.output("blob");
}

// ─── 다운로드 오케스트레이터 ───────────────────────────────────────────────────

export async function downloadApprovals(
    approvals: PdfApproval[],
    employees: PdfEmployee[],
    onProgress?: (current: number, total: number) => void
): Promise<void> {
    if (approvals.length === 0) return;

    const { saveAs } = await import("file-saver");

    if (approvals.length === 1) {
        const a = approvals[0];
        onProgress?.(1, 1);
        const html = renderDocument(a, employees);
        const blob = await htmlToPdfBlob(html);
        saveAs(blob, `${sanitizeFilename(a.title)}.pdf`);
        return;
    }

    // 2개 이상 → ZIP
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (let i = 0; i < approvals.length; i++) {
        onProgress?.(i + 1, approvals.length);
        const a = approvals[i];
        const html = renderDocument(a, employees);
        const blob = await htmlToPdfBlob(html);
        zip.file(`${sanitizeFilename(a.title)}.pdf`, blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, `전자결재_${approvals.length}건.zip`);
}

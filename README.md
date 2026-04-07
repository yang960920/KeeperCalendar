<div align="center">

# 📅 Keeper Calendar

### 업무 일정 관리 & 성과 추적 올인원 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![NeonDB](https://img.shields.io/badge/NeonDB-00E599?style=for-the-badge&logo=postgresql&logoColor=black)](https://neon.tech/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Zustand](https://img.shields.io/badge/Zustand-443E38?style=for-the-badge&logo=react&logoColor=white)](https://zustand-demo.pmnd.rs/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

<br/>

**Keeper Calendar**는 팀의 업무를 체계적으로 관리하고, 실시간 성과를 추적하며,  
프로젝트 단위 협업을 지원하는 **올인원 업무 관리 플랫폼**입니다.  
**오피스 홈 대시보드**로 출퇴근, 업무, 알림, 일정을 한 화면에서 관리합니다.

[🚀 라이브 데모](https://keeper-calendar.vercel.app/) · [📖 문서](#-getting-started) · [🛠️ 개발 히스토리](#-개발-및-디버깅-히스토리) · [🐛 이슈 리포트](../../issues)

</div>

---

## ✨ 주요 기능

<table>
  <tr>
    <td width="50%">
      <h3>🏠 오피스 홈 대시보드</h3>
      <ul>
        <li><b>3×3 위젯 그리드</b> 레이아웃 (행별 개별 높이)</li>
        <li>프로필 카드 — 통계 클릭 이동 + 알림 팝업 (99+ / 페이지네이션)</li>
        <li>업무 현황 — 상태 뱃지 필터 (전체/대기/진행/완료) + 4개씩 페이지네이션</li>
        <li>근무 체크 — 자동 출근 + <b>SVG 아날로그 시계</b> + 경과 시간 표시</li>
        <li>미니 캘린더 — 날짜 클릭 시 업무 표시 (상위 3개 + "+N개 더")</li>
        <li>활동 피드 — <b>내 프로젝트 범위</b>만 필터링 + 페이지네이션</li>
        <li>오늘 할 일 / 알림 / 접속 기록 / 바로가기</li>
      </ul>
    </td>
    <td width="50%">
      <h3>🗂️ 프로젝트 협업</h3>
      <ul>
        <li>프로젝트 생성 및 참여자 초대</li>
        <li>Creator / Participant 역할 기반 접근 제어</li>
        <li><b>복수 담당자</b> 업무 할당 (M:N 관계)</li>
        <li>첨부파일 업로드 지원 (Vercel Blob)</li>
        <li><b>프로젝트 종료</b> (보고서 첨부 + 피어리뷰)</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>📊 월간 업무 로그</h3>
      <ul>
        <li>연도/월 필터링으로 업무 히스토리 관리</li>
        <li>Bar / Line / Category 차트로 월간 통계 시각화</li>
        <li>월간 요약 위젯 (달성률, 완료 건수, 진행 현황)</li>
        <li>업무 검색 & 인라인 편집/삭제</li>
      </ul>
    </td>
    <td width="50%">
      <h3>⏱️ 근태 및 시간 관리</h3>
      <ul>
        <li><b>기기 인증 보안</b>: 최초 기기 자동 접속, 이후 기기 관리자 승인제도</li>
        <li><b>유연 근무제 지원</b>: 직원별 개별 출퇴근 기준 시간 설정 가능</li>
        <li>로그인 시 <b>자동 출근</b> (지각 자동 판정)</li>
        <li>퇴근 버튼으로 수동 퇴근 처리</li>
        <li>접속 기록 자동 로깅 (ActivityLog)</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>📅 캘린더 최적화</h3>
      <ul>
        <li>날짜별 <b>최대 3개</b> 업무 표시 + "+N건 더보기" 뱃지</li>
        <li><b>우선순위 자동 정렬</b> (지연→마감→미완료→완료)</li>
        <li>날짜 셀 클릭 → <b>Popover</b>로 전체 업무 리스트</li>
        <li>Popover 내 <b>빠른 완료 체크박스</b></li>
        <li>다일(Multi-day) 업무 Gantt 바 지원</li>
      </ul>
    </td>
    <td width="50%">
      <h3>✅ 하위업무 (SubTask)</h3>
      <ul>
        <li>업무별 하위업무 CRUD (추가/수정/삭제)</li>
        <li>상태 관리 (TODO → IN_PROGRESS → DONE)</li>
        <li>하위업무 완료율에 따른 상위 Task <b>자동 상태 갱신</b></li>
        <li>하위업무 담당자 지정 및 댓글 시스템</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>📄 PDF 리포트 자동 생성</h3>
      <ul>
        <li><b>주간(매주 금)</b> + <b>월간(매월 1일)</b> 자동 생성 (Vercel Cron)</li>
        <li><b>3계층 구조</b>: 전사 종합 → 부서별 → 개인별 PDF</li>
        <li><b>Gemini AI</b> 인사이트 코멘트 자동 포함</li>
        <li>한글 폰트(NotoSansKR) 임베딩</li>
        <li>Vercel Blob 보관 + 이메일 자동/수동 발송</li>
        <li>관리자 대시보드에서 이력 조회/다운로드/수신자 관리</li>
      </ul>
    </td>
    <td width="50%">
      <h3>🔔 알림 시스템</h3>
      <ul>
        <li><b>독촉 알림</b>: 프로젝트 생성자 → 담당자 업무 독촉</li>
        <li>24시간 쿨다운 (스팸 방지)</li>
        <li><b>마감 알림</b>: D-day 설정값 기반 지연 예정 업무 뱃지</li>
        <li>알림 벨 (30초 폴링, 읽음/미읽음 관리)</li>
        <li>개인 설정에서 알림 수신 ON/OFF</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🤖 AI 어시스턴트</h3>
      <ul>
        <li>Gemini 2.5 Flash 기반 업무 분석</li>
        <li>주간보고, 마감 알림, 지연 업무 등 <b>5종 프리셋</b></li>
        <li>업무 데이터 기반 맥락 인지 대화</li>
        <li>3모델 폴백 (2.5→2.0→1.5 Flash)</li>
      </ul>
    </td>
    <td width="50%">
      <h3>🛡️ 관리자 대시보드</h3>
      <ul>
        <li>사원 등록/수정/삭제 및 부서 관리</li>
        <li><b>전사 근태 현황 관리</b> 및 기기 인증(대기열) 승인 제어</li>
        <li>실시간 업무 추적 (진행률, 지연 현황)</li>
        <li>부서별 성과 비교 분석 차트</li>
        <li>활동 로그 감사 추적 (Audit Trail)</li>
        <li><b>PDF 리포트 관리</b> (생성/다운로드/이메일 발송)</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🔥 연간 히트맵</h3>
      <ul>
        <li>GitHub 스타일 연간 활동 히트맵</li>
        <li>일별 업무 달성도 색상 시각화</li>
        <li>연간 업무 리스트 & 통계 조회</li>
      </ul>
    </td>
    <td width="50%">
      <h3>📈 공헌도 자동 산출</h3>
      <ul>
        <li><b>프로젝트 업무에만</b> 자동 공헌도 산출</li>
        <li>산출: <code>기간 × 복잡도 × 기한보너스 ÷ 담당자수</code></li>
        <li><b>소요율 상한선</b>: 30% 미만 시 보너스 제한</li>
        <li>관리자(Admin) 전용 — 직원에게 <b>비공개</b></li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>💬 사내 메신저</h3>
      <ul>
        <li><b>1:1 DM</b> + <b>그룹 채팅</b> (Pusher 실시간 통신)</li>
        <li>대용량 파일 첨부 (이미지/PDF/문서, 최대 100MB)</li>
        <li>메시지 수정, 삭제, 답장, 고정, 이모지 리액션</li>
        <li>무한 스크롤 (과거 메시지 50개씩 로딩)</li>
        <li>낙관적 업데이트 (Optimistic UI) — 깜빡임 없는 전송</li>
      </ul>
    </td>
    <td width="50%">
      <h3>📁 자료실 (문서 관리)</h3>
      <ul>
        <li>계층형 폴더 구조 (하위 폴더 지원)</li>
        <li>문서 버전 관리 (업로드 이력 추적)</li>
        <li>Public / Private 공개 범위 설정</li>
        <li>결재 승인 문서 <b>자동 보관</b> (카테고리별 폴더 분류)</li>
        <li>문서 검색 기능</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>📝 전자결재 시스템</h3>
      <ul>
        <li><b>9종 카테고리</b>: 품의서, 지출결의서, 외근/출장보고서, 휴가, 시간외근무, 정부과제, 납품/검수확인서, 세금계산서 발행 요청서</li>
        <li>카테고리별 <b>문서형 양식</b> (엑셀 스타일 테이블 폼)</li>
        <li>자동 계산: 수량×단가=공급가, 공급가×10%=VAT, 합계 자동산출</li>
        <li>다단계 결재선 (순차 승인/반려) + 다중 첨부파일</li>
        <li><b>Webhook 연동</b>: 외부 시스템 결재 요청 수신 및 승인/반려 전송</li>
        <li>결재 승인 시 캘린더 자동 등록 + 출근부 자동 반영 + 문서 자동 보관</li>
      </ul>
    </td>
    <td width="50%">
      <h3>📥 결재 문서 PDF 다운로드</h3>
      <ul>
        <li>결재 목록에서 <b>체크박스 선택</b> → PDF 변환 다운로드</li>
        <li>카테고리별 HTML 템플릿 → html2canvas + jsPDF 변환</li>
        <li>단건: PDF 직접 다운로드 / 2건 이상: <b>ZIP 번들</b> 다운로드</li>
        <li>파일명 = 문서 제목 자동 매칭</li>
        <li>텍스트 검색 + 카테고리·상태 <b>필터링</b></li>
      </ul>
    </td>
  </tr>
</table>

---

## 🏗️ 기술 스택

<table>
  <thead>
    <tr>
      <th>영역</th>
      <th>기술</th>
      <th>설명</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>🖥️ Frontend</b></td>
      <td>
        <img src="https://img.shields.io/badge/Next.js_16-black?logo=next.js" alt="Next.js"/>
        <img src="https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black" alt="React"/>
        <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/>
      </td>
      <td>App Router 기반 SSR/CSR 하이브리드 렌더링</td>
    </tr>
    <tr>
      <td><b>🎨 Styling</b></td>
      <td>
        <img src="https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind"/>
        <img src="https://img.shields.io/badge/shadcn/ui-000?logo=shadcnui&logoColor=white" alt="shadcn"/>
      </td>
      <td>shadcn/ui 컴포넌트 + 다크/라이트 테마</td>
    </tr>
    <tr>
      <td><b>🤖 AI</b></td>
      <td>
        <img src="https://img.shields.io/badge/Gemini_2.5-8E75B2?logo=google&logoColor=white" alt="Gemini"/>
      </td>
      <td>AI 어시스턴트 + PDF 리포트 인사이트 자동 생성</td>
    </tr>
    <tr>
      <td><b>📄 PDF</b></td>
      <td>
        <img src="https://img.shields.io/badge/@react--pdf/renderer-E34F26?logo=adobeacrobatreader&logoColor=white" alt="react-pdf"/>
      </td>
      <td>서버사이드 PDF 생성 (한글 폰트 임베딩)</td>
    </tr>
    <tr>
      <td><b>📥 PDF Export</b></td>
      <td>
        <img src="https://img.shields.io/badge/jsPDF-E34F26?logo=adobeacrobatreader&logoColor=white" alt="jsPDF"/>
        <img src="https://img.shields.io/badge/html2canvas-4285F4?logo=html5&logoColor=white" alt="html2canvas"/>
        <img src="https://img.shields.io/badge/JSZip-F7DF1E?logo=files&logoColor=black" alt="JSZip"/>
      </td>
      <td>전자결재 문서 PDF 변환 + ZIP 번들 다운로드</td>
    </tr>
    <tr>
      <td><b>📈 Charts</b></td>
      <td>
        <img src="https://img.shields.io/badge/Recharts-FF6384?logo=chartdotjs&logoColor=white" alt="Recharts"/>
      </td>
      <td>Bar, Line, Category 차트 + 연간 히트맵</td>
    </tr>
    <tr>
      <td><b>🗃️ State</b></td>
      <td>
        <img src="https://img.shields.io/badge/Zustand-443E38?logo=react&logoColor=white" alt="Zustand"/>
      </td>
      <td>경량 전역 상태 관리</td>
    </tr>
    <tr>
      <td><b>🛢️ Database</b></td>
      <td>
        <img src="https://img.shields.io/badge/Prisma_ORM-2D3748?logo=prisma&logoColor=white" alt="Prisma"/>
        <img src="https://img.shields.io/badge/NeonDB-00E599?logo=postgresql&logoColor=black" alt="NeonDB"/>
      </td>
      <td>Prisma ORM + NeonDB (Serverless PostgreSQL)</td>
    </tr>
    <tr>
      <td><b>📦 Storage</b></td>
      <td>
        <img src="https://img.shields.io/badge/Vercel_Blob-000?logo=vercel&logoColor=white" alt="Vercel Blob"/>
      </td>
      <td>첨부파일, PDF 리포트, 프로젝트 보고서 저장</td>
    </tr>
    <tr>
      <td><b>💬 Realtime</b></td>
      <td>
        <img src="https://img.shields.io/badge/Pusher-300D4F?logo=pusher&logoColor=white" alt="Pusher"/>
      </td>
      <td>사내 메신저 실시간 통신 (WebSocket)</td>
    </tr>
    <tr>
      <td><b>📧 Email</b></td>
      <td>
        <img src="https://img.shields.io/badge/Nodemailer-22B573?logo=minutemailer&logoColor=white" alt="Nodemailer"/>
      </td>
      <td>Hiworks SMTP 연동, PDF 첨부 이메일 자동 발송</td>
    </tr>
    <tr>
      <td><b>☁️ Deploy</b></td>
      <td>
        <img src="https://img.shields.io/badge/Vercel_Pro-000?logo=vercel&logoColor=white" alt="Vercel"/>
      </td>
      <td>Vercel Pro 배포 + Cron Jobs (주간/월간 리포트)</td>
    </tr>
  </tbody>
</table>

---

## 📁 프로젝트 구조

```
keeper-calendar/
├── 📂 prisma/
│   └── schema.prisma              # DB 스키마 (23+ 모델)
├── 📂 public/
│   └── 📂 fonts/
│       └── NotoSansKR-Variable.ttf # 한글 폰트 (PDF용)
├── 📂 src/
│   ├── 📂 app/
│   │   ├── page.tsx               # 🏠 오피스 홈 대시보드 (3×3 위젯)
│   │   ├── 📂 monthly/           # 📊 월간 업무 로그
│   │   ├── 📂 login/              # 🔐 일반 사원 로그인
│   │   ├── 📂 projects/           # 🗂️ 프로젝트 목록 & 상세
│   │   ├── 📂 yearly/            # 🔥 연간 히트맵 & 통계
│   │   ├── 📂 approvals/          # 📝 전자결재 (9종 카테고리)
│   │   │   ├── page.tsx           #    결재 목록 + 검색/필터 + PDF 다운로드
│   │   │   ├── new/page.tsx       #    기안 작성 (문서형 양식)
│   │   │   └── pdf-utils.ts       #    PDF 변환 유틸리티
│   │   ├── 📂 chat/              # 💬 사내 메신저 (1:1/그룹)
│   │   ├── 📂 documents/         # 📁 자료실 (폴더/버전 관리)
│   │   ├── 📂 calendar/          # 📅 공유 캘린더
│   │   ├── 📂 kanban/            # 📋 칸반 보드
│   │   ├── 📂 settings/          # ⚙️ 개인 알림 설정
│   │   ├── 📂 admin/             # 🛡️ 관리자 전용
│   │   │   ├── employees/        #    사원 관리
│   │   │   ├── tracking/         #    실적 추적
│   │   │   ├── achievement/      #    성과 분석
│   │   │   ├── attendance/       #    ⏱️ 근태 및 기기 승인 관리
│   │   │   └── reports/          #    📄 PDF 리포트 관리
│   │   ├── 📂 actions/           # ⚡ Server Actions
│   │   │   ├── task.ts           #    업무 CRUD + 공헌도
│   │   │   ├── dashboard.ts      #    🏠 대시보드 위젯 데이터
│   │   │   ├── attendance.ts     #    ⏱️ 출퇴근 관리
│   │   │   ├── report.ts         #    📄 리포트 생성/발송/이력
│   │   │   ├── approval.ts        #    📝 전자결재 CRUD + 결재처리
│   │   │   ├── notification.ts   #    🔔 알림 (독촉/마감)
│   │   │   ├── ai-chat.ts        #    🤖 AI 어시스턴트
│   │   │   └── ...
│   │   └── 📂 api/
│   │       └── 📂 cron/          # ⏰ Vercel Cron
│   │           ├── weekly-report/ #    주간 리포트 (금 18:00 KST)
│   │           └── monthly-report/#    월간 리포트 (1일 09:00 KST)
│   ├── 📂 components/
│   │   ├── 📂 dashboard/         # 🏠 대시보드 위젯 (9개)
│   │   │   ├── UserProfileCard    #    프로필 + 알림 팝업
│   │   │   ├── MailWidget          #    알림 위젯
│   │   │   ├── LoginHistoryWidget  #    접속 기록
│   │   │   ├── AppGrid             #    바로가기
│   │   │   ├── TaskStatusWidget    #    업무 현황
│   │   │   ├── WorkClockWidget     #    근무 체크 (아날로그 시계)
│   │   │   ├── MiniCalendar        #    미니 캘린더
│   │   │   ├── TodayTaskWidget     #    오늘 할 일
│   │   │   ├── ActivityFeedWidget  #    활동 피드
│   │   │   └── WidgetPagination    #    공통 페이지네이션
│   │   ├── CalendarGrid.tsx       # 캘린더
│   │   ├── NotificationBell.tsx   # 🔔 알림 벨
│   │   ├── AIChatAssistant.tsx    # 🤖 AI 채팅
│   │   ├── CloseProjectDialog.tsx # 📋 프로젝트 종료
│   │   └── ...
│   ├── 📂 lib/
│   │   ├── 📂 report/            # 📄 PDF 리포트 엔진 (NEW)
│   │   │   ├── data-collector.ts  #    3계층 데이터 수집
│   │   │   ├── ai-insight.ts      #    Gemini AI 인사이트
│   │   │   ├── pdf-generator.ts   #    PDF 오케스트레이션
│   │   │   ├── email-sender.ts    #    이메일 발송
│   │   │   └── 📂 pdf-templates/
│   │   │       ├── CompanyReport.tsx     # 전사 종합 PDF
│   │   │       ├── DepartmentReport.tsx  # 부서별 PDF
│   │   │       ├── IndividualReport.tsx  # 개인별 PDF
│   │   │       └── shared-styles.ts     # 공통 스타일
│   │   ├── contribution.ts        # 공헌도 산출
│   │   └── statistics.ts          # 통계 유틸
│   └── 📂 store/                  # Zustand 전역 상태
└── vercel.json                    # Cron 스케줄 설정
```

---

## 🗃️ 데이터베이스 스키마

```mermaid
erDiagram
    Department ||--o{ User : contains
    User ||--o{ Task : assigned
    User }o--o{ Task : multi_assigned
    User ||--o{ Project : creates
    User }o--o{ Project : participates
    User ||--o{ Notification : receives
    User ||--o{ Attendance : records
    Project ||--o{ Task : has
    Project ||--o{ PeerReview : has
    Task ||--o{ SubTask : contains
    Task ||--o{ Attachment : has
    ReportSet ||--o{ Report : contains

    Department {
        string id PK
        string name UK
    }
    User {
        string id PK
        string name
        enum role
        string departmentId FK
        string workStartTime
        string workEndTime
    }
    Project {
        string id PK
        string name
        enum status
        string creatorId FK
        datetime closedAt
    }
    Task {
        string id PK
        string title
        enum status
        enum priority
        float contributionScore
        datetime endDate
        datetime completedAt
        boolean isUrgent
    }
    SubTask {
        string id PK
        string title
        enum status
        boolean isCompleted
    }
    Attendance {
        string id PK
        string userId FK
        datetime clockIn
        datetime clockOut
        float totalHours
    }
    Notification {
        string id PK
        enum type
        string senderId FK
        string recipientId FK
        boolean isRead
    }
    ReportSet {
        string id PK
        enum type
        string periodLabel
        enum status
        datetime sentAt
    }
    Report {
        string id PK
        enum scope
        string scopeLabel
        string pdfUrl
        string aiInsight
    }
    ReportRecipient {
        string id PK
        string email UK
        string name
        boolean isActive
    }
    PeerReview {
        string id PK
        string projectId FK
        string reviewerId FK
        int score
    }
    ApprovalRequest {
        string id PK
        string title
        string content
        enum category
        enum status
        string requesterId FK
        string formData "JSON"
    }
    ApprovalStep {
        string id PK
        string requestId FK
        string approverId FK
        int stepOrder
        enum status
        string comment
    }
    User ||--o{ ApprovalRequest : requests
    ApprovalRequest ||--o{ ApprovalStep : has
    ApprovalRequest ||--o{ ApprovalAttachment : has
    User ||--o{ ApprovalStep : approves
    User ||--o{ ChatMember : joins
    ChatRoom ||--o{ ChatMember : has
    ChatRoom ||--o{ ChatMessage : contains
    User ||--o{ ChatMessage : sends
    User ||--o{ Document : uploads
    DocFolder ||--o{ Document : contains

    ChatRoom {
        string id PK
        string name
        boolean isGroup
    }
    ChatMessage {
        string id PK
        string content
        string fileUrl
        string fileName
    }
    ApprovalAttachment {
        string id PK
        string name
        string url
        int size
    }
    DocFolder {
        string id PK
        string name
        string parentId FK
    }
    Document {
        string id PK
        string name
        string currentUrl
        enum visibility
    }
```

---

## 🚀 Getting Started

### 사전 요구사항

- **Node.js** 18.17 이상
- **npm** 또는 **pnpm**
- **NeonDB** 계정 ([neon.tech](https://neon.tech))
- **Vercel Pro** 계정 (Cron Jobs 사용 시)
- **Gemini API Key** ([ai.google.dev](https://ai.google.dev))

### 설치 & 실행

```bash
# 1. 저장소 클론
git clone https://github.com/HANMIRYANG/KeeperCalendar.git
cd keeper-calendar

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env
```

`.env` 파일에 아래 내용을 설정합니다:

```env
# 필수
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
BLOB_READ_WRITE_TOKEN="vercel_blob_token"
GEMINI_API_KEY="your_gemini_api_key"
ADMIN_ID="admin_username"
ADMIN_PASSWORD="admin_password"

# PDF 리포트 이메일 발송 (선택)
EMAIL_HOST=smtps.hiworks.com
EMAIL_PORT=465
EMAIL_USER=sender@company.com
EMAIL_PASS=password
EMAIL_FROM="Keeper Calendar <sender@company.com>"

# Vercel Cron 인증 (선택)
CRON_SECRET=your_cron_secret
```

```bash
# 4. Prisma 클라이언트 생성 & DB 스키마 동기화
npx prisma generate
npx prisma db push

# 5. 개발 서버 실행
npm run dev
```

> 브라우저에서 [http://localhost:3000](http://localhost:3000) 으로 접속합니다.

---

## 🔐 인증 구조

| 구분 | 접근 경로 | 인증 방식 |
|------|----------|----------|
| **일반 사원** | `/login` | 이름(ID) + 생년월일(PW) |
| **관리자** | `/admin/login` | 환경변수 기반 계정 (`ADMIN_ID`, `ADMIN_PASSWORD`) |

---

## ⏰ 자동 스케줄

| 작업 | 주기 | 시간 (KST) | 경로 |
|------|------|-----------|------|
| 주간 리포트 | 매주 금요일 | 18:00 | `/api/cron/weekly-report` |
| 월간 리포트 | 매월 1일 | 09:00 | `/api/cron/monthly-report` |

> Vercel Cron Jobs는 Pro 플랜 이상에서 사용 가능합니다.

---

## 📜 주요 npm 스크립트

| 스크립트 | 설명 |
|---------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | Prisma 생성 + 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 검사 |

---

## 🛠️ 개발 및 디버깅 히스토리

본 프로젝트는 AI와의 페어 프로그래밍을 통해 지속적으로 구조를 개선하고 기능을 확장해 왔습니다. 주요 개발 및 트러블슈팅 내역은 다음과 같습니다.

### 1️⃣ Task 협업 시스템 강화 (Multi-Assignee & SubTask)
- **이슈**: 기존 1:N 구조에서는 하나의 업무를 여러 명이 공동으로 담당할 수 없었음.
- **해결**: Prisma 스키마를 N:M(다대다) 구조(`assignees`)로 마이그레이션.
- **기능 추가**: 하위업무(Sub-Task) 단계를 `TODO`, `IN_PROGRESS`, `DONE` 세분화 및 하위업무별 담당자 지정.
- **UI 반영**: 달력(Calendar) 및 업무 수정 모달에서 다중 담당자 아바타/이름 정상 표출되도록 컴포넌트 전면 개편.

### 2️⃣ 데이터 무결성 및 Activity Logging 방어
- **이슈**: NeonDB / Prisma 환경에서 잘못된 CASCADE 설정으로 인해 계정 삭제 시 관련 프로젝트 전체가 날아가는 위험성 존재.
- **해결**: 외래키의 `onDelete: Cascade` 범위를 면밀히 수정하고, 모든 CRUD 액션에 안전하게 로그를 남기는 `ActivityLog` 트랜잭션 패턴 도입.
- **더미 데이터**: `/scripts/seed_dummy.cjs`를 통해 `User` 외의 테이블을 초기화 및 테스트할 수 있는 프레임워크 구축.

### 3️⃣ 보고서 듀얼 트랙 시스템 (Dual-Track Reports)
- **이슈**: 프로젝트 생성자(Creator)와 최고 관리자(Admin)가 보는 성과 데이터의 투명성/기밀성 분리가 필요.
- **해결**: 전사/부서별/개인별로 권한에 맞춰 접근 가능한 PDF 리포트 3계층 자동 생성 시스템 도입 (Gemini AI 분석 연동 + Vercel Cron).

### 4️⃣ 관리자 대시보드 및 커스텀 유연 근무제
- **이슈**: 일반 직원용 페이지 내에 관리자 탭이 노출될 때, 데이터베이스 상의 권한 필드 부재 및 인증 상태 꼬임(Hydration 에러).
- **해결**:
  - `Role` (CREATOR/PARTICIPANT)과 글로벌 `Admin` 권한을 스토리지 기반으로 완전 분리.
  - Zustand `persist`의 `_hasHydrated` 검증 로직을 `AdminLayout`에 추가하여, 새로고침 시 로그인 화면으로 튕기는 **Hydration Race Condition 버그 철저히 디버깅 및 완벽 해결**.
  - `User` 모델에 `workStartTime`, `workEndTime` 필드 추가하여, 09:00 출근이 아닌 사람도 지각 여부를 동적으로 판정하는 **개인별 유연 근무제** 적용.

### 5️⃣ 기기 인증 및 보안 출퇴근 (Device Auth)
- **이슈**: 웹 캘린더 특성상 대리 출석 방지가 필요하나, 매일 로그인할 때마다 인증하는 것은 UX를 훼손함.
- **해결**: `localStorage`의 `keeper_device_token`과 DB의 `DeviceToken` 모델을 연동.
  - **첫 번째 기기**: 별도 승인 없이 자동 `APPROVED`.
  - **두 번째 기기 이상**: `PENDING` 처리 후 관리자 페이지(`/admin/attendance` 대기열 탭)에서 수동 승인하는 안전한 하이브리드 인증 로직 구현.

### 6️⃣ CI/CD 파이프라인 최적화
- **이슈**: `README.md` 등 문서만 수정했을 때도 Vercel 빌드가 트리거되어 빌드 시간(Build Minutes) 낭비 발생.
- **해결**: 커밋 메시지 `[skip ci]` 컨벤션 도입 및 Vercel Dashboard의 *Ignored Build Step* 규칙(`git diff --quiet HEAD^ HEAD ./src/ ...`) 적용하여 코어 소스 변경 시에만 배포되도록 설정.

### 7️⃣ 사내 메신저 도입 및 실시간 통신 최적화 (Team Messenger)
- **이슈**: Pusher를 활용한 실시간 채팅 시스템(1:1 및 그룹) 구현 중 Next.js Server Action의 강력한 정적 캐싱(Caching)으로 인해 방 생성 후 목록이 갱신되지 않는 동기화 버그 발생. 또한 Prisma Client의 읽기 전용(Frozen) 배열을 변이 시도하여 생기는 에러(`reverse()`) 및 Schema Relation 누락으로 인한 `Unknown field` 런타임 에러 발생.
- **해결**:
  - `noStore()` 및 무작위 타임스탬프 기반 캐시 버스팅을 적용하여 Vercel 배포 환경에서도 실시간으로 방 목록과 메시지가 동기화되도록 완전 수정.
  - 배열 복사(`[...msgs].reverse()`) 및 Date 타입 직렬화(Serialization) 안전 보장 코드를 적용하여 JS 동결 객체 에러를 원천 차단.
  - `ChatMember`, `ChatMessage` 모델과 `User` 테이블 모델 간의 관계식(`@relation`)을 명시하여 클라우드 DB 구조를 견고히 완성.
  - **프로필 아바타 매핑 보완**: Vercel Blob에 저장된 `profileImageUrl`을 올바르게 매핑하여 채팅방 UI에 상대방의 진짜 얼굴과 이름이 연동되도록 마무리.

### 8️⃣ 사내 메신저 고도화 (대용량 첨부파일 및 UI/UX 성능 최적화)
- **이슈**: 기본 채팅 기능 구축 이후, 대용량 파일 첨부의 필요성과 함께 메시지 증가 시 스크롤러 동작 불능, 그리고 메시지 전송 시 전체 페이지 깜빡임(Flickering) 현상이 보고됨.
- **해결**:
  - **Vercel Blob Client Upload 도입**: 서버 부하를 방지하고 최대 100MB의 이미지 및 문서(PDF, 오피스 등)를 프론트엔드에서 다이렉트로 안전하게 업로드할 수 있는 채팅 전용 클라이언트 API 라우트 신설.
  - **낙관적 업데이트 (Optimistic UI)**: 메시지와 파일을 보내는 즉시 UI에 가상 객체(uploading) 상태로 반영하고, Pusher 이벤트 수신 구조를 개편하여 기존 `revalidatePath`로 인한 렌더링 깜빡임을 완전히 근절.
  - **Pusher Client Singleton 패턴**: Next.js HMR(핫 모듈 교체) 환경 및 잦은 재렌더링 시 Pusher 인스턴스가 무한 증식하는 메모리 누수를 `globalThis` 패턴으로 차단하여 소켓 연결 안정성 100% 확보.
  - **Native Scroll & 무한 스크롤(Pagination)**: 동적 이미지 높이와 충돌하던 UI 라이브러리 스크롤러를 제거. 마우스 휠 업(올리기) 시 과거 메시지를 50개씩 부드럽게 무한 추가 로딩하는 핸들러(`scrollTop === 0`)를 네이티브 CSS와 연동하여 말풍선 레이아웃 붕괴 문제까지 완벽 해결.

### 9️⃣ 전자결재 시스템 구축 및 PDF 다운로드 (Electronic Approval & PDF Export)
- **이슈**: 사내 품의서, 지출결의서, 외근보고서 등을 종이 기반으로 처리하던 프로세스를 디지털화할 필요가 있었음.
- **해결**:
  - **9종 카테고리별 문서형 양식** 구현: 품의서(GENERAL), 지출결의서(EXPENSE), 외근/출장보고서(BUSINESS_TRIP), 휴가(VACATION), 시간외근무(OVERTIME), 정부과제(GRANT_APPLICATION), 납품/검수확인서(INSPECTION), 세금계산서 발행 요청서(TAX_INVOICE). HTML 테이블 기반 엑셀 스타일 폼으로 실제 사내 문서 양식과 동일한 레이아웃 재현.
  - **자동 계산 로직**: 지출결의서·납품검수·세금계산서의 수량×단가=공급가액, 공급가×10%=세액(VAT), 합계 자동산출을 `useMemo`로 실시간 반영. 빈 값은 공백 처리(#VALUE! 방지). 동적 행 추가/삭제(계정, 지출내역, 일정, 품목 등).
  - **다중 첨부파일**: Vercel Blob 기반 다중 파일 업로드. 품의서, 지출결의서, 외근보고서, 정부과제, 납품/검수, 세금계산서에서 로컬 파일 선택 방식 지원.
  - **승인 후 자동화**: 휴가/외근/출장 승인 시 공유 캘린더 이벤트 자동 생성 + 출근부 자동 반영. 모든 결재 문서 자동 보관(카테고리별 폴더 분류).
  - **다음 우편번호 API**: 외근/출장 보고서의 장소 입력에 Daum Postcode API 연동. 클릭 시 주소 검색 팝업 → 도로명 주소 자동 입력.
  - **다단계 결재선**: 순차 승인/반려 워크플로우(WAITING→PENDING→APPROVED/REJECTED). 결재자 지정 UI(ApproverPicker).
  - **검색/필터**: 텍스트 검색 + 카테고리 필터 + 상태 필터로 결재 목록 클라이언트 사이드 필터링.
  - **PDF 다운로드**: 체크박스 선택 방식으로 원하는 결재 건만 선택 후 PDF 변환. `html2canvas` + `jsPDF`로 카테고리별 HTML 템플릿을 PDF로 변환하되, **iframe 격리 렌더링**으로 다크모드 CSS(`lab()` 색상 함수)와의 충돌 해결. 2건 이상은 `JSZip`으로 ZIP 번들 다운로드.
  - **Webhook 연동**: 외부 시스템(정부과제 공고 등)에서 결재 요청을 수신하고 승인/반려 결과를 전송하는 API 엔드포인트 구축.
  - **DB 설계**: `formData: String?` 필드에 JSON을 저장하여 카테고리별 상이한 폼 데이터를 스키마 변경 없이 유연하게 수용. 기존 데이터와 신규 데이터 포맷 호환성 처리.

---

## 📄 License

This project is private and proprietary.

---

<div align="center">

**Built with ❤️ using Next.js, NeonDB & Gemini AI**

<sub>© 2026 Keeper Calendar — 한미르(주). All rights reserved.</sub>

</div>

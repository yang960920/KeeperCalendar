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

<br/>

**Keeper Calendar**는 팀의 업무를 체계적으로 관리하고, 실시간 성과를 추적하며,  
프로젝트 단위 협업을 지원하는 **올인원 업무 관리 플랫폼**입니다.

[🚀 라이브 데모](#) · [📖 문서](#getting-started) · [🐛 이슈 리포트](../../issues)

</div>

---

## ✨ 주요 기능

<table>
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
      <h3>🗂️ 프로젝트 협업</h3>
      <ul>
        <li>프로젝트 생성 및 참여자 초대</li>
        <li>Creator / Participant 역할 기반 접근 제어</li>
        <li><b>복수 담당자</b> 업무 할당 (M:N 관계)</li>
        <li>첨부파일 업로드 지원 (Vercel Blob)</li>
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
      <h3>🔥 연간 히트맵</h3>
      <ul>
        <li>GitHub 스타일 연간 활동 히트맵</li>
        <li>일별 업무 달성도 색상 시각화</li>
        <li>연간 업무 리스트 & 통계 조회</li>
      </ul>
    </td>
    <td width="50%">
      <h3>🛡️ 관리자 대시보드</h3>
      <ul>
        <li>사원 등록/수정/삭제 및 부서 관리</li>
        <li>실시간 업무 추적 (진행률, 지연 현황)</li>
        <li>부서별 성과 비교 분석 차트</li>
        <li>활동 로그 감사 추적 (Audit Trail)</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <h3>📈 공헌도 자동 산출 시스템</h3>
      <ul>
        <li><b>프로젝트 업무에만</b> 자동 공헌도 산출 (개인 업무 제외)</li>
        <li>산출 공식: <code>기간 기반 점수 × 복잡도(SubTask 수) × 기한 보너스 ÷ 담당자 수</code></li>
        <li><b>소요율 상한선</b>: 설정 기간 대비 실제 소요 30% 미만 시 보너스 제한 (악용 방지)</li>
        <li>관리자(Admin) 전용 — 부서장·직원에게 <b>비공개</b></li>
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
      <td>App Router 기반 SSR/CSR 하이브리드 렌더링, React 19 최신 기능 활용</td>
    </tr>
    <tr>
      <td><b>🎨 Styling</b></td>
      <td>
        <img src="https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind"/>
        <img src="https://img.shields.io/badge/Radix_UI-161618?logo=radixui&logoColor=white" alt="Radix UI"/>
        <img src="https://img.shields.io/badge/shadcn/ui-000?logo=shadcnui&logoColor=white" alt="shadcn"/>
      </td>
      <td>shadcn/ui 컴포넌트 시스템 + 다크/라이트 테마 지원</td>
    </tr>
    <tr>
      <td><b>📈 Charts</b></td>
      <td>
        <img src="https://img.shields.io/badge/Recharts-FF6384?logo=chartdotjs&logoColor=white" alt="Recharts"/>
        <img src="https://img.shields.io/badge/HeatMap-green" alt="HeatMap"/>
      </td>
      <td>Recharts 기반 Bar, Line, Category 차트 + 연간 히트맵 시각화</td>
    </tr>
    <tr>
      <td><b>🗃️ State</b></td>
      <td>
        <img src="https://img.shields.io/badge/Zustand-443E38?logo=react&logoColor=white" alt="Zustand"/>
      </td>
      <td>경량 전역 상태 관리 (Task, Project, Auth, Admin Store)</td>
    </tr>
    <tr>
      <td><b>🛢️ Database</b></td>
      <td>
        <img src="https://img.shields.io/badge/Prisma_ORM-2D3748?logo=prisma&logoColor=white" alt="Prisma"/>
        <img src="https://img.shields.io/badge/NeonDB-00E599?logo=postgresql&logoColor=black" alt="NeonDB"/>
      </td>
      <td>Prisma ORM + NeonDB (Serverless PostgreSQL) 연동</td>
    </tr>
    <tr>
      <td><b>📦 Storage</b></td>
      <td>
        <img src="https://img.shields.io/badge/Vercel_Blob-000?logo=vercel&logoColor=white" alt="Vercel Blob"/>
      </td>
      <td>첨부파일 및 이력서 업로드 (클라이언트 사이드 업로드)</td>
    </tr>
    <tr>
      <td><b>☁️ Deploy</b></td>
      <td>
        <img src="https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white" alt="Vercel"/>
      </td>
      <td>Vercel 플랫폼 자동 배포 (CI/CD)</td>
    </tr>
  </tbody>
</table>

---

## 📁 프로젝트 구조

```
keeper-calendar/
├── 📂 prisma/
│   └── schema.prisma          # DB 스키마 (User, Project, Task, SubTask, ActivityLog 등)
├── 📂 scripts/
│   └── seed.ts                # 초기 데이터 시딩 스크립트
├── 📂 src/
│   ├── 📂 app/
│   │   ├── page.tsx           # 🏠 메인 (월간 로그 대시보드)
│   │   ├── 📂 login/          # 🔐 일반 사원 로그인
│   │   ├── 📂 projects/       # 🗂️ 프로젝트 목록 & 상세
│   │   ├── 📂 yearly/         # 🔥 연간 히트맵 & 통계
│   │   ├── 📂 admin/          # 🛡️ 관리자 전용
│   │   │   ├── login/         #    관리자 로그인
│   │   │   ├── employees/     #    사원 관리
│   │   │   ├── tracking/      #    실적 추적
│   │   │   └── achievement/   #    성과 분석 (공헌도 포함)
│   │   ├── 📂 actions/        # ⚡ Server Actions
│   │   │   ├── task.ts        #    업무 CRUD + 공헌도 산출 + 활동 로그
│   │   │   ├── achievement.ts #    성과 통계 (contributionScore 기반)
│   │   │   ├── project.ts     #    프로젝트 생성
│   │   │   ├── employee.ts    #    사원 관리 + 인증
│   │   │   ├── tracking.ts    #    실적 데이터 조회
│   │   │   └── init.ts        #    초기 데이터 로드
│   │   └── 📂 api/            # API Routes
│   ├── 📂 components/
│   │   ├── CalendarGrid.tsx        # 캘린더 그리드 (최대 3개 + 우선순위 정렬)
│   │   ├── DayDetailPopover.tsx    # 날짜 상세 Popover (전체 업무 리스트)
│   │   ├── HeatmapCalendar.tsx     # 연간 히트맵
│   │   ├── MonthlyBarChart.tsx     # 월별 Bar 차트
│   │   ├── MonthlyLineChart.tsx    # 월별 Line 차트
│   │   ├── CategoryBarChart.tsx    # 카테고리별 차트
│   │   ├── MonthlySummaryWidget.tsx# 월간 요약 위젯
│   │   ├── TaskForm.tsx            # 업무 등록 폼
│   │   ├── ProjectTaskForm.tsx     # 프로젝트 업무 할당 폼
│   │   ├── EditTaskDialog.tsx      # 업무 수정 다이얼로그
│   │   ├── SubTaskPanel.tsx        # 하위업무 관리 패널
│   │   ├── SubTaskInput.tsx        # 하위업무 입력 컴포넌트
│   │   ├── CreateProjectDialog.tsx # 프로젝트 생성 다이얼로그
│   │   ├── Navigation.tsx          # 사이드바 네비게이션
│   │   ├── AuthProvider.tsx        # 인증 Provider
│   │   ├── 📂 admin/              # 관리자 전용 컴포넌트
│   │   └── 📂 ui/                 # shadcn/ui 기본 컴포넌트
│   ├── 📂 store/              # Zustand 전역 상태
│   │   ├── useTaskStore.ts    #    업무 상태 관리
│   │   ├── useProjectStore.ts #    프로젝트 상태 관리
│   │   ├── useAuthStore.ts    #    인증 상태 관리
│   │   └── useAdminStore.ts   #    관리자 상태 관리
│   ├── 📂 hooks/              # Custom React Hooks
│   └── 📂 lib/                # 유틸리티
│       ├── prisma.ts          #    Prisma Client
│       └── contribution.ts    #    공헌도 자동 산출 유틸리티
└── package.json
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
    User ||--o{ ActivityLog : performs
    Project ||--o{ Task : has
    Project ||--o{ ActivityLog : logs
    Task ||--o{ SubTask : contains
    Task ||--o{ Attachment : has
    Task ||--o{ ActivityLog : logs

    Department {
        string id PK
        string name UK
    }
    User {
        string id PK
        string name
        string password
        enum role
        string departmentId FK
        string resumeUrl
    }
    Project {
        string id PK
        string name
        string category
        string creatorId FK
        datetime startDate
        datetime endDate
    }
    Task {
        string id PK
        string title
        string description
        enum status
        enum priority
        float planned
        float contributionScore
        string projectId FK
        string assigneeId FK
        datetime dueDate
        datetime endDate
        datetime completedAt
    }
    SubTask {
        string id PK
        string title
        string description
        boolean isCompleted
        enum status
        string taskId FK
        string assigneeId FK
        datetime dueDate
        datetime completedAt
    }
    Attachment {
        string id PK
        string name
        string url
        int size
        string type
        string taskId FK
    }
    ActivityLog {
        string id PK
        string action
        string entityType
        string entityId
        string details
        string userId FK
        string projectId FK
        string taskId FK
    }
```

---

## 🚀 Getting Started

### 사전 요구사항

- **Node.js** 18.17 이상
- **npm** 또는 **pnpm**
- **NeonDB** 계정 ([neon.tech](https://neon.tech))
- **Vercel** 계정 (배포 시)

### 설치 & 실행

```bash
# 1. 저장소 클론
git clone https://github.com/your-username/keeper-calendar.git
cd keeper-calendar

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env
```

`.env` 파일에 아래 내용을 설정합니다:

```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
BLOB_READ_WRITE_TOKEN="vercel_blob_token_here"
```

```bash
# 4. Prisma 클라이언트 생성 & DB 스키마 동기화
npx prisma generate
npx prisma db push

# 5. 초기 데이터 시딩 (부서 데이터)
npm run seed

# 6. 개발 서버 실행
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

## 📜 주요 npm 스크립트

| 스크립트 | 설명 |
|---------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | Prisma 생성 + 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run seed` | 초기 부서 데이터 시딩 |
| `npm run lint` | ESLint 검사 |

---

## 📄 License

This project is private and proprietary.

---

<div align="center">

**Built with ❤️ using Next.js & NeonDB**

<sub>© 2026 Keeper Calendar. All rights reserved.</sub>

</div>

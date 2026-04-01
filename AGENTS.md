# \# KeeperCalendar 프로젝트 공통 규칙

# 

# \## 기술 스택 (현재 사용 중)

# \- Framework: Next.js 16 (App Router) + TypeScript

# \- ORM: Prisma + NeonDB

# \- Realtime: Pusher

# \- File Storage: Vercel Blob

# \- State: Zustand

# \- Styling: Tailwind CSS + shadcn/ui

# 

# 위 스택을 다른 기술로 교체하고 싶은 경우,

# 코드를 바꾸지 말고 교체 이유와 영향 범위를 먼저 보고할 것.

# 그게 아니라면 그냥 진행 후 보고.



# \## 코드 작성 규칙

# \- App Router 기반 서버/클라이언트 컴포넌트 구분을 엄격히 지킬 것

# \- Pusher 이벤트 trigger는 반드시 서버 사이드에서만 수행할 것

# \- Zustand store의 기존 shape을 임의로 변경하지 말 것

# \- 파일 수정 시 관련 import/export 체인을 반드시 확인할 것

# 

# \## GitHub Push 규칙



# \- GitHub Push 의 경우 Commit 할 내용을 1줄 요약해서 텍스트로 맨 마지막에 첨부해주고 Push는 사용자가 직접 진행할 예정이니 절대로 먼저 진행하지말 것


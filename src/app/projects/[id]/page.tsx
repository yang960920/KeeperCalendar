"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft, CalendarClock } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useStore } from "@/hooks/useStore";
import { CalendarGrid } from "@/components/CalendarGrid";
import { Button } from "@/components/ui/button";
import { ProjectTaskForm } from "@/components/ProjectTaskForm";
import { EditTaskDialog } from "@/components/EditTaskDialog";
import { EditProjectDialog } from "@/components/EditProjectDialog";
import { ManageParticipantsDialog } from "@/components/ManageParticipantsDialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getEmployees } from "@/app/actions/employee";
import { ProjectProgressWidget } from "@/components/ProjectProgressWidget";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const projectId = resolvedParams.id;

    const user = useAuthStore((state) => state.user);
    const projects = useProjectStore((state) => state.projects);
    const tasks = useStore(useTaskStore, (state) => state.tasks) || [];

    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        async function fetchUsers() {
            const res = await getEmployees();
            if (res.success && res.data) {
                setUsers(res.data);
            }
        }
        fetchUsers();
    }, []);

    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(String(Math.max(2026, currentDate.getFullYear())));
    const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));

    const project = projects.find(p => p.id === projectId);

    if (!project) {
        return <div className="p-8">프로젝트를 찾을 수 없습니다.</div>;
    }

    // Role check: Only creator or participants can see this
    if (user && user.id !== project.creatorId && !project.participantIds.includes(user.id)) {
        return <div className="p-8 text-red-500">이 프로젝트에 접근할 권한이 없습니다.</div>;
    }

    // Filter tasks by project and month
    const targetPrefix = `${selectedYear}-${selectedMonth.padStart(2, "0")}`;

    // 이 프로젝트에 속한 전체 월별 업무
    const projectMonthTasks = tasks.filter(t => t.date.startsWith(targetPrefix) && t.projectId === projectId);

    // 프로젝트 생성자인지 여부로 판단 (전역 role이 아닌 프로젝트별)
    const isProjectCreator = user?.id === project.creatorId;

    // 프로젝트 생성자는 전체 업무를 보고, 참여자는 자신에게 할당된 업무만 보인다.
    const visibleTasks = isProjectCreator
        ? projectMonthTasks
        : projectMonthTasks.filter(t =>
            t.assigneeId === user?.id ||
            (t.assigneeIds && t.assigneeIds.includes(user?.id || ''))
        );

    // 종료일 경과 확인
    const isOverdue = project.endDate && new Date(project.endDate) < new Date();

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 p-8 max-w-7xl mx-auto flex flex-col h-full">
            <header className="mb-8 border-b pb-6">
                <Button variant="ghost" className="mb-4 pl-0" onClick={() => router.push("/projects")}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> 목록으로 돌아가기
                </Button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">PROJECT</span>
                            <h1 className="text-3xl font-extrabold tracking-tight">{project.title}</h1>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4 flex-wrap">
                            <span>생성자: {project.creatorId}</span>
                            <span>참여 인원: {project.participantIds.map(id => {
                                const found = users.find(u => u.id === id);
                                return found ? found.name : id;
                            }).join(', ')}</span>
                            {project.endDate && (
                                <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500 font-semibold" : ""}`}>
                                    <CalendarClock className="h-3.5 w-3.5" />
                                    종료일: {format(new Date(project.endDate), "yyyy.MM.dd")}
                                    {isOverdue && " (만료)"}
                                </span>
                            )}
                        </div>
                        {/* Creator 전용 관리 버튼 */}
                        {user?.role === "CREATOR" && user.id === project.creatorId && (
                            <div className="flex items-center gap-2 mt-3">
                                <EditProjectDialog project={project} userId={user.id} />
                                <ManageParticipantsDialog project={project} userId={user.id} />
                            </div>
                        )}
                    </div>

                    {/* 월 선택 필터 */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[100px] h-9">
                                <SelectValue placeholder="연도" />
                            </SelectTrigger>
                            <SelectContent>
                                {[2026, 2027, 2028, 2029, 2030].map(year => (
                                    <SelectItem key={year} value={String(year)}>{year}년</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[90px] h-9">
                                <SelectValue placeholder="월" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                    <SelectItem key={month} value={String(month)}>{month}월</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </header>

            {/* 프로젝트 진행도 위젯 */}
            <ProjectProgressWidget projectId={projectId} tasks={projectMonthTasks} />

            <main className="flex-1">
                {/* 캘린더 그리드 영역 */}
                <div className="mt-8">
                    <CalendarGrid
                        year={selectedYear}
                        month={selectedMonth}
                        tasks={visibleTasks}
                        onTaskClick={(t) => setSelectedTask(t)}
                        userRole={user?.role}
                        currentUserId={user?.id}
                        projectCreatorId={project.creatorId}
                    />
                </div>
            </main>

            {/* 역할(Role)에 따른 업무 생성 버튼: 생성자만 보임 */}
            {user?.role === "CREATOR" && (
                <ProjectTaskForm
                    projectId={projectId}
                    participants={project.participantIds}
                    projectEndDate={project.endDate}
                />
            )}

            {/* 수정 컴포넌트 마운트 */}
            {selectedTask && (
                <EditTaskDialog
                    task={selectedTask}
                    open={!!selectedTask}
                    onOpenChange={(open) => !open && setSelectedTask(null)}
                    readonly={!isProjectCreator} // 작성자 외에는 읽기/파일첨부만 가능 (체크박스는 캘린더에서 완수)
                />
            )}
        </div>
    );
}

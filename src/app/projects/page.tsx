"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, FolderKanban, CalendarClock } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectStore } from "@/store/useProjectStore";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 12;

export default function ProjectsPage() {
    const user = useAuthStore((state) => state.user);
    const projects = useProjectStore((state) => state.projects);
    const [currentPage, setCurrentPage] = useState(1);

    // Filter projects where current user is the creator or a participant
    const visibleProjects = projects.filter((project) => {
        if (!user) return false;
        return project.creatorId === user.id || project.participantIds.includes(user.id);
    });

    // Pagination logic
    const totalPages = Math.ceil(visibleProjects.length / ITEMS_PER_PAGE);
    const paginatedProjects = visibleProjects.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    // 종료일 경과 여부 확인
    const isOverdue = (endDate: string) => {
        if (!endDate) return false;
        return new Date(endDate) < new Date();
    };

    if (!user) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
                프로젝트 기능은 로그인 후 이용할 수 있습니다.
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2">
                        <FolderKanban className="h-8 w-8" />
                        협업 프로젝트
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">참여 중인 프로젝트의 달력을 확인하고 업무를 관리하세요.</p>
                </div>
                <CreateProjectDialog />
            </header>

            {/* 4x3 Grid Area */}
            <div className="flex-1">
                {visibleProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl text-muted-foreground mt-8">
                        <p>현재 참여 중인 프로젝트가 없습니다.</p>
                        <p className="text-sm mt-2">우측 상단의 버튼을 눌러 새 프로젝트를 생성해보세요.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-max">
                        {paginatedProjects.map((project) => (
                            <Link
                                href={`/projects/${project.id}`}
                                key={project.id}
                                className="group relative bg-card border hover:border-primary/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col"
                            >
                                <div className="mb-4">
                                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                        {project.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        생성일: {format(new Date(project.createdAt), "yyyy.MM.dd")}
                                    </p>
                                    {project.endDate && (
                                        <p className={`text-xs mt-0.5 flex items-center gap-1 ${isOverdue(project.endDate) ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                                            <CalendarClock className="h-3 w-3" />
                                            종료일: {format(new Date(project.endDate), "yyyy.MM.dd")}
                                            {isOverdue(project.endDate) && " (만료)"}
                                        </p>
                                    )}
                                </div>
                                <div className="mt-auto pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                                    <span>생성자: {project.creatorId}</span>
                                    <span>참여자: {project.participantIds.length}명</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}

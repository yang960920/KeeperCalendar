"use client";

import { useState, useEffect, useMemo } from "react";
import { format, addMonths } from "date-fns";
import { Plus, ChevronRight, X, Search } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { useAuthStore } from "@/store/useAuthStore";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getEmployees } from "@/app/actions/employee";
import { createProject } from "@/app/actions/project";

export const CreateProjectDialog = () => {
    const user = useAuthStore((state) => state.user);
    const addProject = useProjectStore((state) => state.addProject);
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function fetchUsers() {
            const res = await getEmployees();
            if (res.success && res.data) {
                setUsers(res.data);
            }
        }
        fetchUsers();
        setEndDate(format(addMonths(new Date(), 1), "yyyy-MM-dd"));
    }, []);

    // Only creators can create projects
    if (user?.role !== "CREATOR") return null;

    const availableUsers = users.filter(u => u.id !== user.id);

    // 검색 필터
    const filtered = useMemo(() => {
        if (!search.trim()) return availableUsers;
        const q = search.toLowerCase();
        return availableUsers.filter(
            (u) => u.name.toLowerCase().includes(q) || (u.department?.name || "").toLowerCase().includes(q)
        );
    }, [availableUsers, search]);

    // 부서별 그룹핑
    const grouped = useMemo(() => {
        const map: Record<string, any[]> = {};
        for (const u of filtered) {
            const dept = u.department?.name || "미지정";
            if (!map[dept]) map[dept] = [];
            map[dept].push(u);
        }
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    }, [filtered]);

    // 검색 시 자동 펼침
    useEffect(() => {
        if (search.trim()) {
            setExpandedDepts(new Set(grouped.map(([dept]) => dept)));
        }
    }, [search, grouped]);

    const toggleDept = (dept: string) => {
        setExpandedDepts((prev) => {
            const next = new Set(prev);
            if (next.has(dept)) next.delete(dept);
            else next.add(dept);
            return next;
        });
    };

    const handleToggleParticipant = (userId: string) => {
        setSelectedParticipants(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    // 부서 전체 선택/해제
    const toggleDeptAll = (members: any[]) => {
        const memberIds = members.map(m => m.id);
        const allSelected = memberIds.every(id => selectedParticipants.includes(id));
        if (allSelected) {
            setSelectedParticipants(prev => prev.filter(id => !memberIds.includes(id)));
        } else {
            setSelectedParticipants(prev => [...new Set([...prev, ...memberIds])]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        if (!endDate) {
            alert("프로젝트 종료일을 지정해주세요.");
            return;
        }

        try {
            const result = await createProject({
                title,
                creatorId: user.id,
                participantIds: selectedParticipants,
                endDate,
            });

            if (result.success && result.data) {
                addProject({
                    id: result.data.id,
                    title: result.data.name,
                    creatorId: result.data.creatorId,
                    participantIds: selectedParticipants,
                    createdAt: result.data.createdAt.toISOString(),
                    endDate: result.data.endDate.toISOString(),
                } as any);

                setTitle("");
                setEndDate(format(addMonths(new Date(), 1), "yyyy-MM-dd"));
                setSelectedParticipants([]);
                setSearch("");
                setExpandedDepts(new Set());
                setOpen(false);
            } else {
                alert(result.error || "프로젝트 생성 실패");
            }
        } catch (error) {
            console.error(error);
            alert("서버 오류가 발생했습니다.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    새 프로젝트 생성
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>새 프로젝트 만들기</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">프로젝트 이름</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="예: 홈페이지 리뉴얼"
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="endDate">프로젝트 종료일</Label>
                        <Input
                            id="endDate"
                            type="date"
                            value={endDate}
                            min={format(new Date(), "yyyy-MM-dd")}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            프로젝트 전체의 마감 기한을 설정합니다.
                        </p>
                    </div>

                    <div className="grid gap-2 mt-2">
                        <Label>참여 팀원 선택</Label>

                        {/* 선택된 팀원 태그 */}
                        {selectedParticipants.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap p-2 bg-muted/40 rounded-lg">
                                {selectedParticipants.map((id) => {
                                    const u = availableUsers.find((u) => u.id === id);
                                    return (
                                        <div key={id} className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5 text-xs">
                                            <span className="font-medium">{u?.name}</span>
                                            <button type="button" onClick={() => handleToggleParticipant(id)}>
                                                <X className="h-3 w-3 text-muted-foreground" />
                                            </button>
                                        </div>
                                    );
                                })}
                                <span className="text-[10px] text-muted-foreground ml-1">{selectedParticipants.length}명 선택</span>
                            </div>
                        )}

                        {/* 검색 */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="이름 또는 부서 검색..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-9 text-sm"
                            />
                        </div>

                        {/* 부서별 아코디언 */}
                        <div className="max-h-[220px] overflow-y-auto space-y-0.5 border rounded-lg">
                            {grouped.map(([dept, members]) => {
                                const isExpanded = expandedDepts.has(dept);
                                const selectedCount = members.filter((m: any) => selectedParticipants.includes(m.id)).length;
                                const allSelected = selectedCount === members.length;
                                return (
                                    <div key={dept}>
                                        <div className="flex items-center">
                                            <button
                                                type="button"
                                                onClick={() => toggleDept(dept)}
                                                className="flex-1 flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                                            >
                                                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                                {dept}
                                                <span className="text-xs ml-auto opacity-60">
                                                    {selectedCount > 0 && <span className="text-primary mr-1">{selectedCount}/</span>}
                                                    {members.length}명
                                                </span>
                                            </button>
                                            {isExpanded && (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleDeptAll(members)}
                                                    className="text-[10px] text-primary hover:underline pr-3 flex-shrink-0"
                                                >
                                                    {allSelected ? "전체해제" : "전체선택"}
                                                </button>
                                            )}
                                        </div>
                                        {isExpanded && (
                                            <div className="pl-5 pr-3 pb-1 space-y-0.5">
                                                {members.map((u: any) => {
                                                    const isSelected = selectedParticipants.includes(u.id);
                                                    return (
                                                        <button
                                                            key={u.id}
                                                            type="button"
                                                            onClick={() => handleToggleParticipant(u.id)}
                                                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                                                                isSelected
                                                                    ? "bg-primary/10 text-primary"
                                                                    : "text-foreground hover:bg-muted"
                                                            }`}
                                                        >
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                                                isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                                                            }`}>
                                                                {isSelected && (
                                                                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            <span className="font-medium">{u.name}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {grouped.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">검색 결과가 없습니다.</p>
                            )}
                        </div>
                    </div>

                    <Button type="submit" className="mt-4">
                        프로젝트 생성
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

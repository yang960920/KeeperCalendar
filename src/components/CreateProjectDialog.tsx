"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
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
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
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

    // Only creators can create projects
    if (user?.role !== "CREATOR") return null;

    // 참가자로 선택 가능한 유저 목록 (자기 자신 제외)
    const availableUsers = users.filter(u => u.id !== user.id);

    const handleToggleParticipant = (userId: string) => {
        setSelectedParticipants(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        try {
            // 1. DB에 저장 (Server Action)
            const result = await createProject({
                title,
                creatorId: user.id,
                participantIds: selectedParticipants,
            });

            if (result.success && result.data) {
                // 2. Zustand 로컬 스토어 업데이트 (UI 즉각 반영)
                addProject({
                    id: result.data.id,
                    title: result.data.name,
                    creatorId: result.data.creatorId,
                    participantIds: selectedParticipants,
                    createdAt: result.data.createdAt.toISOString(),
                } as any); // Type assertion for UI compatibility

                setTitle("");
                setSelectedParticipants([]);
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
            <DialogContent className="sm:max-w-[425px]">
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

                    <div className="grid gap-2 mt-2">
                        <Label>참여 팀원 선택</Label>
                        <div className="flex flex-col gap-2 mt-1 border rounded-md p-3 bg-muted/20">
                            {availableUsers.map((u) => (
                                <div key={u.id} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`user-${u.id}`}
                                        className="w-4 h-4 cursor-pointer"
                                        checked={selectedParticipants.includes(u.id)}
                                        onChange={() => handleToggleParticipant(u.id)}
                                    />
                                    <Label htmlFor={`user-${u.id}`} className="text-sm font-normal cursor-pointer">
                                        {u.name} <span className="text-xs text-muted-foreground">({u.role === "PARTICIPANT" ? "참여자" : "생성자"})</span>
                                    </Label>
                                </div>
                            ))}
                            {availableUsers.length === 0 && (
                                <p className="text-sm text-muted-foreground">선택 가능한 팀원이 없습니다.</p>
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

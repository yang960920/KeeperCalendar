"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createEmployee, getEmployees, getDepartments } from "@/app/actions/employee";
import { EditEmployeeDialog } from "@/components/admin/EditEmployeeDialog";

export default function AdminEmployeesPage() {
    // 폼 상태
    const [name, setName] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [departmentId, setDepartmentId] = useState<string>("none");
    const [isCreator, setIsCreator] = useState(false);
    const [isParticipant, setIsParticipant] = useState(false);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 데이터 상태
    const [users, setUsers] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const loadData = async () => {
        setLoading(true);
        const [usersRes, depsRes] = await Promise.all([
            getEmployees(),
            getDepartments()
        ]);

        if (usersRes.success && usersRes.data) {
            setUsers(usersRes.data);
        }
        if (depsRes.success && depsRes.data) {
            setDepartments(depsRes.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreatorChange = (checked: boolean) => {
        setIsCreator(checked);
        if (checked) {
            setIsParticipant(true); // 생성자 체크 시 참여자 자동 체크
        }
    };

    const handleParticipantChange = (checked: boolean) => {
        setIsParticipant(checked);
        if (isCreator && !checked) {
            setIsParticipant(true); // 생성자인데 참여자를 해제하려 하면 방지 (정책상)
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (birthDate.length !== 6 || isNaN(Number(birthDate))) {
            alert("생년월일은 6자리 숫자로 입력해주세요. (예: 990101)");
            return;
        }

        const role = isCreator ? "CREATOR" : (isParticipant ? "PARTICIPANT" : "NONE");

        if (role === "NONE") {
            alert("권한을 최소 한 개 이상 선택해주세요.");
            return;
        }

        setIsSubmitting(true);
        let resumeUrl: string | undefined = undefined;

        if (resumeFile) {
            try {
                const response = await fetch(`/api/upload?filename=${encodeURIComponent(resumeFile.name)}`, {
                    method: 'POST',
                    body: resumeFile,
                });
                if (response.ok) {
                    const blob = await response.json();
                    resumeUrl = blob.url;
                } else {
                    alert("이력서 업로드에 실패했습니다.");
                    setIsSubmitting(false);
                    return;
                }
            } catch (error) {
                console.error("Upload error:", error);
                alert("이력서 업로드 중 오류가 발생했습니다.");
                setIsSubmitting(false);
                return;
            }
        }

        const result = await createEmployee({
            name,
            birthDate,
            role,
            departmentId: departmentId === "none" ? undefined : departmentId,
            resumeUrl,
        });

        setIsSubmitting(false);

        if (result.success) {
            alert(`${name}님 등록 완료 (ID: ${name}, PW: ${birthDate})`);
            // 초기화
            setName("");
            setBirthDate("");
            setDepartmentId("none");
            setIsCreator(false);
            setIsParticipant(false);
            setResumeFile(null);
            // 목록 새로고침
            loadData();
        } else {
            alert(`등록 실패: ${result.error}`);
        }
    };

    // 필터링, 정렬 및 페이지네이션
    const [empPage, setEmpPage] = useState(1);
    const EMP_PAGE_SIZE = 10;

    const filteredUsers = useMemo(() => users
        .filter(u => {
            if (!searchTerm) return true;
            return u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.id.toLowerCase().includes(searchTerm.toLowerCase());
        })
        .sort((a, b) => {
            const depA = a.department?.name || "\uFFFF";
            const depB = b.department?.name || "\uFFFF";
            if (depA < depB) return -1;
            if (depA > depB) return 1;
            return a.name.localeCompare(b.name);
        }), [users, searchTerm]);

    const empTotalPages = Math.max(1, Math.ceil(filteredUsers.length / EMP_PAGE_SIZE));
    const pagedUsers = filteredUsers.slice((empPage - 1) * EMP_PAGE_SIZE, empPage * EMP_PAGE_SIZE);

    // 검색 변경 시 페이지 리셋
    React.useEffect(() => { setEmpPage(1); }, [searchTerm]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 backdrop-blur-sm">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                        사원 명부 및 권한 관리
                    </h1>
                    <p className="text-zinc-400">시스템을 사용할 사원을 추가하고 역할을 부여합니다.</p>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-6">

                {/* 1/3 영역: 사원 추가 폼 */}
                <div className="xl:w-1/3 bg-zinc-900/40 p-6 border border-zinc-800 rounded-xl h-fit w-full">
                    <h2 className="text-xl font-semibold text-white mb-6 flex border-b border-zinc-800 pb-4">
                        신규 사원 등록
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-3">
                            <Label htmlFor="name" className="text-zinc-300">이름 (ID로 사용됨)</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="예: 홍길동"
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="department" className="text-zinc-300">소속 부서</Label>
                            <Select value={departmentId} onValueChange={setDepartmentId}>
                                <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-white">
                                    <SelectValue placeholder="부서 선택" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                    <SelectItem value="none">소속 없음</SelectItem>
                                    {departments.map(dep => (
                                        <SelectItem key={dep.id} value={dep.id}>{dep.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="birthdate" className="text-zinc-300">생년월일 6자리 (비밀번호로 사용됨)</Label>
                            <Input
                                id="birthdate"
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                required
                                maxLength={6}
                                placeholder="예: 990101"
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                            />
                            <p className="text-xs text-zinc-500">ID와 비밀번호는 자동으로 설정됩니다.</p>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="resume" className="text-zinc-300">이력서 및 포트폴리오 (선택)</Label>
                            <Input
                                id="resume"
                                type="file"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        setResumeFile(e.target.files[0]);
                                    } else {
                                        setResumeFile(null);
                                    }
                                }}
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 cursor-pointer text-sm"
                            />
                        </div>

                        <div className="space-y-4 pt-2">
                            <Label className="text-zinc-300 block mb-2">권한 부여</Label>
                            <div className="flex flex-col gap-3 p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="creator"
                                        checked={isCreator}
                                        onCheckedChange={handleCreatorChange}
                                        className="border-zinc-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="creator" className="text-sm font-medium text-white cursor-pointer">생성자 (Creator)</Label>
                                        <p className="text-xs text-zinc-500">프로젝트를 생성하고 관리할 수 있습니다.</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3 mt-4">
                                    <Checkbox
                                        id="participant"
                                        checked={isParticipant}
                                        onCheckedChange={handleParticipantChange}
                                        disabled={isCreator}
                                        className="border-zinc-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="participant" className="text-sm font-medium text-white cursor-pointer">참여자 (Participant)</Label>
                                        <p className="text-xs text-zinc-500">할당된 태스크를 수행할 수 있습니다.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                            {isSubmitting ? "업로드 및 등록 중..." : "사원 등록하기"}
                        </Button>
                    </form>
                </div>

                {/* 2/3 영역: 사원 명부 */}
                <div className="flex-1 w-full bg-zinc-900/40 p-6 border border-zinc-800 rounded-xl overflow-x-auto flex flex-col">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
                        <h2 className="text-xl font-semibold text-white">
                            전체 사원 명부
                        </h2>
                        <div className="w-64">
                            <Input
                                placeholder="사원명 또는 ID 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-zinc-800 border-zinc-700 text-white"
                            />
                        </div>
                    </div>

                    <div className="rounded-md border border-zinc-800 overflow-hidden min-w-[600px]">
                        <Table>
                            <TableHeader className="bg-zinc-800/50">
                                <TableRow className="border-zinc-800 hover:bg-transparent">
                                    <TableHead className="text-zinc-400 w-[120px]">이름 (ID)</TableHead>
                                    <TableHead className="text-zinc-400 w-[150px]">부서</TableHead>
                                    <TableHead className="text-zinc-400 w-[120px]">이력서</TableHead>
                                    <TableHead className="text-zinc-400 flex-1">권한 (역할)</TableHead>
                                    <TableHead className="text-zinc-400 text-right w-[100px]">관리</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-zinc-500 p-4">데이터를 불러오는 중입니다...</TableCell>
                                    </TableRow>
                                )}
                                {!loading && filteredUsers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-zinc-500 p-4">
                                            {searchTerm ? "검색 결과가 없습니다." : "등록된 사원이 없습니다."}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!loading && pagedUsers.map((user) => (
                                    <TableRow key={user.id} className="border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                                        <TableCell className="font-medium text-white">{user.name}</TableCell>
                                        <TableCell className="text-zinc-300">{user.department?.name || "-"}</TableCell>
                                        <TableCell>
                                            {user.resumeUrl ? (
                                                <a href={user.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs underline truncate w-[100px] block">
                                                    다운로드
                                                </a>
                                            ) : (
                                                <span className="text-zinc-600 text-xs">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline"
                                                className={user.role === "CREATOR"
                                                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}>
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <EditEmployeeDialog
                                                user={user}
                                                departments={departments}
                                                onUpdated={loadData}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* 페이지네이션 */}
                    {filteredUsers.length > EMP_PAGE_SIZE && (
                        <div className="flex items-center justify-between mt-4 px-1">
                            <span className="text-xs text-zinc-500">
                                총 {filteredUsers.length}명 중 {(empPage - 1) * EMP_PAGE_SIZE + 1}-{Math.min(empPage * EMP_PAGE_SIZE, filteredUsers.length)}명
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                                    onClick={() => setEmpPage(p => Math.max(1, p - 1))}
                                    disabled={empPage === 1}
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                <span className="text-xs text-zinc-400 min-w-[60px] text-center">
                                    {empPage} / {empTotalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                                    onClick={() => setEmpPage(p => Math.min(empTotalPages, p + 1))}
                                    disabled={empPage === empTotalPages}
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

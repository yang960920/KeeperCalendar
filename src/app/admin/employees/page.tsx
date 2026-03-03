"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createEmployee, getEmployees } from "@/app/actions/employee";

export default function AdminEmployeesPage() {
    // 폼 상태
    const [name, setName] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [isCreator, setIsCreator] = useState(false);
    const [isParticipant, setIsParticipant] = useState(false);

    // 데이터 상태
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // 유저 로드
    const loadUsers = async () => {
        setLoading(true);
        const result = await getEmployees();
        if (result.success && result.data) {
            setUsers(result.data);
        } else {
            alert(result.error);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadUsers();
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

        const result = await createEmployee({
            name,
            birthDate,
            role,
        });

        if (result.success) {
            alert(`${name}님 등록 완료 (ID: ${name}, PW: ${birthDate})`);
            // 초기화
            setName("");
            setBirthDate("");
            setIsCreator(false);
            setIsParticipant(false);
            // 목록 새로고침
            loadUsers();
        } else {
            alert(`등록 실패: ${result.error}`);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 backdrop-blur-sm">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">사원 명부 및 권한 관리</h1>
                    <p className="text-zinc-400">시스템을 사용할 사원을 추가하고 역할을 부여합니다.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1/3 영역: 사원 추가 폼 */}
                <div className="bg-zinc-900/40 p-6 border border-zinc-800 rounded-xl h-fit">
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

                        <Button type="submit" className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                            사원 등록하기
                        </Button>
                    </form>
                </div>

                {/* 2/3 영역: 사원 명부 */}
                <div className="lg:col-span-2 bg-zinc-900/40 p-6 border border-zinc-800 rounded-xl">
                    <h2 className="text-xl font-semibold text-white mb-6 flex border-b border-zinc-800 pb-4">
                        전체 사원 명부
                    </h2>

                    <div className="rounded-md border border-zinc-800 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-zinc-800/50">
                                <TableRow className="border-zinc-800 hover:bg-transparent">
                                    <TableHead className="text-zinc-400">이름 (ID)</TableHead>
                                    <TableHead className="text-zinc-400">부서</TableHead>
                                    <TableHead className="text-zinc-400">권한 (역할)</TableHead>
                                    <TableHead className="text-zinc-400 text-right">관리</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-zinc-500 p-4">데이터를 불러오는 중입니다...</TableCell>
                                    </TableRow>
                                )}
                                {!loading && users.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-zinc-500 p-4">등록된 사원이 없습니다.</TableCell>
                                    </TableRow>
                                )}
                                {!loading && users.map((user) => (
                                    <TableRow key={user.id} className="border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                                        <TableCell className="font-medium text-white">{user.name}</TableCell>
                                        <TableCell className="text-zinc-300">{user.department?.name || "-"}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline"
                                                className={user.role === "CREATOR"
                                                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}>
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-700 h-8 text-xs">
                                                수정
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

            </div>
        </div>
    );
}

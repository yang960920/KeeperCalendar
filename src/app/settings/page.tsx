"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { User, Lock, Bell, Palette, Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import {
    getUserProfile,
    getUserSettings,
    updateUserSettings,
    changePassword,
    updateProfileImage,
} from "@/app/actions/settings";

const HEATMAP_PALETTES: Record<string, { label: string; colors: string[] }> = {
    green: { label: "그린 (기본)", colors: ["#064e3b", "#059669", "#34d399", "#6ee7b7"] },
    blue: { label: "블루", colors: ["#1e3a5f", "#2563eb", "#60a5fa", "#93c5fd"] },
    purple: { label: "퍼플", colors: ["#3b0764", "#7c3aed", "#a78bfa", "#c4b5fd"] },
    orange: { label: "오렌지", colors: ["#7c2d12", "#ea580c", "#fb923c", "#fdba74"] },
};

export default function SettingsPage() {
    const user = useStore(useAuthStore, (s) => s.user);
    const setProfileImage = useAuthStore((s) => s.setProfileImage);
    const { theme, setTheme } = useTheme();

    // 프로필 상태
    const [profile, setProfile] = useState<any>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    // 비밀번호 상태
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // 설정 상태
    const [settings, setSettings] = useState({
        notifyDueDate: true,
        notifyDueDays: 1,
        notifyPeerReview: true,
        notifySubTaskAssign: true,
        theme: "dark",
        heatmapColor: "green",
    });
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [saved, setSaved] = useState(false);

    // 이미지 업로드
    const [uploading, setUploading] = useState(false);

    // 데이터 로딩
    useEffect(() => {
        if (!user) return;
        Promise.all([getUserProfile(user.id), getUserSettings(user.id)]).then(
            ([profileRes, settingsRes]) => {
                if (profileRes.success && profileRes.data) setProfile(profileRes.data);
                if (settingsRes.success && settingsRes.data) {
                    setSettings(settingsRes.data);
                }
                setProfileLoading(false);
                setSettingsLoading(false);
            }
        );
    }, [user]);

    // 비밀번호 변경
    const handleChangePw = async () => {
        setPwMsg(null);
        if (!user) return;
        if (newPw !== confirmPw) {
            setPwMsg({ type: "error", text: "새 비밀번호가 일치하지 않습니다." });
            return;
        }
        const res = await changePassword(user.id, currentPw, newPw);
        if (res.success) {
            setPwMsg({ type: "success", text: "비밀번호가 변경되었습니다." });
            setCurrentPw("");
            setNewPw("");
            setConfirmPw("");
        } else {
            setPwMsg({ type: "error", text: res.error || "변경에 실패했습니다." });
        }
    };

    // 프로필 이미지 업로드
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !user) return;
        const file = e.target.files[0];
        setUploading(true);
        try {
            const response = await fetch(
                `/api/upload?filename=profile_${user.id}_${Date.now()}.${file.name.split(".").pop()}`,
                { method: "POST", body: file }
            );
            if (response.ok) {
                const blob = await response.json();
                await updateProfileImage(user.id, blob.url);
                setProfile((p: any) => ({ ...p, profileImageUrl: blob.url }));
                setProfileImage(blob.url); // auth store 동기화 → 사이드바 즉시 반영
            } else {
                alert("이미지 업로드에 실패했습니다.");
            }
        } catch {
            alert("이미지 업로드 중 오류가 발생했습니다.");
        }
        setUploading(false);
    };

    // 설정 저장
    const handleSaveSettings = async () => {
        if (!user) return;
        const res = await updateUserSettings(user.id, settings);
        if (res.success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    // 테마 변경
    const handleThemeChange = (newTheme: string) => {
        setSettings((s) => ({ ...s, theme: newTheme }));
        setTheme(newTheme);
    };

    if (!user) {
        return <div className="p-8 text-center text-muted-foreground">로그인이 필요합니다.</div>;
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-10 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Keeper Settings</h1>
                <p className="text-muted-foreground mt-1">계정, 알림, 화면 설정을 관리합니다.</p>
            </div>

            <Tabs defaultValue="account" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 h-11">
                    <TabsTrigger value="account" className="gap-2">
                        <User className="h-4 w-4" /> 계정 관리
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-2">
                        <Bell className="h-4 w-4" /> 알림 설정
                    </TabsTrigger>
                    <TabsTrigger value="display" className="gap-2">
                        <Palette className="h-4 w-4" /> 화면 설정
                    </TabsTrigger>
                </TabsList>

                {/* === 탭 1: 계정 관리 === */}
                <TabsContent value="account" className="space-y-6">
                    {/* 프로필 카드 */}
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <User className="h-5 w-5" /> 내 정보
                        </h2>
                        {profileLoading ? (
                            <p className="text-sm text-muted-foreground">로딩 중...</p>
                        ) : profile ? (
                            <div className="flex items-start gap-6">
                                {/* 아바타 */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="relative group">
                                        {profile.profileImageUrl ? (
                                            <img
                                                src={profile.profileImageUrl}
                                                alt="프로필"
                                                className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/30"
                                            />
                                        ) : (
                                            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                                                <User className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                        )}
                                        <label className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                            <Upload className="h-5 w-5 text-white" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleImageUpload}
                                                disabled={uploading}
                                            />
                                        </label>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                        {uploading ? "업로드 중..." : "클릭하여 변경"}
                                    </span>
                                </div>

                                {/* 정보 */}
                                <div className="grid grid-cols-2 gap-x-8 gap-y-3 flex-1">
                                    <div>
                                        <span className="text-xs text-muted-foreground">이름</span>
                                        <p className="text-sm font-medium">{profile.name}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground">ID</span>
                                        <p className="text-sm font-medium">{profile.id}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground">부서</span>
                                        <p className="text-sm font-medium">{profile.department || "소속 없음"}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground">역할</span>
                                        <p className="text-sm font-medium">
                                            {profile.role === "CREATOR" ? "생성자 (Creator)" : "참여자 (Participant)"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* 비밀번호 변경 */}
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Lock className="h-5 w-5" /> 비밀번호 변경
                        </h2>
                        <div className="grid gap-3 max-w-md">
                            <div className="space-y-1.5">
                                <Label>현재 비밀번호</Label>
                                <Input
                                    type="password"
                                    value={currentPw}
                                    onChange={(e) => setCurrentPw(e.target.value)}
                                    placeholder="현재 비밀번호 입력"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>새 비밀번호</Label>
                                <Input
                                    type="password"
                                    value={newPw}
                                    onChange={(e) => setNewPw(e.target.value)}
                                    placeholder="새 비밀번호 입력"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>비밀번호 확인</Label>
                                <Input
                                    type="password"
                                    value={confirmPw}
                                    onChange={(e) => setConfirmPw(e.target.value)}
                                    placeholder="새 비밀번호 다시 입력"
                                />
                            </div>
                            {pwMsg && (
                                <p className={`text-sm ${pwMsg.type === "success" ? "text-emerald-500" : "text-red-500"}`}>
                                    {pwMsg.text}
                                </p>
                            )}
                            <Button onClick={handleChangePw} className="w-fit" disabled={!currentPw || !newPw || !confirmPw}>
                                비밀번호 변경
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                {/* === 탭 2: 알림 설정 === */}
                <TabsContent value="notifications" className="space-y-6">
                    <div className="rounded-xl border bg-card p-6 space-y-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Bell className="h-5 w-5" /> 알림 선호도
                        </h2>
                        <p className="text-sm text-muted-foreground -mt-2">
                            실제 알림 발송은 추후 업데이트에서 지원됩니다. 현재는 선호도만 저장됩니다.
                        </p>

                        {settingsLoading ? (
                            <p className="text-sm text-muted-foreground">로딩 중...</p>
                        ) : (
                            <div className="space-y-5">
                                {/* 마감일 리마인더 */}
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div>
                                        <p className="text-sm font-medium">마감일 리마인더</p>
                                        <p className="text-xs text-muted-foreground">업무 마감일 전 알림을 받습니다.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {settings.notifyDueDate && (
                                            <Select
                                                value={String(settings.notifyDueDays)}
                                                onValueChange={(v) => setSettings((s) => ({ ...s, notifyDueDays: Number(v) }))}
                                            >
                                                <SelectTrigger className="w-[90px] h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">D-1</SelectItem>
                                                    <SelectItem value="3">D-3</SelectItem>
                                                    <SelectItem value="7">D-7</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <Switch
                                            checked={settings.notifyDueDate}
                                            onCheckedChange={(v: boolean) => setSettings((s) => ({ ...s, notifyDueDate: v }))}
                                        />
                                    </div>
                                </div>

                                {/* 피어 리뷰 */}
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div>
                                        <p className="text-sm font-medium">피어 리뷰 요청</p>
                                        <p className="text-xs text-muted-foreground">프로젝트 종료 후 피어 리뷰 요청 시 알림을 받습니다.</p>
                                    </div>
                                    <Switch
                                        checked={settings.notifyPeerReview}
                                        onCheckedChange={(v: boolean) => setSettings((s) => ({ ...s, notifyPeerReview: v }))}
                                    />
                                </div>

                                {/* 하위업무 배정 */}
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div>
                                        <p className="text-sm font-medium">하위업무 배정 알림</p>
                                        <p className="text-xs text-muted-foreground">새 하위업무가 나에게 배정되면 알림을 받습니다.</p>
                                    </div>
                                    <Switch
                                        checked={settings.notifySubTaskAssign}
                                        onCheckedChange={(v: boolean) => setSettings((s) => ({ ...s, notifySubTaskAssign: v }))}
                                    />
                                </div>

                                <Button onClick={handleSaveSettings} className="gap-2">
                                    {saved ? <><Check className="h-4 w-4" /> 저장됨!</> : "알림 설정 저장"}
                                </Button>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* === 탭 3: 화면 설정 === */}
                <TabsContent value="display" className="space-y-6">
                    {/* 테마 */}
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Palette className="h-5 w-5" /> 테마
                        </h2>
                        <div className="flex gap-3">
                            {[
                                { value: "dark", label: "다크", emoji: "🌙" },
                                { value: "light", label: "라이트", emoji: "☀️" },
                                { value: "system", label: "시스템", emoji: "💻" },
                            ].map((t) => (
                                <button
                                    key={t.value}
                                    onClick={() => handleThemeChange(t.value)}
                                    className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${(settings.theme === t.value)
                                        ? "border-primary bg-primary/5"
                                        : "border-muted hover:border-muted-foreground/30"
                                        }`}
                                >
                                    <span className="text-2xl">{t.emoji}</span>
                                    <span className="text-sm font-medium">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 히트맵 색상 */}
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h2 className="text-lg font-semibold">히트맵 색상</h2>
                        <p className="text-sm text-muted-foreground -mt-2">연간 히트맵 캘린더의 색상 팔레트를 선택합니다.</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(HEATMAP_PALETTES).map(([key, palette]) => (
                                <button
                                    key={key}
                                    onClick={() => setSettings((s) => ({ ...s, heatmapColor: key }))}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${settings.heatmapColor === key
                                        ? "border-primary bg-primary/5"
                                        : "border-muted hover:border-muted-foreground/30"
                                        }`}
                                >
                                    <div className="flex gap-1">
                                        {palette.colors.map((c, i) => (
                                            <div key={i} className="w-5 h-5 rounded" style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                    <span className="text-xs font-medium">{palette.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <Button onClick={handleSaveSettings} className="gap-2">
                        {saved ? <><Check className="h-4 w-4" /> 저장됨!</> : "화면 설정 저장"}
                    </Button>
                </TabsContent>
            </Tabs>
        </div>
    );
}

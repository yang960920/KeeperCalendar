"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Folder,
    FolderOpen,
    FileText,
    Download,
    Trash2,
    ChevronRight,
    History,
    Loader2,
    FolderPlus,
    Upload,
    Search,
    ArrowUpDown,
    X,
    Plus,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import {
    createDocFolder,
    createDocument,
    deleteDocument,
    deleteDocFolder,
    getDocuments,
    searchDocuments,
    addDocumentVersion,
} from "@/app/actions/document";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface DocFolderData {
    id: string;
    name: string;
    creatorId: string;
    createdAt: string;
}

interface DocVersionData {
    id: string;
    url: string;
    size?: number;
    note?: string;
    createdAt: string;
}

interface DocumentData {
    id: string;
    name: string;
    mimeType?: string;
    size?: number;
    currentUrl: string;
    uploaderId: string;
    visibility: "PUBLIC" | "PRIVATE";
    versions: DocVersionData[];
    createdAt: string;
    updatedAt: string;
    folderName?: string;
}

// ─── 정렬 옵션 ───────────────────────────────────────────────────────────────

type SortOption = "updatedAt" | "name" | "size" | "createdAt";
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "updatedAt", label: "최근 수정순" },
    { value: "createdAt", label: "등록순" },
    { value: "name", label: "이름순" },
    { value: "size", label: "크기순" },
];

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function formatBytes(bytes?: number) {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getFileIcon(mimeType?: string) {
    if (!mimeType) return "📄";
    if (mimeType.includes("image")) return "🖼️";
    if (mimeType.includes("pdf")) return "📕";
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📊";
    if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
    if (mimeType.includes("video")) return "🎬";
    if (mimeType.includes("audio")) return "🎵";
    return "📄";
}

// ─── 문서 상세 (버전 이력 + 새 버전 업로드) ──────────────────────────────────

function DocumentDetailDialog({
    document,
    currentUserId,
    onDeleted,
    onVersionAdded,
}: {
    document: DocumentData;
    currentUserId: string;
    onDeleted: () => void;
    onVersionAdded: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [versionFile, setVersionFile] = useState<File | null>(null);
    const [versionNote, setVersionNote] = useState("");
    const [isVersionUploading, setIsVersionUploading] = useState(false);
    const [showVersionUpload, setShowVersionUpload] = useState(false);
    const isOwner = document.uploaderId === currentUserId;

    const handleVersionUpload = async () => {
        if (!versionFile) return;
        setIsVersionUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", versionFile);
            const uploadRes = await fetch("/api/documents/upload", {
                method: "POST",
                body: formData,
            });
            const uploadData = await uploadRes.json();
            if (!uploadData.url) {
                alert("업로드에 실패했습니다.");
                return;
            }

            const result = await addDocumentVersion({
                documentId: document.id,
                url: uploadData.url,
                size: versionFile.size,
                uploaderId: currentUserId,
                note: versionNote || `v${document.versions.length + 1} 업데이트`,
            });

            if (result.success) {
                setVersionFile(null);
                setVersionNote("");
                setShowVersionUpload(false);
                onVersionAdded();
            }
        } finally {
            setIsVersionUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setShowVersionUpload(false); }}>
            <DialogTrigger asChild>
                <button className="w-full text-left">
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 rounded-lg transition-colors group">
                        <span className="text-xl flex-shrink-0">{getFileIcon(document.mimeType)}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{document.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                                {formatBytes(document.size)} · {format(new Date(document.updatedAt), "MM/dd HH:mm", { locale: ko })}
                                {document.versions.length > 1 && (
                                    <span className="ml-1 text-primary/70">v{document.versions.length}</span>
                                )}
                            </p>
                        </div>
                        {document.visibility === "PRIVATE" && (
                            <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-400/30">비공개</Badge>
                        )}
                        <History className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <span>{getFileIcon(document.mimeType)}</span>
                        <span className="truncate">{document.name}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {/* 정보 */}
                    <div className="text-xs text-muted-foreground space-y-1">
                        <div>크기: {formatBytes(document.size)}</div>
                        <div>업로드: {format(new Date(document.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}</div>
                        <div>최종 수정: {format(new Date(document.updatedAt), "yyyy.MM.dd HH:mm", { locale: ko })}</div>
                        {document.folderName && <div>폴더: {document.folderName}</div>}
                    </div>

                    {/* 최신 다운로드 */}
                    <a
                        href={document.currentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 w-full justify-center bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        <Download className="h-4 w-4" />
                        최신 버전 다운로드
                    </a>

                    {/* 새 버전 업로드 */}
                    {isOwner && !showVersionUpload && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-1.5"
                            onClick={() => setShowVersionUpload(true)}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            새 버전 업로드
                        </Button>
                    )}

                    {showVersionUpload && (
                        <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                            <label
                                htmlFor="version-file-upload"
                                className="flex flex-col items-center gap-1.5 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors"
                            >
                                <Upload className="h-5 w-5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                    {versionFile ? versionFile.name : "파일 선택"}
                                </span>
                                <input
                                    id="version-file-upload"
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                                />
                            </label>
                            <Input
                                placeholder="버전 메모 (선택)"
                                value={versionNote}
                                onChange={(e) => setVersionNote(e.target.value)}
                                className="h-7 text-xs"
                            />
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    className="flex-1 h-7 text-xs"
                                    onClick={handleVersionUpload}
                                    disabled={!versionFile || isVersionUploading}
                                >
                                    {isVersionUploading ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : "업로드"}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => { setShowVersionUpload(false); setVersionFile(null); setVersionNote(""); }}
                                >
                                    취소
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 버전 이력 */}
                    {document.versions.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                                버전 이력 ({document.versions.length})
                            </h4>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                {document.versions.map((v, idx) => (
                                    <div key={v.id} className="flex items-center gap-2 text-xs">
                                        <span className={`font-mono w-5 ${idx === 0 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                                            v{document.versions.length - idx}
                                        </span>
                                        <span className="flex-1 text-muted-foreground truncate">
                                            {format(new Date(v.createdAt), "MM/dd HH:mm", { locale: ko })}
                                            {v.note && ` · ${v.note}`}
                                        </span>
                                        <a
                                            href={v.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline flex-shrink-0"
                                        >
                                            <Download className="h-3 w-3" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 삭제 (소유자) */}
                    {isOwner && (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={async () => {
                                const result = await deleteDocument(document.id, currentUserId);
                                if (result.success) {
                                    setOpen(false);
                                    onDeleted();
                                }
                            }}
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            문서 삭제
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── 메인 문서 관리 페이지 ────────────────────────────────────────────────────

export default function DocumentsPage() {
    const user = useStore(useAuthStore, (s) => s.user);
    const [folders, setFolders] = useState<DocFolderData[]>([]);
    const [documents, setDocuments] = useState<DocumentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
    const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([]);

    // 신규 폴더 상태
    const [newFolderName, setNewFolderName] = useState("");
    const [isFolderLoading, setIsFolderLoading] = useState(false);

    // 파일 업로드 상태
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [isUploadLoading, setIsUploadLoading] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);

    // 검색 상태
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<DocumentData[] | null>(null);

    // 정렬 상태
    const [sortOption, setSortOption] = useState<SortOption>("updatedAt");
    const [showSortMenu, setShowSortMenu] = useState(false);

    const loadDocuments = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const result = await getDocuments(user.id, currentFolderId);
            if (result.success) {
                setFolders(result.data.folders as DocFolderData[]);
                setDocuments(result.data.documents as DocumentData[]);
            }
        } finally {
            setIsLoading(false);
        }
    }, [user, currentFolderId]);

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    // 검색 실행
    const handleSearch = async () => {
        if (!searchQuery.trim() || !user) {
            setSearchResults(null);
            return;
        }
        setIsSearching(true);
        try {
            const result = await searchDocuments(user.id, searchQuery.trim());
            if (result.success && result.data) {
                setSearchResults(result.data as DocumentData[]);
            }
        } finally {
            setIsSearching(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery("");
        setSearchResults(null);
    };

    // 정렬된 문서 목록
    const sortedDocuments = useMemo(() => {
        const list = searchResults || documents;
        return [...list].sort((a, b) => {
            switch (sortOption) {
                case "name":
                    return a.name.localeCompare(b.name, "ko");
                case "size":
                    return (b.size || 0) - (a.size || 0);
                case "createdAt":
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case "updatedAt":
                default:
                    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            }
        });
    }, [documents, searchResults, sortOption]);

    const enterFolder = (folder: DocFolderData) => {
        clearSearch();
        setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
        setCurrentFolderId(folder.id);
    };

    const goToBreadcrumb = (idx: number) => {
        clearSearch();
        if (idx === -1) {
            setBreadcrumb([]);
            setCurrentFolderId(undefined);
        } else {
            const newBreadcrumb = breadcrumb.slice(0, idx + 1);
            setBreadcrumb(newBreadcrumb);
            setCurrentFolderId(newBreadcrumb[newBreadcrumb.length - 1].id);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || !user) return;
        setIsFolderLoading(true);
        try {
            const result = await createDocFolder({
                name: newFolderName,
                creatorId: user.id,
                parentId: currentFolderId,
            });
            if (result.success) {
                setNewFolderName("");
                loadDocuments();
            }
        } finally {
            setIsFolderLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!uploadFile || !user) return;
        setIsUploadLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", uploadFile);

            const uploadRes = await fetch("/api/documents/upload", {
                method: "POST",
                body: formData,
            });
            const uploadData = await uploadRes.json();

            if (!uploadData.url) {
                alert("업로드에 실패했습니다.");
                return;
            }

            const result = await createDocument({
                name: uploadFile.name,
                mimeType: uploadFile.type || undefined,
                size: uploadFile.size,
                url: uploadData.url,
                uploaderId: user.id,
                folderId: currentFolderId,
                versionNote: "최초 업로드",
            });

            if (result.success) {
                setUploadFile(null);
                setUploadOpen(false);
                loadDocuments();
            }
        } finally {
            setIsUploadLoading(false);
        }
    };

    if (!user) return null;

    const isSearchMode = searchResults !== null;

    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-8">
            <header className="border-b pb-5 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Folder className="h-6 w-6 text-amber-400" />
                        <h1 className="text-2xl font-extrabold tracking-tight text-primary">자료실</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-1.5">
                                    <Upload className="h-4 w-4" />
                                    파일 업로드
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-sm">
                                <DialogHeader>
                                    <DialogTitle>파일 업로드</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 mt-2">
                                    <label
                                        htmlFor="file-upload"
                                        className="flex flex-col items-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer hover:border-primary/50 transition-colors"
                                    >
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            {uploadFile ? uploadFile.name : "파일을 선택하세요"}
                                        </span>
                                        {uploadFile && (
                                            <span className="text-xs text-muted-foreground">
                                                {formatBytes(uploadFile.size)}
                                            </span>
                                        )}
                                        <input
                                            id="file-upload"
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                        />
                                    </label>
                                    <Button
                                        onClick={handleUpload}
                                        disabled={!uploadFile || isUploadLoading}
                                        className="w-full"
                                    >
                                        {isUploadLoading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                업로드 중...
                                            </>
                                        ) : "업로드"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    팀의 파일을 폴더별로 정리하고 버전을 관리하세요.
                </p>
            </header>

            {/* 검색 + 정렬 바 */}
            <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="문서 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-8 h-8 text-sm pr-8"
                    />
                    {searchQuery && (
                        <button
                            onClick={clearSearch}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSearch}
                    disabled={!searchQuery.trim() || isSearching}
                    className="h-8 gap-1"
                >
                    {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    검색
                </Button>

                {/* 정렬 */}
                <div className="relative ml-auto">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs"
                        onClick={() => setShowSortMenu(!showSortMenu)}
                    >
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        {SORT_OPTIONS.find((o) => o.value === sortOption)?.label}
                    </Button>
                    {showSortMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-popover border rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
                            {SORT_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors ${
                                        sortOption === opt.value ? "text-primary font-medium" : "text-muted-foreground"
                                    }`}
                                    onClick={() => { setSortOption(opt.value); setShowSortMenu(false); }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 검색 모드 표시 */}
            {isSearchMode && (
                <div className="flex items-center gap-2 mb-4 text-sm">
                    <Badge variant="secondary" className="gap-1">
                        <Search className="h-3 w-3" />
                        &ldquo;{searchQuery}&rdquo; 검색 결과: {searchResults.length}건
                    </Badge>
                    <button onClick={clearSearch} className="text-xs text-primary hover:underline">
                        검색 해제
                    </button>
                </div>
            )}

            {/* 브레드크럼 (검색 모드가 아닐 때) */}
            {!isSearchMode && (
                <>
                    <div className="flex items-center gap-1 text-sm mb-4 flex-wrap">
                        <button
                            className="text-primary hover:underline font-medium"
                            onClick={() => goToBreadcrumb(-1)}
                        >
                            자료실 홈
                        </button>
                        {breadcrumb.map((crumb, idx) => (
                            <React.Fragment key={crumb.id}>
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                <button
                                    className="text-primary hover:underline font-medium"
                                    onClick={() => goToBreadcrumb(idx)}
                                >
                                    {crumb.name}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>

                    {/* 폴더 생성 인라인 */}
                    <div className="flex items-center gap-2 mb-5">
                        <Input
                            placeholder="새 폴더 이름"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                            className="max-w-xs h-8 text-sm"
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCreateFolder}
                            disabled={!newFolderName.trim() || isFolderLoading}
                            className="h-8 gap-1"
                        >
                            <FolderPlus className="h-3.5 w-3.5" />
                            폴더 생성
                        </Button>
                    </div>
                </>
            )}

            {/* 탐색기 */}
            {isLoading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : (
                <div className="bg-card border rounded-xl overflow-hidden">
                    {(isSearchMode ? sortedDocuments.length === 0 : folders.length === 0 && sortedDocuments.length === 0) ? (
                        <div className="text-center py-16 text-muted-foreground">
                            {isSearchMode ? (
                                <>
                                    <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">검색 결과가 없습니다.</p>
                                </>
                            ) : (
                                <>
                                    <Folder className="h-8 w-8 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">이 폴더는 비어 있습니다.</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* 폴더 목록 (검색 모드가 아닐 때) */}
                            {!isSearchMode && folders.map((folder) => (
                                <div key={folder.id} className="group">
                                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors border-b border-muted/30">
                                        <button
                                            className="flex items-center gap-3 flex-1 min-w-0"
                                            onClick={() => enterFolder(folder)}
                                        >
                                            <FolderOpen className="h-5 w-5 text-amber-400 flex-shrink-0" />
                                            <span className="text-sm font-medium truncate">{folder.name}</span>
                                        </button>
                                        {folder.creatorId === user.id && (
                                            <button
                                                onClick={async () => {
                                                    await deleteDocFolder(folder.id, user.id);
                                                    loadDocuments();
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* 문서 목록 */}
                            {sortedDocuments.map((doc) => (
                                <div key={doc.id} className="border-b border-muted/30 last:border-b-0">
                                    <DocumentDetailDialog
                                        document={doc}
                                        currentUserId={user.id}
                                        onDeleted={loadDocuments}
                                        onVersionAdded={loadDocuments}
                                    />
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}

            {/* 문서 수 표시 */}
            {!isLoading && (
                <div className="text-xs text-muted-foreground mt-3 text-right">
                    {isSearchMode
                        ? `검색 결과 ${sortedDocuments.length}건`
                        : `폴더 ${folders.length}개 · 문서 ${sortedDocuments.length}개`
                    }
                </div>
            )}
        </div>
    );
}

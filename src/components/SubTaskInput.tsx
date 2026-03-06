"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SubTaskInputProps {
    subTasks: { title: string }[];
    onAdd: (title: string) => void;
    onRemove: (index: number) => void;
}

export function SubTaskInput({ subTasks, onAdd, onRemove }: SubTaskInputProps) {
    const [inputValue, setInputValue] = useState("");

    const handleAdd = () => {
        const trimmed = inputValue.trim();
        if (!trimmed) return;
        onAdd(trimmed);
        setInputValue("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">📋 하위 업무 (선택사항)</label>

            {subTasks.length > 0 && (
                <div className="space-y-1">
                    {subTasks.map((st, index) => (
                        <div key={index} className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-1.5">
                            <span className="flex-1 text-sm">{st.title}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => onRemove(index)}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-2">
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="하위 업무 제목 입력..."
                    className="h-8 text-sm"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 flex-shrink-0"
                    onClick={handleAdd}
                    disabled={!inputValue.trim()}
                >
                    <Plus className="h-3.5 w-3.5 mr-1" /> 추가
                </Button>
            </div>
        </div>
    );
}

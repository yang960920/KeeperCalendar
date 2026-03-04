import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Task {
    id: string;
    date: string; // "YYYY-MM-DD"
    title: string;
    content?: string; // 업무 내용 상세
    fileUrl?: string; // 첨부파일 URL (또는 Blob URL)
    category: string;
    planned: number;
    done: number;
    weight: number;
    projectId?: string; // 소속 프로젝트 ID (없으면 개인 업무 일지)
    assigneeId?: string; // 담당자 ID (ex: "양현준")
    endDate?: string; // "YYYY-MM-DD"
    completedAt?: string; // ISO DateTime string
}

interface TaskState {
    tasks: Task[];
    addTask: (task: Omit<Task, 'id'>) => void;
    updateTask: (id: string, updatedTask: Partial<Task>) => void;
    deleteTask: (id: string) => void;
}

export const useTaskStore = create<TaskState>()(
    persist(
        (set) => ({
            tasks: [],
            addTask: (task) =>
                set((state) => ({
                    tasks: [
                        ...state.tasks,
                        { ...task, id: crypto.randomUUID() },
                    ],
                })),
            updateTask: (id, updatedTask) =>
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === id ? { ...t, ...updatedTask } : t
                    ),
                })),
            deleteTask: (id) =>
                set((state) => ({
                    tasks: state.tasks.filter((t) => t.id !== id),
                })),
        }),
        {
            name: 'keeper-calendar-storage', // localStorage key name
        }
    )
);

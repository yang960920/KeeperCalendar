import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SubTask {
    id: string;
    title: string;
    description?: string;
    isCompleted: boolean;
    status?: 'TODO' | 'IN_PROGRESS' | 'DONE';  // Phase 3: 3단계 상태
    completedAt?: string;
    assigneeId?: string;
    dueDate?: string;
    endDate?: string;
}

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
    assigneeId?: string; // 기존 1:N 호환 유지
    assigneeIds?: string[]; // 복수 담당자 (다대다)
    endDate?: string; // "YYYY-MM-DD"
    completedAt?: string; // ISO DateTime string
    subTasks?: SubTask[];
}

interface TaskState {
    tasks: Task[];
    addTask: (task: Omit<Task, 'id'> & { id?: string }) => void;
    updateTask: (id: string, updatedTask: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    // SubTask 로컬 상태 업데이트
    addSubTaskLocal: (taskId: string, subTask: SubTask) => void;
    toggleSubTaskLocal: (taskId: string, subTaskId: string) => void;
    deleteSubTaskLocal: (taskId: string, subTaskId: string) => void;
    updateSubTaskLocal: (taskId: string, subTaskId: string, title: string) => void;
}

export const useTaskStore = create<TaskState>()(
    persist(
        (set) => ({
            tasks: [],
            addTask: (task) =>
                set((state) => ({
                    tasks: [
                        ...state.tasks,
                        { ...task, id: task.id || crypto.randomUUID() },
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
            addSubTaskLocal: (taskId, subTask) =>
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === taskId
                            ? { ...t, subTasks: [...(t.subTasks || []), subTask] }
                            : t
                    ),
                })),
            toggleSubTaskLocal: (taskId, subTaskId) =>
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === taskId
                            ? {
                                ...t,
                                subTasks: (t.subTasks || []).map((st) =>
                                    st.id === subTaskId
                                        ? { ...st, isCompleted: !st.isCompleted, completedAt: !st.isCompleted ? new Date().toISOString() : undefined }
                                        : st
                                ),
                            }
                            : t
                    ),
                })),
            deleteSubTaskLocal: (taskId, subTaskId) =>
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === taskId
                            ? { ...t, subTasks: (t.subTasks || []).filter((st) => st.id !== subTaskId) }
                            : t
                    ),
                })),
            updateSubTaskLocal: (taskId, subTaskId, title) =>
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === taskId
                            ? {
                                ...t,
                                subTasks: (t.subTasks || []).map((st) =>
                                    st.id === subTaskId ? { ...st, title } : st
                                ),
                            }
                            : t
                    ),
                })),
        }),
        {
            name: 'keeper-calendar-storage', // localStorage key name
        }
    )
);

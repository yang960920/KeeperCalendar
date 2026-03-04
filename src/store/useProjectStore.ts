import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Project {
    id: string;
    title: string;
    creatorId: string; // "김권찬"
    participantIds: string[]; // ["양현준", ...]
    createdAt: string;
}

interface ProjectState {
    projects: Project[];
    addProject: (project: Omit<Project, 'id' | 'createdAt'> & { id?: string, createdAt?: string }) => void;
    updateProject: (id: string, updatedProject: Partial<Project>) => void;
    deleteProject: (id: string) => void;
}

export const useProjectStore = create<ProjectState>()(
    persist(
        (set) => ({
            projects: [],
            addProject: (project) =>
                set((state) => ({
                    projects: [
                        {
                            ...project,
                            id: project.id || crypto.randomUUID(),
                            createdAt: project.createdAt || new Date().toISOString(),
                        },
                        ...state.projects,
                    ],
                })),
            updateProject: (id, updatedProject) =>
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === id ? { ...p, ...updatedProject } : p
                    ),
                })),
            deleteProject: (id) =>
                set((state) => ({
                    projects: state.projects.filter((p) => p.id !== id),
                })),
        }),
        {
            name: 'keeper-project-storage',
        }
    )
);

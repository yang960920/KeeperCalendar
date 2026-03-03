import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "CREATOR" | "PARTICIPANT";

export interface User {
    id: string; // The login ID (e.g. 김권찬)
    name: string;
    role: Role;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    login: (userData: User) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            login: (userData) =>
                set({
                    user: userData,
                    isAuthenticated: true,
                }),
            logout: () =>
                set({
                    user: null,
                    isAuthenticated: false,
                }),
        }),
        {
            name: "auth-storage",
        }
    )
);


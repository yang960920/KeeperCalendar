import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "CREATOR" | "PARTICIPANT";

export interface User {
    id: string;
    name: string;
    role: Role;
    profileImageUrl?: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    login: (userData: User) => void;
    logout: () => void;
    setProfileImage: (url: string) => void;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),
            login: (userData) =>
                set({
                    user: userData,
                    isAuthenticated: true,
                }),
            setProfileImage: (url) =>
                set((state) => ({
                    user: state.user ? { ...state.user, profileImageUrl: url } : null,
                })),
            logout: () =>
                set({
                    user: null,
                    isAuthenticated: false,
                }),
        }),
        {
            name: "auth-storage",
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);

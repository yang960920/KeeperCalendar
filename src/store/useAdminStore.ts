import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AdminState {
    isAdminAuthenticated: boolean;
    adminLogin: () => void;
    adminLogout: () => void;
}

export const useAdminStore = create<AdminState>()(
    persist(
        (set) => ({
            isAdminAuthenticated: false,
            adminLogin: () => set({ isAdminAuthenticated: true }),
            adminLogout: () => set({ isAdminAuthenticated: false }),
        }),
        {
            name: "admin-auth-storage",
        }
    )
);

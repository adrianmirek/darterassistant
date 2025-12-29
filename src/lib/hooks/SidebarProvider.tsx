import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface SidebarContextType {
  isExpanded: boolean;
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

interface SidebarProviderProps {
  children: ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  // Use lazy initializer to read from localStorage synchronously on first render
  // This prevents the flash when navigating between pages
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem("darter-sidebar-expanded");
      return savedState === "true"; // Default to false (collapsed)
    }
    return false;
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("darter-sidebar-expanded", String(isExpanded));
  }, [isExpanded]);

  const toggleSidebar = () => {
    setIsExpanded((prev) => !prev);
  };

  const setSidebarExpanded = (expanded: boolean) => {
    setIsExpanded(expanded);
  };

  return (
    <SidebarContext.Provider value={{ isExpanded, toggleSidebar, setSidebarExpanded }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebarContext must be used within a SidebarProvider");
  }
  return context;
}

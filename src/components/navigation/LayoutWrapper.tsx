import { type ReactNode } from "react";
import { SidebarProvider } from "@/lib/hooks/SidebarProvider";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

interface LayoutWrapperProps {
  children: ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <SidebarProvider>
      <div className="relative min-h-screen">
        <Sidebar />
        {/* Main Content Area - pt-20 accounts for fixed header height */}
        <div className="pt-20 pb-14">{children}</div>
        <Footer />
      </div>
    </SidebarProvider>
  );
}

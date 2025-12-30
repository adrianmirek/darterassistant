import { type ReactNode } from "react";
import { SidebarProvider } from "@/lib/hooks/SidebarProvider";
import { ThemeProvider } from "@/lib/hooks/ThemeProvider";
import { I18nProvider } from "@/lib/hooks/I18nProvider";
import type { Language } from "@/lib/i18n";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

interface LayoutWrapperProps {
  children: ReactNode;
  lang: Language;
}

export default function LayoutWrapper({ children, lang }: LayoutWrapperProps) {
  return (
    <I18nProvider lang={lang}>
      <ThemeProvider>
        <SidebarProvider>
          <div className="relative min-h-screen">
            <Sidebar />
            {/* Main Content Area - pt-20 accounts for fixed header height */}
            <div className="pt-20 pb-14">{children}</div>
            <Footer />
          </div>
        </SidebarProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

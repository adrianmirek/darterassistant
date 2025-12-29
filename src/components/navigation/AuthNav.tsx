import { Button } from "@/components/ui/button";
import { LogOut, Target } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ThemeProvider } from "@/lib/hooks/ThemeProvider";

interface AuthNavProps {
  userEmail: string;
}

export default function AuthNav({ userEmail }: AuthNavProps) {
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin", // Ensure cookies are sent
      });

      // Always redirect after logout attempt, regardless of response
      // Use replace to prevent back button from returning to authenticated page
      window.location.replace("/auth/login");
    } catch {
      // Redirect anyway to ensure user is logged out
      window.location.replace("/auth/login");
    }
  };

  return (
    <ThemeProvider>
      <header className="fixed top-0 left-0 right-0 border-b bg-background transition-colors duration-200 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* App Logo/Name */}
            <div className="flex items-center gap-2 group">
              <Target className="h-6 w-6 text-blue-400 group-hover:text-purple-400 transition-colors duration-300" />
              <h1 className="font-mono text-lg md:text-xl font-semibold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent group-hover:from-teal-400 group-hover:to-purple-400 transition-colors duration-300">
                Darter Assistant
              </h1>
            </div>

            {/* User Info, Theme Toggle, and Logout */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{userEmail}</span>
              </div>

              <ThemeToggle />

              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
    </ThemeProvider>
  );
}

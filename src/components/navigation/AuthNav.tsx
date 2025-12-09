import { Button } from "@/components/ui/button";
import { LogOut, Target } from "lucide-react";

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
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* App Logo/Name */}
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Darter Assistant</span>
          </div>

          {/* User Info and Logout */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{userEmail}</span>
            </div>

            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

import { Target } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ThemeProvider } from "@/lib/hooks/ThemeProvider";

export default function GuestNav() {
  return (
    <ThemeProvider>
      <header className="border-b bg-background transition-colors duration-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* App Logo/Name */}
            <div className="flex items-center gap-2 group">
              <Target className="h-6 w-6 text-blue-400 group-hover:text-purple-400 transition-colors duration-300" />
              <h1 className="font-mono text-lg md:text-xl font-semibold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent group-hover:from-teal-400 group-hover:to-purple-400 transition-colors duration-300">
                Darter Assistant
              </h1>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </header>
    </ThemeProvider>
  );
}

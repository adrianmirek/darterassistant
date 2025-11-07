import { Button } from '@/components/ui/button';
import { LogOut, Target } from 'lucide-react';

interface AuthNavProps {
  userEmail: string;
}

export default function AuthNav({ userEmail }: AuthNavProps) {
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
            
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href="/auth/logout">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}


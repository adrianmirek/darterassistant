import { Target } from 'lucide-react';

export default function GuestNav() {
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center">
          {/* App Logo/Name */}
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Darter Assistant</span>
          </div>
        </div>
      </div>
    </header>
  );
}


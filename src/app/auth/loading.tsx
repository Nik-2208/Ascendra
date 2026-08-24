import { Swords } from "lucide-react";

export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
        <div className="w-16 h-16 border-4 border-background border-t-primary rounded-full animate-spin flex items-center justify-center relative z-10">
          <Swords className="text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size={24} />
        </div>
      </div>
    </div>
  );
}

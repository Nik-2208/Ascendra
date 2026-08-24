import Link from "next/link";
import { AscendraLogo } from "@/components/ui/ascendra-logo";
import { SpecularButton } from "@/components/ui/specular-button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[140px] pointer-events-none" />
      
      <AscendraLogo size="xl" className="mb-6" />
      
      <h1 className="text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-300 mb-2">
        404
      </h1>
      <p className="text-lg font-serif text-slate-300 mb-2">
        Lost in the Mist of the Realm
      </p>
      <p className="text-xs text-slate-500 max-w-sm mb-8">
        The location you are seeking has vanished into ancient ruins or does not exist in this domain.
      </p>

      <Link href="/">
        <SpecularButton variant="primary">
          Return to Adventurer's Hall
        </SpecularButton>
      </Link>
    </div>
  );
}

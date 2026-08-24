"use client";

import { useCharacterStore } from "@/stores/character-store";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

const ONBOARDING_STEPS = [
  "/onboarding",
  "/onboarding/class",
  "/onboarding/avatar",
  "/onboarding/first-quest"
];

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const user = session?.user;
  const authLoading = status === "loading";
  const { profile, loading: profileLoading, loadProfile } = useCharacterStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.id) {
      loadProfile(user.id);
    }
  }, [user, loadProfile]);

  useEffect(() => {
    if (!profileLoading && profile) {
      router.push("/");
    }
  }, [profile, profileLoading, router]);

  if (authLoading || profileLoading || !user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentStepIndex = ONBOARDING_STEPS.indexOf(pathname);
  const progress = ((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-black to-black opacity-60 z-0 pointer-events-none" />
      
      {/* Progress Bar */}
      {currentStepIndex >= 0 && (
        <div className="fixed top-0 left-0 w-full h-1 bg-black z-50">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_15px_rgba(var(--primary),0.8)] transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <main className="flex-1 flex flex-col items-center justify-center relative z-10 p-6">
        {children}
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Swords } from "lucide-react";
import { signUpUser } from "@/actions/auth-actions";
import { GlassSurface } from "@/components/ui/glass-surface";
import { SpecularButton } from "@/components/ui/specular-button";
import { AscendraLogo } from "@/components/ui/ascendra-logo";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!isLogin) {
        const signUpRes = await signUpUser(email, password);
        if (!signUpRes.success) {
          throw new Error(signUpRes.error);
        }
      }

      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Authentication failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F172A] p-4 relative overflow-hidden font-sans select-none">
      {/* Safari Cross-Browser Aurora Gradient Fallbacks */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#6D5EF8]/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[350px] h-[350px] bg-[#2ECC71]/15 rounded-full blur-[120px] pointer-events-none" />

      <GlassSurface glow="purple" className="w-full max-w-md p-8 rounded-3xl z-10 relative">
        <div className="flex flex-col items-center justify-center mb-6 text-center">
          <AscendraLogo size="xl" />
          <p className="text-slate-400 text-xs mt-3">
            {isLogin ? "Enter your hero credentials to access the realm" : "Create your hero character to begin your journey"}
          </p>
        </div>

        {error && (
          <div className="bg-[#E74C3C]/20 border border-[#E74C3C] text-white px-4 py-2.5 rounded-xl mb-6 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest font-serif">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#6D5EF8] transition-all placeholder:text-slate-600"
              placeholder="hero@ascendra.realm"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest font-serif">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#6D5EF8] transition-all"
              required
            />
          </div>

          <SpecularButton 
            type="submit" 
            disabled={loading}
            variant="primary"
            className="w-full py-3.5 mt-2"
          >
            {loading ? "Authenticating..." : (isLogin ? "Enter the Realm" : "Forge Character")}
          </SpecularButton>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-slate-400 hover:text-[#6D5EF8] transition-colors underline-offset-4 hover:underline font-medium"
          >
            {isLogin ? "New hero? Forge a character" : "Already an adventurer? Sign in"}
          </button>
        </div>
      </GlassSurface>
    </div>
  );
}

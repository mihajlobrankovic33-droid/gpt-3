import { useState, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { Loader2, Mail, Eye, EyeOff } from "lucide-react";

export const AuthScreen = forwardRef<HTMLDivElement>((_, ref) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useSupabaseAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = isLogin 
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password);

    if (result.error) {
      setError(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div ref={ref} className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      
      {/* Auth content */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Study Buddy</h1>
          <p className="text-sm text-muted-foreground">Tvoj AI pomoćnik za učenje</p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 border-border bg-card hover:bg-muted"
            onClick={signInWithGoogle}
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Prijavi se sa Google
          </Button>

          {/* Apple Sign-In - Disabled with message */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 border-border bg-card opacity-50 cursor-not-allowed"
            disabled
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Prijavi se sa Apple (uskoro)
          </Button>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">ili</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ime@email.com"
                className="pl-10 h-12 bg-card border-border"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Lozinka</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 bg-card border-border pr-10"
                required
                disabled={isLoading}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-center p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-bold text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {isLogin ? "Prijavljivanje..." : "Registracija..."}
              </>
            ) : (
              isLogin ? "Prijavi se" : "Registruj se"
            )}
          </Button>
        </form>

        {/* Toggle Login/Signup */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          {isLogin ? "Nemaš nalog? " : "Već imaš nalog? "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-primary hover:underline font-medium"
          >
            {isLogin ? "Registruj se" : "Prijavi se"}
          </button>
        </p>
      </div>
    </div>
  );
});

AuthScreen.displayName = "AuthScreen";

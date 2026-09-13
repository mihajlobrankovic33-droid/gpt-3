import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  is_pro: boolean;
  subscription_expiry_date: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isPro: boolean;
  isLifetimePro: boolean;
  isAdmin: boolean;
  daysRemaining: number | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  checkAdminStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useSupabaseAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider");
  }
  return context;
};

export const SupabaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  const translateAuthError = useCallback((message?: string) => {
    if (!message) return "Došlo je do greške. Pokušaj ponovo.";

    const m = message.toLowerCase();

    // Email/password
    if (m.includes("invalid login credentials")) return "Pogrešna šifra.";
    if (m.includes("email not confirmed")) return "Email nije potvrđen. Proveri inbox.";
    if (m.includes("user already registered")) return "Email je već registrovan.";
    if (m.includes("password should be at least") || m.includes("at least 6")) {
      return "Lozinka mora imati najmanje 6 karaktera.";
    }

    // OAuth/provider setup
    if (m.includes("provider is not enabled")) {
      return "Google prijava nije omogućena na backendu.";
    }

    return message;
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    return (data as Profile) ?? null;
  }, []);

  const createProfileIfMissing = useCallback(async (userId: string, email: string | null | undefined) => {
    const { error } = await supabase.from("profiles").insert({
      user_id: userId,
      email: email ?? null,
    });

    if (error) {
      console.warn("Error creating profile:", error);
    }
  }, []);

  const ensureProfile = useCallback(
    async (u: User) => {
      const existing = await fetchProfile(u.id);
      if (existing) return existing;

      await createProfileIfMissing(u.id, u.email);
      return await fetchProfile(u.id);
    },
    [fetchProfile, createProfileIfMissing]
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profileData = await ensureProfile(user);
    setProfile(profileData);
  }, [user, ensureProfile]);

  const checkAdminStatus = useCallback(async (): Promise<boolean> => {
    if (!session) return false;
    
    try {
      const { data, error } = await supabase.functions.invoke('check-admin');
      
      if (error) {
        console.error("Error checking admin status:", error);
        return false;
      }
      
      const adminStatus = data?.isAdmin === true;
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch (err) {
      console.error("Error checking admin status:", err);
      return false;
    }
  }, [session]);

  // All features are now free for everyone
  const checkProStatus = useCallback((_profileData: Profile | null): { isPro: boolean; isLifetime: boolean; daysRemaining: number | null } => {
    return { isPro: true, isLifetime: true, daysRemaining: null };
  }, []);

  const proStatus = checkProStatus(profile);

  useEffect(() => {
    let mounted = true;

    if (SUPABASE_PUBLISHABLE_KEY === 'placeholder' || !SUPABASE_PUBLISHABLE_KEY) {
      console.warn("Supabase: Configuration missing.");
      setIsLoading(false);
      return;
    }

    // 1. Set up the listener IMMEDIATELY
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      console.log(`Supabase Auth state changed: ${event}`, !!s);
      
      if (!mounted) return;

      if (s) {
        setSession(s);
        setUser(s.user);
        
        // Fetch profile
        try {
          const p = await ensureProfile(s.user);
          if (mounted) setProfile(p);
        } catch (e) {
          console.error("Profile sync error:", e);
        }

        // URL cleanup
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          const params = ['access_token', 'id_token', 'code', 'error', 'error_description', 'state'];
          const url = new URL(window.location.href);
          let changed = false;
          params.forEach(p => {
            if (url.searchParams.has(p)) {
              url.searchParams.delete(p);
              changed = true;
            }
          });
          if (url.hash && (url.hash.includes('access_token') || url.hash.includes('id_token'))) {
            url.hash = '';
            changed = true;
          }
          if (changed) window.history.replaceState(null, '', url.pathname + url.search);
        }
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      }
      
      setIsLoading(false);
    });

    // 2. Immediate check
    const initSession = async () => {
      try {
        const { data: { session: s }, error } = await supabase.auth.getSession();
        if (error) console.error("Initial getSession error:", error);
        
        if (s && mounted) {
          setSession(s);
          setUser(s.user);
          const p = await ensureProfile(s.user);
          if (mounted) setProfile(p);
          setIsLoading(false);
        } else if (!window.location.hash.includes('access_token') && !window.location.search.includes('code=')) {
          // Only stop loading if we are NOT in an auth redirect flow
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Auth init exception:", err);
        if (mounted) setIsLoading(false);
      }
    };

    initSession();

    // 3. Robust timeout
    const timeout = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
      }
    }, 8000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [ensureProfile]);

  useEffect(() => {
    if (session) {
      checkAdminStatus();
    }
  }, [session, checkAdminStatus]);

  const signInWithGoogle = async () => {
    try {
      console.log("Supabase: Initiating Google login...");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      console.error("Supabase login error:", err);
      toast({
        title: "Greška pri prijavi",
        description: translateAuthError(err instanceof Error ? err.message : String(err)),
        variant: "destructive",
      });
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    if (data.user) {
      await ensureProfile(data.user);
    }

    return { error: null };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    if (data.session?.user) {
      await ensureProfile(data.session.user);
      setSession(data.session);
      setUser(data.session.user);
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isLoading,
      isPro: proStatus.isPro,
      isLifetimePro: proStatus.isLifetime,
      isAdmin,
      daysRemaining: proStatus.daysRemaining,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      refreshProfile,
      checkAdminStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

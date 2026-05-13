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
  activateProWithCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  activateProWithPayment: () => Promise<void>;
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

  const checkProStatus = useCallback((profileData: Profile | null): { isPro: boolean; isLifetime: boolean; daysRemaining: number | null } => {
    if (!profileData) return { isPro: false, isLifetime: false, daysRemaining: null };
    
    if (!profileData.is_pro) return { isPro: false, isLifetime: false, daysRemaining: null };
    
    if (!profileData.subscription_expiry_date) {
      return { isPro: true, isLifetime: true, daysRemaining: null };
    }
    
    const expiryDate = new Date(profileData.subscription_expiry_date);
    const now = new Date();
    
    if (expiryDate <= now) {
      supabase
        .from('profiles')
        .update({ is_pro: false })
        .eq('user_id', profileData.user_id)
        .then(() => {
          refreshProfile();
        });
      return { isPro: false, isLifetime: false, daysRemaining: null };
    }
    
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { isPro: true, isLifetime: false, daysRemaining };
  }, [refreshProfile]);

  const proStatus = checkProStatus(profile);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log("Supabase: Initializing auth...");
      
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const hasAccessToken = hash.includes('access_token') || hash.includes('id_token');
      const hasCode = search.includes('code=');
      const hasError = hash.includes('error') || search.includes('error=');
      const hasAuthParams = hasAccessToken || hasCode;
      
      // 1. Safety check for setup
      if (SUPABASE_PUBLISHABLE_KEY === 'placeholder' || !SUPABASE_PUBLISHABLE_KEY) {
        console.warn("Supabase: Missing configuration.");
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        // 2. Explicit code exchange if using PKCE
        if (hasCode) {
          const code = new URLSearchParams(search).get('code');
          if (code) {
            console.log("Supabase: Exchanging code for session...");
            await supabase.auth.exchangeCodeForSession(code);
          }
        }

        // 3. Get session (handles implicit flow automatically)
        const { data: { session: s }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) console.error("Supabase: Session error:", sessionError);

        if (s) {
          console.log("Supabase: Found session for:", s.user.id);
          if (mounted) {
            setSession(s);
            setUser(s.user);
            const p = await ensureProfile(s.user);
            if (mounted) setProfile(p);
            setIsLoading(false);
          }
        } else if (hasAuthParams) {
          console.log("Supabase: Auth params present but no session yet. Waiting for SDK/StateChange...");
          
          // Poll a few times as a backup
          let found = false;
          for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 800));
            const { data: { session: poleS } } = await supabase.auth.getSession();
            if (poleS) {
              console.log("Supabase: Session found after polling.");
              if (mounted) {
                setSession(poleS);
                setUser(poleS.user);
                const p = await ensureProfile(poleS.user);
                if (mounted) setProfile(p);
                setIsLoading(false);
              }
              found = true;
              break;
            }
          }
          
          if (!found && mounted) {
            if (hasError) {
              toast({
                title: "Greška pri prijavi",
                description: "Došlo je do greške prilikom prijave na Google.",
                variant: "destructive",
              });
            }
            setIsLoading(false);
          }
        } else {
          if (mounted) setIsLoading(false);
        }
      } catch (e) {
        console.error("Supabase: Initialization exception:", e);
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    // 3. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Supabase: Auth state changed event:", event, !!currentSession);
        
        if (mounted) {
          if (currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
            setIsLoading(false);
            
            ensureProfile(currentSession.user).then(profileData => {
              if (mounted) setProfile(profileData);
            }).catch(e => {
              console.error("Supabase: Non-blocking profile fetch error in state change:", e);
            });
            
            // Handle hash/query cleaning if we have a session
            if (typeof window !== 'undefined') {
              const h = window.location.hash;
              const s = window.location.search;
              if (h.includes('access_token') || h.includes('id_token') || s.includes('code=')) {
                console.log("Supabase: Cleaning URL after successful auth");
                window.history.replaceState(null, '', window.location.pathname);
                toast({
                  title: "Uspešna prijava",
                  description: "Dobrodošli nazad!",
                });
              }
            }
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
            setIsAdmin(false);
            // Only stop loading if we're not in the middle of a token check
            if (typeof window !== 'undefined') {
              const h = window.location.hash;
              const s = window.location.search;
              if (!h.includes('access_token') && !h.includes('id_token') && !s.includes('code=')) {
                setIsLoading(false);
              }
            }
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [ensureProfile, toast]);

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

  const activateProWithCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Niste prijavljeni" };
    
    const { data, error } = await supabase.functions.invoke('redeem-pro-code', {
      body: { 
        code: code.toUpperCase().trim(),
        deviceId: localStorage.getItem('device_id') || 'unknown'
      }
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    if (data?.error) {
      return { success: false, error: data.error };
    }
    
    await refreshProfile();
    return { success: true };
  };

  const activateProWithPayment = async () => {
    if (!user) return;
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        is_pro: true, 
        subscription_expiry_date: expiryDate.toISOString() 
      })
      .eq('user_id', user.id);
    
    if (error) {
      toast({
        title: "Greška",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    
    await refreshProfile();
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
      activateProWithCode,
      activateProWithPayment,
      refreshProfile,
      checkAdminStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

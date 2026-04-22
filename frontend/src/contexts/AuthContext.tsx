import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

// --- TYPES ---
export type Role = "founder" | "collaborator" | "investor" | "organisation";

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string | null;
  phone: string;
  country: string;
  country_code: string;
  avatar_url: string | null;
  bio: string | null;
  role: Role;
  secondary_roles: Role[];
  credit_balance: number;
  credibility_score: number;
  is_verified: boolean;
  is_onboarded: boolean;
  startup_stage: string | null;
  industries: string[];
  experience: string | null;
  skills: string[];
  weekly_hours: number | null;
  risk_tolerance: string | null;
  investment_focus: string[];
  ticket_size: string | null;
  org_name: string | null;
  org_type: string | null;
  website: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  timezone: string | null;
  certifications: Array<{
    id: string;
    name: string;
    issuer: string;
    verified: boolean;
    issued_at: string;
    file_url?: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  countryCode: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Instant Load from Cache
  const [profile, setProfile] = useState<Profile | null>(() => {
    const cached = localStorage.getItem("techit_auth_cache");
    return cached ? JSON.parse(cached) : null;
  });

  const [loading, setLoading] = useState(!localStorage.getItem("techit_auth_cache"));

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (data && !error) {
        setProfile(data);
        localStorage.setItem("techit_auth_cache", JSON.stringify(data));
      } else if (!data && !error) {
        // Auto-repair missing profile row
        const { data: newProfile } = await supabase
          .from("profiles")
          .insert({
            user_id: userId,
            email: localStorage.getItem("techit_last_email") || "",
            first_name: "TechIT",
            last_name: "Builder",
            role: "founder",
            credit_balance: 250,
            skills: [],
            industries: [],
            secondary_roles: [],
            investment_focus: [],
          })
          .select()
          .single();

        if (newProfile) {
          setProfile(newProfile);
          localStorage.setItem("techit_auth_cache", JSON.stringify(newProfile));
        }
      }
    } catch (err) {
      console.warn("Background sync delay.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // EMERGENCY TIMEOUT: Force stop spinner after 3 seconds
    const timer = setTimeout(() => setLoading(false), 3000);

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        localStorage.removeItem("techit_auth_cache");
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await fetchProfile(s.user.id);
      } else {
        setProfile(null);
        localStorage.removeItem("techit_auth_cache");
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (data: SignUpData) => {
    localStorage.setItem("techit_last_email", data.email);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { first_name: data.firstName, last_name: data.lastName } },
    });
    if (authError) return { error: new Error(authError.message) };
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    localStorage.setItem("techit_last_email", email);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    localStorage.removeItem("techit_auth_cache");
    setProfile(null); setUser(null); setSession(null);
    setLoading(false);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error("Not authenticated") };
    const { error } = await supabase.from("profiles").update(updates).eq("user_id", user.id);
    if (!error) await fetchProfile(user.id);
    return { error: error ? new Error(error.message) : null };
  };

  const refreshProfile = async () => { if (user) await fetchProfile(user.id); };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, updateProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth error");
  return ctx;
};
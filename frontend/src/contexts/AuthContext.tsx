import {
  createContext, useContext, useEffect, useState,
  useCallback, type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

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
    id: string; name: string; issuer: string;
    verified: boolean; issued_at: string; file_url?: string;
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
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("[Auth] fetchProfile error:", error.message);
      }
      setProfile(data ?? null);
    } catch (err) {
      console.error("[Auth] fetchProfile exception:", err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchProfile(s.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async ({
    email, password, firstName, lastName,
    phone, country, countryCode, role,
  }: SignUpData): Promise<{ error: Error | null }> => {
    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Skip email confirmation in development
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (authError) return { error: new Error(authError.message) };
      if (!authData.user) return { error: new Error("Signup failed — no user returned") };

      const userId = authData.user.id;

      // Step 2: Create profile record
      // Use INSERT with ON CONFLICT DO UPDATE to handle both new and existing
      const profileData = {
        user_id: userId,
        email: email.toLowerCase().trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        country: country.trim(),
        country_code: countryCode,
        role,
        credit_balance: 250,
        credibility_score: 0,
        is_verified: false,
        is_onboarded: false,
        skills: [] as string[],
        industries: [] as string[],
        secondary_roles: [] as string[],
        investment_focus: [] as string[],
        certifications: [] as unknown[],
        updated_at: new Date().toISOString(),
      };

      // Try insert first
      const { error: insertError } = await supabase
        .from("profiles")
        .insert(profileData);

      if (insertError) {
        // If duplicate (user re-registering), try upsert
        if (insertError.code === "23505") {
          const { error: upsertError } = await supabase
            .from("profiles")
            .upsert(profileData, { onConflict: "user_id" });
          if (upsertError) {
            console.error("[Auth] Profile upsert fallback error:", upsertError.message);
            return { error: new Error(`Profile creation failed: ${upsertError.message}`) };
          }
        } else {
          console.error("[Auth] Profile insert error:", insertError.message, insertError.code);
          return { error: new Error(`Could not save user: ${insertError.message}`) };
        }
      }

      return { error: null };
    } catch (e) {
      console.error("[Auth] signUp exception:", e);
      return { error: e instanceof Error ? e : new Error("Unknown signup error") };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error("Not authenticated") };
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (error) return { error: new Error(error.message) };
      await fetchProfile(user.id);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error("Update failed") };
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      signUp, signIn, signOut, updateProfile, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export const CREDIT_COSTS = {
  AI_MATCH: 50,
  IDEA_EVAL: 75,
  PAID_COLLAB_REQUEST: 25,
  FREE_COLLAB_REQUEST: 0,
  PRIORITY_BOOST: 100,
  INCUBATION_HUB: 200,
  EXPORT_REPORT: 30,
} as const;

interface CreditContextType {
  balance: number;
  loading: boolean;
  deduct: (amount: number, action: string, description: string) => Promise<boolean>;
  add: (amount: number, action: string, description: string) => Promise<void>;
  refresh: () => Promise<void>;
  canAfford: (amount: number) => boolean;
}

const CreditContext = createContext<CreditContextType>({
  balance: 0,
  loading: false,
  deduct: async () => false,
  add: async () => {},
  refresh: async () => {},
  canAfford: () => false,
});

export const CreditProvider = ({ children }: { children: ReactNode }) => {
  const { profile, user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.credit_balance !== undefined) {
      setBalance(profile.credit_balance);
    }
  }, [profile?.credit_balance]);

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("credit_balance")
      .eq("user_id", user.id)
      .single();
    if (data) setBalance(data.credit_balance ?? 0);
  };

  const deduct = async (amount: number, action: string, description: string): Promise<boolean> => {
    if (!user || balance < amount) return false;
    setLoading(true);
    const newBalance = balance - amount;
    const { error } = await supabase
      .from("profiles")
      .update({ credit_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (!error) {
      await supabase.from("credit_transactions").insert({
        user_id: user.id, amount: -amount, action, description,
      });
      setBalance(newBalance);
    }
    setLoading(false);
    return !error;
  };

  const add = async (amount: number, action: string, description: string) => {
    if (!user) return;
    const newBalance = balance + amount;
    const { error } = await supabase
      .from("profiles")
      .update({ credit_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (!error) {
      await supabase.from("credit_transactions").insert({
        user_id: user.id, amount, action, description,
      });
      setBalance(newBalance);
    }
  };

  return (
    <CreditContext.Provider value={{
      balance, loading,
      deduct, add, refresh,
      canAfford: (amount) => balance >= amount,
    }}>
      {children}
    </CreditContext.Provider>
  );
};

export const useCredits = () => useContext(CreditContext);

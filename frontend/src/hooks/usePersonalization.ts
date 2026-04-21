import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export interface PersonalizationData {
  greeting: string;
  primaryAction: { label: string; href: string };
  dashboardHint: string;
  creditWarning: boolean;
  profileComplete: number;
  suggestedNextStep: string;
}

export function usePersonalization(): PersonalizationData {
  const { profile } = useAuth();
  const hour = new Date().getHours();

  const greeting =
    hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" :
    "Good evening";

  const role = profile?.role ?? "founder";
  const balance = profile?.credit_balance ?? 0;

  const primaryAction = {
    founder: { label: "Submit New Idea", href: "/idea-submit" },
    collaborator: { label: "Browse Opportunities", href: "/collaborator/opportunities" },
    investor: { label: "View Deal Pipeline", href: "/investor/pipeline" },
    organisation: { label: "Search Talent", href: "/org/talent" },
  }[role] ?? { label: "Dashboard", href: "/dashboard" };

  const profileFields = [
    profile?.bio,
    profile?.skills?.length,
    profile?.linkedin_url,
    profile?.avatar_url,
    profile?.github_url,
    profile?.phone,
  ];
  const profileComplete = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

  const suggestedNextStep = (() => {
    if (profileComplete < 50) return "Complete your profile to improve your match score";
    if (balance < 50 && role === "founder") return "Buy credits to use AI matching (50 credits)";
    if (role === "founder") return "Submit an idea for AI evaluation";
    if (role === "collaborator") return "Check new collaboration opportunities";
    if (role === "investor") return "Browse the latest AI-scored startups";
    return "Post an update on the social feed";
  })();

  const dashboardHint = (() => {
    if (!profile?.is_onboarded) return "Complete your onboarding to unlock all features";
    if (profileComplete < 60) return `Your profile is ${profileComplete}% complete. A complete profile gets 3x more matches.`;
    if (balance < 25) return "Your credit balance is low. Buy credits to keep using AI features.";
    return "";
  })();

  return {
    greeting,
    primaryAction,
    dashboardHint,
    creditWarning: balance < 25,
    profileComplete,
    suggestedNextStep,
  };
}

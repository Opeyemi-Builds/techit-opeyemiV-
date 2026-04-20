import { supabaseAdmin } from "../../config/supabase.js";

export async function recalculateCredibility(userId: string): Promise<number> {
  try {
    const [collabRes, postRes, profileRes, txRes] = await Promise.all([
      supabaseAdmin.from("collaborations").select("status").eq("user_id", userId),
      supabaseAdmin.from("posts").select("likes").eq("author_id", userId),
      supabaseAdmin.from("profiles").select("certifications, created_at, skills, is_verified").eq("user_id", userId).single(),
      supabaseAdmin.from("credit_transactions").select("amount").eq("user_id", userId).gt("amount", 0),
    ]);

    const collabs = collabRes.data ?? [];
    const posts = postRes.data ?? [];
    const profile = profileRes.data;
    const transactions = txRes.data ?? [];

    // Scoring components
    const completedProjects = collabs.filter(c => c.status === "completed").length;
    const activeProjects = collabs.filter(c => c.status === "active").length;
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((sum, p) => sum + (p.likes?.length ?? 0), 0);
    const certCount = Array.isArray(profile?.certifications) ? profile.certifications.length : 0;
    const skillCount = profile?.skills?.length ?? 0;
    const daysOnPlatform = profile?.created_at
      ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const totalEarned = transactions.reduce((s, t) => s + t.amount, 0);
    const isVerified = profile?.is_verified ? 15 : 0;

    const score = Math.min(100, Math.round(
      completedProjects * 15 +
      activeProjects * 5 +
      Math.min(totalPosts, 20) * 1.5 +
      Math.min(totalLikes, 200) * 0.1 +
      certCount * 8 +
      Math.min(skillCount, 10) * 1 +
      Math.min(daysOnPlatform, 365) * 0.05 +
      Math.min(totalEarned / 100, 20) +
      isVerified
    ));

    // Update the profile
    await supabaseAdmin.from("profiles").update({
      credibility_score: score,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    return score;
  } catch (err) {
    console.error("[Credibility] Error recalculating for", userId, err);
    return 0;
  }
}

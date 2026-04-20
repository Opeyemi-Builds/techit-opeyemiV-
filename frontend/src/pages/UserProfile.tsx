import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  MapPin, Globe, Github, Linkedin, Star, MessageCircle,
  Zap, Award, CheckCircle, Calendar, ExternalLink,
  ArrowLeft, TrendingUp, Briefcase, Heart, Clock,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { cn, avatarGradient, initials, roleColor, timeAgo } from "../lib/utils";
import { Card, Badge, RoleBadge, ProgressBar, Avatar } from "../components/ui/card";
import { Button } from "../components/ui/button";

interface ProfileData {
  user_id: string; first_name: string; last_name: string;
  username: string | null; email: string; country: string;
  bio: string | null; role: string; credibility_score: number;
  credit_balance: number; is_verified: boolean; is_onboarded: boolean;
  skills: string[]; industries: string[]; weekly_hours: number | null;
  risk_tolerance: string | null; investment_focus: string[];
  ticket_size: string | null; org_name: string | null; org_type: string | null;
  website: string | null; linkedin_url: string | null; github_url: string | null;
  portfolio_url: string | null;
  certifications: Array<{ id: string; name: string; issuer: string; verified: boolean; issued_at: string }>;
  avatar_url: string | null; created_at: string;
}

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { profile: myProfile } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile]         = useState<ProfileData | null>(null);
  const [projects, setProjects]       = useState<any[]>([]);
  const [posts, setPosts]             = useState<any[]>([]);
  const [collabCount, setCollabCount] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [notFound, setNotFound]       = useState(false);
  const [starting, setStarting]       = useState(false);

  useEffect(() => { if (username) load(); }, [username]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles").select("*")
      .or(`username.eq.${username},user_id.eq.${username}`)
      .single();

    if (!data) { setNotFound(true); setLoading(false); return; }
    setProfile(data);

    await Promise.all([
      data.role === "founder"
        ? supabase.from("projects").select("id,title,pitch,industry,stage,ai_score,created_at")
            .eq("founder_id", data.user_id).eq("status", "active").limit(4)
            .then(({ data: d }) => setProjects(d ?? []))
        : Promise.resolve(),

      supabase.from("posts").select("id,content,likes,tags,collab_tag,created_at")
        .eq("author_id", data.user_id)
        .order("created_at", { ascending: false }).limit(3)
        .then(({ data: d }) => setPosts(d ?? [])),

      supabase.from("collaborations").select("id", { count: "exact", head: true })
        .eq("user_id", data.user_id)
        .then(({ count }) => setCollabCount(count ?? 0)),
    ]);

    setLoading(false);
  }

  async function startConversation() {
    if (!myProfile) { navigate("/login"); return; }
    setStarting(true);

    const { data: existing } = await supabase.from("conversations")
      .select("id")
      .contains("participant_ids", [myProfile.user_id, profile!.user_id])
      .single();

    if (existing) {
      navigate("/messages", { state: { conversationId: existing.id } });
    } else {
      const { data } = await supabase.from("conversations")
        .insert({ participant_ids: [myProfile.user_id, profile!.user_id] })
        .select().single();
      if (data) navigate("/messages", { state: { conversationId: data.id } });
    }
    setStarting(false);
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
      <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
        <Zap className="size-7 text-muted-foreground/40" />
      </div>
      <h1 className="font-display font-bold text-2xl text-foreground">Profile not found</h1>
      <p className="text-muted-foreground">The user @{username} does not exist.</p>
      <Button variant="gradient" onClick={() => navigate("/feed")}>Go to Feed</Button>
    </div>
  );

  if (!profile) return null;

  const fullName = `${profile.first_name} ${profile.last_name}`;
  const isOwn = myProfile?.user_id === profile.user_id;
  const rc = roleColor(profile.role);
  const certs = Array.isArray(profile.certifications) ? profile.certifications : [];
  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-border">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="size-4" /> Back
        </button>
        <Link to="/" className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Zap className="size-3.5 text-white" />
          </div>
          <span className="font-display font-bold text-sm text-foreground">TECHIT</span>
        </Link>
        {isOwn ? (
          <Link to="/settings"><Button variant="outline" size="sm">Edit Profile</Button></Link>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={startConversation} loading={starting}>
              <MessageCircle className="size-4" /> Message
            </Button>
            <Button variant="gradient" size="sm" onClick={() => navigate("/matches")}>
              <Zap className="size-4" /> Collaborate
            </Button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/15 via-secondary/8 to-background border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className={cn(
                "size-24 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-3xl font-bold shadow-xl overflow-hidden",
                avatarGradient(fullName)
              )}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt={fullName} className="size-full object-cover" />
                  : initials(fullName)
                }
              </div>
              {profile.is_verified && (
                <div className="absolute -bottom-1 -right-1 size-7 rounded-full bg-teal-500 border-2 border-background flex items-center justify-center">
                  <CheckCircle className="size-4 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="font-display font-extrabold text-3xl tracking-tight text-foreground">{fullName}</h1>
                <RoleBadge role={profile.role} />
                {profile.is_verified && <Badge variant="teal">Verified</Badge>}
              </div>
              {profile.username && (
                <p className="text-sm text-muted-foreground mb-2 font-mono">@{profile.username}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                {profile.country && <span className="flex items-center gap-1.5"><MapPin className="size-3.5" />{profile.country}</span>}
                <span className="flex items-center gap-1.5"><Calendar className="size-3.5" />Member since {memberSince}</span>
                {profile.weekly_hours && <span className="flex items-center gap-1.5"><Clock className="size-3.5" />{profile.weekly_hours}h/week</span>}
              </div>
              {profile.bio && <p className="text-sm text-foreground leading-relaxed max-w-2xl">{profile.bio}</p>}
              <div className="flex flex-wrap gap-4 mt-4">
                {profile.linkedin_url && (
                  <a href={profile.linkedin_url} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                    <Linkedin className="size-4" /> LinkedIn
                  </a>
                )}
                {profile.github_url && (
                  <a href={profile.github_url} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Github className="size-4" /> GitHub
                  </a>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Globe className="size-4" /> Website <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Score card */}
            <div className="flex-shrink-0 text-center p-5 rounded-2xl bg-card border border-border shadow-lg min-w-[140px]">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Star className="size-4 text-amber-400" />
                <span className="font-display font-extrabold text-3xl gradient-text">{Math.round(profile.credibility_score)}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">Credibility Score</p>
              <div className="mt-3 space-y-1.5 text-xs text-left">
                <div className="flex justify-between text-muted-foreground">
                  <span>Projects</span><span className="font-semibold text-foreground">{projects.length}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Collabs</span><span className="font-semibold text-foreground">{collabCount}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Posts</span><span className="font-semibold text-foreground">{posts.length}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6">
          {/* Skills */}
          {profile.skills?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="p-5">
                <h2 className="font-display font-bold text-sm mb-4 flex items-center gap-2 text-foreground">
                  <TrendingUp className="size-4 text-primary" /> Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map(s => (
                    <span key={s} className="px-3 py-1.5 rounded-full text-sm font-medium bg-secondary/15 text-secondary border border-secondary/25">{s}</span>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Projects */}
          {profile.role === "founder" && projects.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="p-5">
                <h2 className="font-display font-bold text-sm mb-4 flex items-center gap-2 text-foreground">
                  <Zap className="size-4 text-primary" /> Active Projects
                </h2>
                <div className="space-y-3">
                  {projects.map(p => (
                    <div key={p.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {p.title.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-foreground">{p.title}</span>
                          <Badge variant="outline">{p.stage}</Badge>
                          <Badge>{p.industry}</Badge>
                          {p.ai_score && <span className="font-mono text-xs text-emerald-400 font-bold">AI: {p.ai_score}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{p.pitch}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Investment focus */}
          {profile.role === "investor" && profile.investment_focus?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="p-5">
                <h2 className="font-display font-bold text-sm mb-4 text-foreground">Investment Focus</h2>
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.investment_focus.map(f => (
                    <span key={f} className="px-3 py-1.5 rounded-full text-sm font-medium bg-teal-500/15 text-teal-400 border border-teal-500/25">{f}</span>
                  ))}
                </div>
                {profile.ticket_size && (
                  <p className="text-sm text-muted-foreground">
                    Typical ticket: <span className="font-semibold text-foreground">{profile.ticket_size}</span>
                  </p>
                )}
              </Card>
            </motion.div>
          )}

          {/* Certifications */}
          {certs.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="p-5">
                <h2 className="font-display font-bold text-sm mb-4 flex items-center gap-2 text-foreground">
                  <Award className="size-4 text-primary" /> Certifications
                </h2>
                <div className="space-y-3">
                  {certs.map(cert => (
                    <div key={cert.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                      <div className="size-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
                        <Award className="size-4 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{cert.name}</p>
                        <p className="text-xs text-muted-foreground">{cert.issuer} · {new Date(cert.issued_at).toLocaleDateString()}</p>
                      </div>
                      {cert.verified && <Badge variant="emerald">Verified</Badge>}
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Recent posts */}
          {posts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="p-5">
                <h2 className="font-display font-bold text-sm mb-4 text-foreground">Recent Posts</h2>
                <div className="space-y-4">
                  {posts.map(post => (
                    <div key={post.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                      <p className="text-sm text-foreground leading-relaxed line-clamp-3">{post.content}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="size-3" />{post.likes?.length ?? 0}
                        </span>
                        {post.collab_tag && <Badge variant="cyan">{post.collab_tag}</Badge>}
                        <span className="ml-auto">{timeAgo(post.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-5">
              <h2 className="font-display font-bold text-sm mb-4 text-foreground">Availability</h2>
              <div className="space-y-3 text-sm">
                {profile.weekly_hours && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Hours/week</span>
                    <span className="font-semibold text-foreground">{profile.weekly_hours}h</span>
                  </div>
                )}
                {profile.risk_tolerance && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Risk Tolerance</span>
                    <Badge variant={profile.risk_tolerance === "High" ? "rose" : profile.risk_tolerance === "Medium" ? "amber" : "teal"}>
                      {profile.risk_tolerance}
                    </Badge>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Role</span>
                  <RoleBadge role={profile.role} />
                </div>
              </div>
              <ProgressBar value={Math.round(profile.credibility_score)} label="Credibility Score" color="from-amber-500 to-yellow-500" className="mt-4" />
            </Card>
          </motion.div>

          {!isOwn && (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              <Card className="p-5 space-y-3">
                <h2 className="font-display font-bold text-sm text-foreground">Connect</h2>
                <Button variant="gradient" className="w-full" onClick={startConversation} loading={starting}>
                  <MessageCircle className="size-4" /> Send Message
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate("/matches")}>
                  <Zap className="size-4" /> Request Collaboration
                </Button>
              </Card>
            </motion.div>
          )}

          {isOwn && (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              <Card className="p-5 space-y-3">
                <h2 className="font-display font-bold text-sm text-foreground">Your Profile</h2>
                <p className="text-xs text-muted-foreground">This is how others see you on TechIT Network.</p>
                <Link to="/settings"><Button variant="gradient" className="w-full">Edit Profile</Button></Link>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

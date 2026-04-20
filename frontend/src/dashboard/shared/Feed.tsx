import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart, MessageCircle, Share2, Send, ChevronDown,
  Trash2, Bookmark, BookmarkCheck, TrendingUp,
  Zap, Search, X, Users, Globe, Bell,
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, Avatar, Badge, RoleBadge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { cn, timeAgo, formatNumber } from "../../lib/utils";

interface Author {
  user_id: string; first_name: string; last_name: string;
  username: string | null; role: string; country: string;
  credibility_score: number; avatar_url: string | null; is_verified: boolean;
}
interface Comment {
  id: string; author_id: string; content: string; created_at: string; author?: Author;
}
interface Post {
  id: string; author_id: string; content: string;
  media_urls: string[]; tags: string[]; likes: string[];
  views: number; collab_tag: string | null; created_at: string;
  author?: Author; comments?: Comment[];
}

const COMPOSE_TAGS = [
  { id: null,        label: "None"        },
  { id: "HIRING",    label: "Hiring"      },
  { id: "PAID",      label: "Paid Collab" },
  { id: "FREE",      label: "Free Collab" },
  { id: "INVESTING", label: "Investing"   },
];
const TAG_META: Record<string, { label: string; variant: "violet"|"cyan"|"teal"|"amber" }> = {
  HIRING:    { label: "Hiring",      variant: "violet" },
  PAID:      { label: "Paid Collab", variant: "cyan"   },
  FREE:      { label: "Free Collab", variant: "teal"   },
  INVESTING: { label: "Investing",   variant: "amber"  },
};
const FILTERS = ["All","HIRING","PAID","FREE","INVESTING","Connections"];

async function getProfiles(ids: string[]): Promise<Record<string, Author>> {
  if (!ids.length) return {};
  const { data } = await supabase.from("profiles")
    .select("user_id,first_name,last_name,username,role,country,credibility_score,avatar_url,is_verified")
    .in("user_id", ids);
  const m: Record<string, Author> = {};
  (data ?? []).forEach((p: Author) => { m[p.user_id] = p; });
  return m;
}

function PostCard({ post, myId, myProfile, onDelete, onLike, onSave, isSaved, navigate }:
  { post: Post; myId: string; myProfile: Author | null; onDelete:(id:string)=>void;
    onLike:(id:string,liked:boolean)=>void; onSave:(id:string,saved:boolean)=>void;
    isSaved:boolean; navigate:ReturnType<typeof useNavigate> }) {
  const [liked, setLiked]         = useState((post.likes??[]).includes(myId));
  const [likeCount, setLikeCount] = useState((post.likes??[]).length);
  const [saved, setSaved]         = useState(isSaved);
  const [expanded, setExpanded]   = useState(false);
  const [comments, setComments]   = useState<Comment[]>(post.comments??[]);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [showMenu, setShowMenu]       = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const author = post.author;
  const name = author ? `${author.first_name} ${author.last_name}` : "Member";
  const tag = post.collab_tag ? TAG_META[post.collab_tag] : null;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function toggleLike() {
    const nl = !liked; const nc = nl ? likeCount+1 : likeCount-1;
    setLiked(nl); setLikeCount(nc);
    const likes = (post.likes??[]);
    const updated = nl ? [...likes.filter(l=>l!==myId),myId] : likes.filter(l=>l!==myId);
    await supabase.from("posts").update({likes:updated}).eq("id",post.id);
    onLike(post.id, nl);
  }

  async function toggleSave() {
    const ns = !saved; setSaved(ns);
    if (ns) {
      await supabase.from("post_saves").insert({user_id:myId,post_id:post.id});
    } else {
      await supabase.from("post_saves").delete().eq("user_id",myId).eq("post_id",post.id);
    }
    onSave(post.id, ns);
  }

  async function submitComment() {
    if (!commentText.trim()) return;
    setSubmitting(true);
    const {data} = await supabase.from("comments")
      .insert({post_id:post.id,author_id:myId,content:commentText.trim()})
      .select("id,post_id,author_id,content,created_at").single();
    if (data) {
      const profiles = await getProfiles([myId]);
      setComments(prev => [...prev, {...data, author: profiles[myId]}]);
      setCommentText("");
    }
    setSubmitting(false);
  }

  async function deletePost() {
    setDeleting(true);
    await supabase.from("posts").delete().eq("id",post.id);
    onDelete(post.id);
  }

  async function handleShare() {
    const text = post.content.slice(0,150);
    if (navigator.share) {
      await navigator.share({title:"TechIT Network",text,url:window.location.origin+"/feed"});
    } else {
      await navigator.clipboard.writeText(window.location.origin+"/feed");
    }
  }

  const isLong = post.content.length > 280;
  const displayContent = isLong && !expanded ? post.content.slice(0,280)+"..." : post.content;

  return (
    <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} layout="position">
      <Card className="overflow-hidden hover:border-primary/15 transition-colors">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-3">
          <button onClick={()=>navigate(`/u/${author?.username??author?.user_id}`)}>
            <Avatar name={name} src={author?.avatar_url??undefined} size="md" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={()=>navigate(`/u/${author?.username??author?.user_id}`)}
                className="font-semibold text-sm text-foreground hover:text-primary transition-colors">
                {name}
              </button>
              {author?.role && <RoleBadge role={author.role} />}
              {tag && <Badge variant={tag.variant}>{tag.label}</Badge>}
              {author?.is_verified && <Badge variant="teal">Verified</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
              {author?.country && <span>{author.country}</span>}
              {typeof author?.credibility_score === "number" && (
                <><span>·</span><span>Score: {Math.round(author.credibility_score)}</span></>
              )}
              <span>·</span><span>{timeAgo(post.created_at)}</span>
              <span>·</span><Globe className="size-3" /><span>Public</span>
            </div>
          </div>
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button onClick={()=>setShowMenu(s=>!s)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 w-44 bg-card border border-border rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                <button onClick={toggleSave}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                  {saved ? <BookmarkCheck className="size-4 text-primary"/> : <Bookmark className="size-4"/>}
                  {saved ? "Unsave post" : "Save post"}
                </button>
                <button onClick={()=>{navigator.clipboard.writeText(window.location.origin+"/feed");setShowMenu(false);}}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                  <Share2 className="size-4"/> Copy link
                </button>
                {post.author_id===myId && (
                  <button onClick={deletePost} disabled={deleting}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="size-4"/> Delete post
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pb-3">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{displayContent}</p>
          {isLong && (
            <button onClick={()=>setExpanded(e=>!e)} className="text-xs text-primary mt-1 hover:underline">
              {expanded ? "See less" : "See more"}
            </button>
          )}
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {post.tags.map(t=>(
                <span key={t} className="text-xs text-primary font-mono hover:underline cursor-pointer">#{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Stats bar */}
        {(likeCount > 0 || comments.length > 0) && (
          <div className="flex items-center justify-between px-5 py-2 text-xs text-muted-foreground border-t border-border/50">
            {likeCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="size-4 rounded-full bg-primary flex items-center justify-center">
                  <Heart className="size-2.5 text-white fill-white" />
                </span>
                {formatNumber(likeCount)} {likeCount===1?"like":"likes"}
              </span>
            )}
            {comments.length > 0 && (
              <button onClick={()=>setExpanded(true)} className="hover:underline ml-auto">
                {comments.length} comment{comments.length!==1?"s":""}
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 px-3 py-2 border-t border-border/50">
          <button onClick={toggleLike}
            className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all",
              liked ? "text-primary bg-primary/8" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <Heart className={cn("size-4",liked&&"fill-primary")} />
            <span className="hidden sm:inline">{liked?"Liked":"Like"}</span>
          </button>
          <button onClick={()=>setExpanded(e=>!e)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
            <MessageCircle className="size-4" />
            <span className="hidden sm:inline">Comment</span>
          </button>
          <button onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
            <Share2 className="size-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button onClick={toggleSave}
            className={cn("flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-medium transition-all",
              saved ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
          </button>
        </div>

        {/* Comments */}
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
              className="overflow-hidden border-t border-border/50">
              <div className="px-5 py-3 space-y-3">
                {comments.map(c=>{
                  const cn2 = c.author ? `${c.author.first_name} ${c.author.last_name}` : "Member";
                  return (
                    <div key={c.id} className="flex gap-2.5">
                      <Avatar name={cn2} src={c.author?.avatar_url??undefined} size="xs" />
                      <div className="flex-1 bg-muted/40 rounded-2xl px-3 py-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-foreground">{cn2}</span>
                          <span className="text-[0.65rem] text-muted-foreground">{timeAgo(c.created_at)}</span>
                        </div>
                        <p className="text-xs text-foreground leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-2.5 pt-1">
                  <Avatar name={myProfile?`${myProfile.first_name} ${myProfile.last_name}`:"Me"} src={myProfile?.avatar_url??undefined} size="xs" />
                  <div className="flex-1 flex items-center gap-2 bg-muted/40 rounded-full px-3 py-1.5">
                    <input value={commentText} onChange={e=>setCommentText(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submitComment();}}}
                      placeholder="Write a comment..." maxLength={500}
                      className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground" />
                    <button onClick={submitComment} disabled={!commentText.trim()||submitting}
                      className="text-primary disabled:text-muted-foreground/40 transition-colors flex-shrink-0">
                      <Send className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

const LIMIT = 12;

export default function Feed() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [posts, setPosts]           = useState<Post[]>([]);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore]= useState(false);
  const [hasMore, setHasMore]       = useState(true);
  const [filter, setFilter]         = useState("All");
  const [composing, setComposing]   = useState(false);
  const [content, setContent]       = useState("");
  const [selTag, setSelTag]         = useState<string|null>(null);
  const [posting, setPosting]       = useState(false);
  const [savedIds, setSavedIds]     = useState<Set<string>>(new Set());
  const [connIds, setConnIds]       = useState<Set<string>>(new Set());
  const offsetRef = useRef(0);
  const searchQuery = searchParams.get("q") ?? "";

  useEffect(() => {
    offsetRef.current = 0; setHasMore(true); loadPosts(true);
  }, [filter, searchQuery]);

  useEffect(() => {
    loadSaved();
    loadConnectionIds();
  }, [profile?.user_id]);

  // Realtime new posts
  useEffect(() => {
    const ch = supabase.channel("feed-realtime")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"posts"},async payload=>{
        const p = payload.new as Post;
        if (p.author_id === profile?.user_id) return;
        const profiles = await getProfiles([p.author_id]);
        setPosts(prev=>{
          if (prev.find(x=>x.id===p.id)) return prev;
          return [{...p,author:profiles[p.author_id],comments:[]}, ...prev];
        });
      })
      .subscribe();
    return ()=>{supabase.removeChannel(ch);};
  }, [profile?.user_id]);

  async function loadSaved() {
    if (!profile?.user_id) return;
    const {data} = await supabase.from("post_saves").select("post_id").eq("user_id",profile.user_id);
    setSavedIds(new Set((data??[]).map((r:{post_id:string})=>r.post_id)));
  }

  async function loadConnectionIds() {
    if (!profile?.user_id) return;
    const [{data:sent},{data:recv}] = await Promise.all([
      supabase.from("connections").select("to_id").eq("from_id",profile.user_id).eq("status","accepted"),
      supabase.from("connections").select("from_id").eq("to_id",profile.user_id).eq("status","accepted"),
    ]);
    const ids = new Set<string>();
    (sent??[]).forEach((r:{to_id:string})=>ids.add(r.to_id));
    (recv??[]).forEach((r:{from_id:string})=>ids.add(r.from_id));
    setConnIds(ids);
  }

  async function loadPosts(reset=false) {
    if (reset) setLoading(true); else setLoadingMore(true);
    const cur = reset ? 0 : offsetRef.current;

    let q = supabase.from("posts")
      .select("id,author_id,content,media_urls,tags,likes,views,collab_tag,created_at")
      .order("created_at",{ascending:false})
      .range(cur, cur+LIMIT-1);

    if (searchQuery) q = q.ilike("content",`%${searchQuery}%`);
    else if (filter!=="All" && filter!=="Connections") q = q.eq("collab_tag",filter);
    else if (filter==="Connections" && connIds.size>0) {
      q = q.in("author_id",[...connIds]);
    }

    const {data} = await q;
    const rows = data ?? [];

    // Enrich with profiles
    const authorIds = [...new Set(rows.map((p:Post)=>p.author_id))];
    const profiles = await getProfiles(authorIds);

    // Load comments
    const withAll = await Promise.all(rows.map(async (post:Post)=>{
      const {data:cmts} = await supabase.from("comments")
        .select("id,post_id,author_id,content,created_at")
        .eq("post_id",post.id).order("created_at",{ascending:true}).limit(5);
      const cmtRows = cmts ?? [];
      const cIds = [...new Set(cmtRows.map((c:{author_id:string})=>c.author_id))];
      const cProfiles = await getProfiles(cIds);
      return {
        ...post,
        author: profiles[post.author_id],
        comments: cmtRows.map((c:Comment)=>({...c, author:cProfiles[c.author_id]})),
      };
    }));

    if (reset) setPosts(withAll); else setPosts(prev=>[...prev,...withAll]);
    setHasMore(rows.length===LIMIT);
    offsetRef.current = cur + rows.length;
    setLoading(false); setLoadingMore(false);
  }

  async function submitPost() {
    if (!content.trim() || !profile) return;
    setPosting(true);
    const tags = (content.match(/#\w+/g)??[]).map(t=>t.slice(1));
    const {data} = await supabase.from("posts")
      .insert({author_id:profile.user_id,content:content.trim(),collab_tag:selTag,tags,likes:[],views:0,media_urls:[]})
      .select("id,author_id,content,media_urls,tags,likes,views,collab_tag,created_at").single();
    if (data) {
      const newPost:Post = {
        ...data,
        author:{user_id:profile.user_id,first_name:profile.first_name,last_name:profile.last_name,
          username:profile.username??null,role:profile.role,country:profile.country,
          credibility_score:profile.credibility_score,avatar_url:profile.avatar_url??null,is_verified:profile.is_verified},
        comments:[],
      };
      setPosts(prev=>[newPost,...prev]);
      setContent(""); setSelTag(null); setComposing(false);
    }
    setPosting(false);
  }

  function onDelete(id:string){ setPosts(prev=>prev.filter(p=>p.id!==id)); }
  function onLike(id:string, liked:boolean){
    setPosts(prev=>prev.map(p=>p.id!==id?p:{...p,likes:liked?[...(p.likes??[]),profile!.user_id]:(p.likes??[]).filter(l=>l!==profile!.user_id)}));
  }
  function onSave(id:string, saved:boolean){
    setSavedIds(prev=>{const s=new Set(prev); saved?s.add(id):s.delete(id); return s;});
  }

  const myName = profile ? `${profile.first_name} ${profile.last_name}` : "You";
  const myAuthor: Author|null = profile ? {
    user_id:profile.user_id, first_name:profile.first_name, last_name:profile.last_name,
    username:profile.username??null, role:profile.role, country:profile.country,
    credibility_score:profile.credibility_score, avatar_url:profile.avatar_url??null, is_verified:profile.is_verified
  } : null;

  return (
    <DashboardLayout title={searchQuery ? `Search: "${searchQuery}"` : undefined}>
      <div className="max-w-2xl mx-auto space-y-4 page-enter">

        {/* Search result banner */}
        {searchQuery && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
            <Search className="size-4 text-primary flex-shrink-0" />
            <span className="text-sm text-foreground flex-1">
              Showing results for <span className="font-semibold">"{searchQuery}"</span>
            </span>
            <Link to="/feed" className="text-xs text-primary hover:underline flex items-center gap-1">
              <X className="size-3" /> Clear
            </Link>
          </div>
        )}

        {/* Compose box */}
        {!searchQuery && (
          <Card className="p-4">
            <div className="flex gap-3">
              <Avatar name={myName} src={profile?.avatar_url??undefined} size="md" />
              <div className="flex-1">
                {!composing ? (
                  <button onClick={()=>setComposing(true)}
                    className="w-full text-left px-4 py-3 rounded-2xl bg-muted/50 border border-border text-sm text-muted-foreground hover:bg-muted/80 hover:border-primary/30 transition-all">
                    What's on your mind, {profile?.first_name}?
                  </button>
                ) : (
                  <div className="space-y-3">
                    <textarea value={content} onChange={e=>setContent(e.target.value)}
                      placeholder={`What's on your mind, ${profile?.first_name}?`}
                      rows={4} autoFocus maxLength={3000}
                      className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground resize-none" />
                    <div className="flex flex-wrap gap-2 pb-3 border-b border-border">
                      {COMPOSE_TAGS.map(t=>(
                        <button key={String(t.id)} onClick={()=>setSelTag(selTag===t.id?null:t.id)}
                          className={cn("px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                            selTag===t.id?"bg-primary/20 text-primary border-primary/40":"border-border text-muted-foreground hover:border-primary/30")}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-mono">{content.length}/3000</span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={()=>{setComposing(false);setContent("");setSelTag(null);}}>Cancel</Button>
                        <Button variant="gradient" size="sm" onClick={submitPost} loading={posting} disabled={!content.trim()}>Post</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Filter tabs */}
        {!searchQuery && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {FILTERS.map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className={cn("px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all flex-shrink-0",
                  filter===f?"bg-primary text-white border-primary shadow-sm":"border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
                {f==="Connections"?<span className="flex items-center gap-1.5"><Users className="size-3"/>{f}</span>:f}
              </button>
            ))}
          </div>
        )}

        {/* Posts */}
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i=>(
              <Card key={i} className="p-5 animate-pulse space-y-3">
                <div className="flex gap-3"><div className="size-10 rounded-xl bg-muted"/><div className="flex-1 space-y-2"><div className="h-4 bg-muted rounded w-32"/><div className="h-3 bg-muted rounded w-24"/></div></div>
                <div className="space-y-2"><div className="h-3 bg-muted rounded"/><div className="h-3 bg-muted rounded w-3/4"/></div>
              </Card>
            ))}
          </div>
        ) : posts.length===0 ? (
          <Card className="p-12 text-center">
            <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="size-7 text-muted-foreground/40" />
            </div>
            <p className="font-display font-bold text-lg mb-1 text-foreground">
              {searchQuery ? `No posts matching "${searchQuery}"` : filter==="Connections" ? "No posts from connections yet" : "The feed is quiet"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? "Try different keywords." : filter==="Connections" ? "Connect with people to see their posts here." : "Be the first to post something!"}
            </p>
            {!searchQuery && filter==="Connections" && (
              <Link to="/people"><Button variant="gradient" size="sm"><Users className="size-4"/> Find People</Button></Link>
            )}
            {!searchQuery && filter==="All" && (
              <Button variant="gradient" size="sm" onClick={()=>setComposing(true)}>Create First Post</Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map(post=>(
              <PostCard key={post.id} post={post} myId={profile?.user_id??""} myProfile={myAuthor}
                onDelete={onDelete} onLike={onLike} onSave={onSave}
                isSaved={savedIds.has(post.id)} navigate={navigate} />
            ))}
          </div>
        )}

        {hasMore && posts.length>0 && (
          <Button variant="outline" className="w-full" onClick={()=>loadPosts(false)} loading={loadingMore}>
            <ChevronDown className="size-4"/> Load more posts
          </Button>
        )}
      </div>
    </DashboardLayout>
  );
}

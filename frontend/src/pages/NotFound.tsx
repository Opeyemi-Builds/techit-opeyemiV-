import { useNavigate } from "react-router-dom";
import { AlertCircle, Home, ArrowLeft, Zap } from "lucide-react";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="orb orb-violet w-96 h-96 -top-20 -left-20 opacity-30" />
      <div className="orb orb-cyan w-80 h-80 bottom-0 right-0 opacity-20" />
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg gap-6">
        <div className="size-20 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertCircle className="size-10 text-destructive" />
        </div>
        <div>
          <h1 className="font-display font-extrabold text-8xl gradient-text leading-none mb-2">404</h1>
          <h2 className="font-display font-bold text-2xl mb-3">Page Not Found</h2>
          <p className="text-muted-foreground text-base leading-relaxed">Oops! We couldn't find what you're looking for. The page you're trying to access doesn't exist or has been moved.</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Go Back</Button>
          <Button variant="gradient" onClick={() => navigate("/")}><Home className="size-4" /> Back to Home</Button>
        </div>
        <div className="pt-4 border-t border-border w-full">
          <p className="text-xs text-muted-foreground mb-3">Helpful links:</p>
          <div className="flex gap-3 justify-center flex-wrap">
            {[{label:"Landing", href:"/"},{label:"Sign In",href:"/login"},{label:"Dashboard",href:"/dashboard"}].map(l => (
              <Link key={l.href} to={l.href} className="text-xs px-4 py-2 rounded-lg border border-border bg-card hover:border-primary/40 hover:text-primary transition-all text-muted-foreground">{l.label}</Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Zap className="size-3 text-primary" /> TechIT Network
        </div>
      </div>
    </div>
  );
}

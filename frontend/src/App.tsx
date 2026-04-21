import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { ThemeToggle } from "./components/ThemeToggle";

// Public
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import NotFound from "./pages/NotFound";
import UserProfile from "./pages/UserProfile";

// Onboarding
import FounderSetup from "./dashboard/founders/Setup";
import FounderSummary from "./dashboard/founders/Summary";
import CollaboratorSetup from "./dashboard/collaborators/Setup";
import CollaboratorSummary from "./dashboard/collaborators/Summary";
import InvestorSetup from "./dashboard/investors/Setup";
import OrgSetup from "./dashboard/organisations/Setup";

// Founder
import FounderDashboard from "./dashboard/founders/Dashboard";
import IdeaSubmit from "./dashboard/founders/IdeaSubmit";
import AIEvaluation from "./dashboard/founders/AIEvaluation";
import MatchResults from "./dashboard/founders/MatchResults";
import IncubationHub from "./dashboard/founders/IncubationHub";

// Collaborator
import CollaboratorDashboard from "./dashboard/collaborators/Dashboard";
import Opportunities from "./dashboard/collaborators/Opportunities";
import MyWork from "./dashboard/collaborators/MyWork";
import Performance from "./dashboard/collaborators/Performance";
import Earnings from "./dashboard/collaborators/Earnings";

// Investor
import InvestorDashboard from "./dashboard/investors/Dashboard";
import Pipeline from "./dashboard/investors/Pipeline";
import Portfolio from "./dashboard/investors/Portfolio";

// Organisation
import OrgDashboard from "./dashboard/organisations/Dashboard";
import Challenges from "./dashboard/organisations/Challenges";
import TalentSearch from "./dashboard/organisations/TalentSearch";

// Shared
import Feed from "./dashboard/shared/Feed";
import Messages from "./dashboard/shared/Messages";
import Notifications from "./dashboard/shared/Notifications";
import Settings from "./dashboard/shared/Settings";
import Wallet from "./dashboard/shared/Wallet";
import Workspace from "./dashboard/shared/Workspace";
import People from "./dashboard/shared/People";
import Projects from "./dashboard/shared/Projects";

//Private to User
import PaymentMethod from "./pages/paymentMethod";

const ROLE_ROUTES: Record<string, string> = {
  founder: "/dashboard",
  collaborator: "/collaborator/dashboard",
  investor: "/investor/dashboard",
  organisation: "/org/dashboard",
};
const ROLE_SETUP: Record<string, string> = {
  founder: "/founder/setup",
  collaborator: "/collaborator/setup",
  investor: "/investor/setup",
  organisation: "/org/setup",
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function SmartRedirect() {
  const { profile, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!profile) return <Navigate to="/login" replace />;
  if (!profile.is_onboarded) return <Navigate to={ROLE_SETUP[profile.role] ?? "/founder/setup"} replace />;
  return <Navigate to={ROLE_ROUTES[profile.role] ?? "/dashboard"} replace />;
}

export default function App() {
  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/u/:username" element={<UserProfile />} />
        <Route path="/home" element={<ProtectedRoute><SmartRedirect /></ProtectedRoute>} />

        {/* Onboarding */}
        <Route path="/founder/setup"        element={<ProtectedRoute><FounderSetup /></ProtectedRoute>} />
        <Route path="/founder/summary"      element={<ProtectedRoute><FounderSummary /></ProtectedRoute>} />
        <Route path="/collaborator/setup"   element={<ProtectedRoute><CollaboratorSetup /></ProtectedRoute>} />
        <Route path="/collaborator/summary" element={<ProtectedRoute><CollaboratorSummary /></ProtectedRoute>} />
        <Route path="/investor/setup"       element={<ProtectedRoute><InvestorSetup /></ProtectedRoute>} />
        <Route path="/org/setup"            element={<ProtectedRoute><OrgSetup /></ProtectedRoute>} />

        {/* Founder */}
        <Route path="/dashboard"       element={<ProtectedRoute><FounderDashboard /></ProtectedRoute>} />
        <Route path="/idea-submit"     element={<ProtectedRoute><IdeaSubmit /></ProtectedRoute>} />
        <Route path="/idea-eval"       element={<ProtectedRoute><AIEvaluation /></ProtectedRoute>} />
        <Route path="/matches"         element={<ProtectedRoute><MatchResults /></ProtectedRoute>} />
        <Route path="/incubation-hub"  element={<ProtectedRoute><IncubationHub /></ProtectedRoute>} />

        {/* Collaborator */}
        <Route path="/collaborator/dashboard"     element={<ProtectedRoute><CollaboratorDashboard /></ProtectedRoute>} />
        <Route path="/collaborator/opportunities" element={<ProtectedRoute><Opportunities /></ProtectedRoute>} />
        <Route path="/collaborator/work"          element={<ProtectedRoute><MyWork /></ProtectedRoute>} />
        <Route path="/collaborator/performance"   element={<ProtectedRoute><Performance /></ProtectedRoute>} />
        <Route path="/collaborator/earnings"      element={<ProtectedRoute><Earnings /></ProtectedRoute>} />

        {/* Investor */}
        <Route path="/investor/dashboard" element={<ProtectedRoute><InvestorDashboard /></ProtectedRoute>} />
        <Route path="/investor/pipeline"  element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
        <Route path="/investor/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />

        {/* Organisation */}
        <Route path="/org/dashboard"  element={<ProtectedRoute><OrgDashboard /></ProtectedRoute>} />
        <Route path="/org/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
        <Route path="/org/talent"     element={<ProtectedRoute><TalentSearch /></ProtectedRoute>} />

        {/* Shared */}
        <Route path="/feed"                element={<ProtectedRoute><Feed /></ProtectedRoute>} />
        <Route path="/messages"            element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/notifications"       element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/settings"            element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/wallet"              element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
        <Route path="/workspace/:projectId" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
        <Route path="/people"              element={<ProtectedRoute><People /></ProtectedRoute>} />
        <Route path="/projects"            element={<ProtectedRoute><Projects /></ProtectedRoute>} />

        {/* Payment */}
        <Route path="/payment-method" element={<PaymentMethod />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <ThemeToggle />
    </>
  );
}

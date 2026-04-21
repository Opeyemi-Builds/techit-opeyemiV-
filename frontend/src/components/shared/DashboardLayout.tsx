import { cn } from "../../lib/utils";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function DashboardLayout({
  children, title, action, className, noPadding
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen w-full flex bg-background text-foreground">
      {/* Sidebar — hidden on mobile, shown on lg+ */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content area — offset by sidebar width */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64 transition-all duration-300">
        <TopBar title={title} action={action} />
        <main className={cn(
          "flex-1",
          !noPadding && "px-4 lg:px-6 py-5",
          className
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}

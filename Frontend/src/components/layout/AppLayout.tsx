import { Outlet, Navigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { SidebarContent } from "./AppSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden w-full">
      {/* Desktop Sidebar - Hidden on Mobile */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden w-full transition-all duration-300">

        {/* Mobile Header - Visible only on mobile */}
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-white flex-shrink-0 z-10">
          <div className="flex items-center gap-2">
            <img src="/cardiot.webp" alt="Logo" className="w-8 h-8 object-contain" />
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800 text-sm leading-tight">Cardiot CRM</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">DASHBOARD</span>
            </div>
          </div>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="p-2 -mr-2 rounded-md hover:bg-slate-100 text-slate-500">
                <Menu className="w-6 h-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SidebarContent collapsed={false} isMobile={true} />
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content Scroll Area */}
        <main className="flex-1 overflow-auto p-4 md:p-6 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

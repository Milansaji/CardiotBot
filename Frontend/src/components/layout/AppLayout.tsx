import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Bell, Search, MessageSquare } from "lucide-react";

export function AppLayout() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

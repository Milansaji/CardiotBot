import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Contact,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: MessageSquare, label: "Conversations", path: "/conversations" },
  { icon: Contact, label: "Contacts", path: "/contacts" },
  { icon: Users, label: "Segments", path: "/segments" },
];

const activeAgents = [
  { name: "Sarah K.", avatar: "SK", online: true },
  { name: "Mike R.", avatar: "MR", online: true },
  { name: "Anna L.", avatar: "AL", online: true },
  { name: "James P.", avatar: "JP", online: false },
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`relative h-full bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-20 ${collapsed ? "w-16" : "w-64"
        }`}
    >
      {/* Header / Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img
              src="/cardiot.webp"
              alt="Logo"
              className="w-8 h-8 object-contain"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800 text-sm leading-tight">Cardiot CRM</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">DASHBOARD</span>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 group relative ${isActive
                ? "bg-slate-100 text-blue-600 font-medium"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
            >
              <item.icon
                className={`w-4 h-4 transition-colors ${isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                  }`}
              />
              {!collapsed && <span>{item.label}</span>}
              {isActive && !collapsed && (
                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-blue-600" />
              )}
            </Link>
          );
        })}
      </nav>


      {/* User Profile / Logout */}
      <div className="p-3 border-t border-slate-100">
        <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors ${collapsed ? 'justify-center' : ''}`}>
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}

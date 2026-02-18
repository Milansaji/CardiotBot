import { useDashboardStats } from "../hooks/useWhatsApp";
import { TrendingUp, Users, MessageSquare, Mail, TrendingDown, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const Dashboard = () => {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Prepare data for Status pie chart
  const statusData = [
    { name: "Ongoing", value: stats?.statusBreakdown.ongoing || 0, color: "#3b82f6" }, // Blue-500
    { name: "Converted", value: stats?.statusBreakdown.converted || 0, color: "#22c55e" }, // Green-500
    { name: "Rejected", value: stats?.statusBreakdown.rejected || 0, color: "#ef4444" }, // Red-500
    { name: "Human Takeover", value: stats?.statusBreakdown.human_takeover || 0, color: "#a855f7" }, // Purple-500
  ].filter(item => item.value > 0);

  // Prepare data for Temperature pie chart
  const temperatureData = [
    { name: "Hot", value: stats?.temperatureBreakdown.hot || 0, color: "#f97316" }, // Orange-500
    { name: "Warm", value: stats?.temperatureBreakdown.warm || 0, color: "#eab308" }, // Yellow-500
    { name: "Cold", value: stats?.temperatureBreakdown.cold || 0, color: "#06b6d4" }, // Cyan-500
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-end justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time overview of your WhatsApp metrics</p>
        </div>
        <div className="text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Contacts"
          value={stats?.totalContacts || 0}
          icon={<Users className="w-4 h-4 text-blue-600" />}
          trend="+12%"
          trendUp={true}
          color="bg-blue-50 border-blue-100 text-blue-700"
        />
        <StatCard
          label="Total Messages"
          value={stats?.totalMessages || 0}
          icon={<MessageSquare className="w-4 h-4 text-violet-600" />}
          trend="+23%"
          trendUp={true}
          color="bg-violet-50 border-violet-100 text-violet-700"
        />
        <StatCard
          label="Unread Messages"
          value={stats?.unreadMessages || 0}
          icon={<Mail className="w-4 h-4 text-amber-600" />}
          trend="-5%"
          trendUp={false}
          color="bg-amber-50 border-amber-100 text-amber-700"
        />
        <StatCard
          label="Conversions"
          value={stats?.statusBreakdown.converted || 0}
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          trend="+18%"
          trendUp={true}
          color="bg-emerald-50 border-emerald-100 text-emerald-700"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="frappe-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-slate-800">Status Breakdown</h2>
            <button className="text-xs text-slate-400 hover:text-slate-600">View Details</button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-8">
            <div className="relative w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      color: '#0f172a',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    itemStyle={{ color: '#0f172a' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-2xl font-bold text-slate-800">{stats?.totalContacts || 0}</span>
                <span className="text-xs text-slate-400 font-medium">Total</span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-3">
              {statusData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm group cursor-pointer hover:bg-slate-50 p-2 rounded-md transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-800">{item.value}</span>
                    <span className="text-xs text-slate-400 w-8 text-right">
                      {Math.round((item.value / (stats?.totalContacts || 1)) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Temperature Breakdown */}
        <div className="frappe-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-slate-800">Lead Quality</h2>
            <button className="text-xs text-slate-400 hover:text-slate-600">View Details</button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-8">
            <div className="relative w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={temperatureData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {temperatureData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      color: '#0f172a',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    itemStyle={{ color: '#0f172a' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-2xl font-bold text-slate-800">{stats?.totalContacts || 0}</span>
                <span className="text-xs text-slate-400 font-medium">Leads</span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-3">
              {temperatureData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm group cursor-pointer hover:bg-slate-50 p-2 rounded-md transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-800">{item.value}</span>
                    <span className="text-xs text-slate-400 w-8 text-right">
                      {Math.round((item.value / (stats?.totalContacts || 1)) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Insights Row - Replaced with Frappe "Shortcuts" style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard
          label="Conversion Rate"
          value={`${Math.round(((stats?.statusBreakdown.converted || 0) / (stats?.totalContacts || 1)) * 100)}%`}
          description="Contacts converted to customers"
          color="bg-emerald-50 border-emerald-100"
          valueColor="text-emerald-700"
        />
        <InsightCard
          label="Hot Leads"
          value={`${stats?.temperatureBreakdown.hot || 0}`}
          description="High-priority contacts"
          color="bg-orange-50 border-orange-100"
          valueColor="text-orange-700"
        />
        <InsightCard
          label="Active Status"
          value={`${stats?.statusBreakdown.ongoing || 0}`}
          description="Ongoing conversations"
          color="bg-blue-50 border-blue-100"
          valueColor="text-blue-700"
        />
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, trend, trendUp, color }: any) => (
  <div className="frappe-card hover:border-blue-300 transition-colors duration-200">
    <div className="flex items-start justify-between mb-4">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value.toLocaleString()}</h3>
      </div>
      <div className={`p-2 rounded-md ${color}`}>
        {icon}
      </div>
    </div>
    <div className="flex items-center gap-1.5 text-xs font-medium">
      <span className={`flex items-center gap-0.5 ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
        {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {trend}
      </span>
      <span className="text-slate-400">vs last month</span>
    </div>
  </div>
);

const InsightCard = ({ label, value, description, color, valueColor }: any) => (
  <div className={`frappe-card border-l-4 ${color}`}>
    <div className="flex flex-col h-full justify-center">
      <span className={`text-3xl font-bold mb-1 ${valueColor}`}>{value}</span>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="text-xs text-slate-500 mt-1">{description}</span>
    </div>
  </div>
);

export default Dashboard;

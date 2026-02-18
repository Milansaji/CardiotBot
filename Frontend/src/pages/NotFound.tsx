import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { FileQuestion, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 text-center max-w-md w-full animate-fade-in">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-200">
          <FileQuestion className="w-10 h-10 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Page Not Found</h1>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          The page <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono text-xs border border-slate-200 mx-1">{location.pathname}</code> does not exist or has been moved.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm w-full justify-center text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Desk
        </a>
      </div>
    </div>
  );
};

export default NotFound;

import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, Clock, LogOut, Loader2, Menu, Home as HomeIcon } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { startLogin } from "@/const";

const MENU_ITEMS = [
  { icon: HomeIcon, label: "Home", path: "/" },
  { icon: Search, label: "Search", path: "/search" },
  { icon: Clock, label: "History", path: "/history" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout, isLogoutPending, loading } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      {/* Floating Island Navigation Bar */}
      <div className="sticky top-4 z-50 px-4 w-full flex justify-center">
        <header className="w-full max-w-3xl border border-white/50 bg-white/70 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-full px-4 sm:px-6 py-2 transition-all duration-300 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] hover:bg-white/80">
          <div className="flex h-12 items-center justify-between">
            <div className="flex items-center gap-8">
              {/* Logo */}
              <a href="/" className="flex items-center gap-3 cursor-pointer transition-transform hover:scale-105">

                <span className="font-extrabold text-lg hidden sm:inline-block tracking-tight">
                  <span className="text-slate-900">Leads </span>
                  <span className="text-indigo-600">Scraper</span>
                </span>
              </a>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-1">
                {MENU_ITEMS.map((item) => {
                  const isActive = location === item.path || (location.startsWith("/results") && item.path === "/history");
                  return (
                    <button
                      key={item.path}
                      onClick={() => setLocation(item.path)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${isActive
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-105"
                          : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                        }`}
                    >
                      <item.icon className={`w-4 h-4 ${isActive ? "text-white" : ""}`} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 focus:outline-none rounded-full p-0.5 hover:ring-2 hover:ring-indigo-100 transition-all">
                      <Avatar className="h-9 w-9 border border-gray-200 shadow-sm bg-indigo-50">
                        <AvatarFallback className="text-xs font-semibold text-indigo-700 bg-transparent">
                          {user?.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 mt-2 rounded-xl" align="end">
                    <DropdownMenuLabel className="font-normal px-3 py-2">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold leading-none text-gray-900">
                          {user?.name}
                        </p>
                        <p className="text-xs leading-none text-gray-500 font-medium">
                          {user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-100" />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer font-medium py-2.5 rounded-lg"
                      onClick={() => logout()}
                      disabled={isLogoutPending}
                    >
                      {isLogoutPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4 mr-2" />
                      )}
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => startLogin()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full px-6 shadow-md">Sign In</Button>
              )}

              {/* Mobile Menu */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle className="text-left">Navigation</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-2 mt-6">
                    {MENU_ITEMS.map((item) => {
                      const isActive = location === item.path || (location.startsWith("/results") && item.path === "/history");
                      return (
                        <button
                          key={item.path}
                          onClick={() => setLocation(item.path)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                            }`}
                        >
                          <item.icon className={`w-5 h-5 ${isActive ? "text-indigo-600" : ""}`} />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto pt-6 pb-12 px-4 md:px-8">
        {children}
      </main>

      {/* Detailed Footer */}
      <footer className="w-full border-t border-gray-200/50 bg-[#F8F9FF]/80 backdrop-blur-3xl mt-auto relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
        
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-16 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-16">
            
            {/* Brand Column */}
            <div className="lg:col-span-2 flex flex-col items-start">
              <a href="/" className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center shadow-[0_8px_16px_-6px_rgba(0,0,0,0.3)]">
                  <Search className="w-5 h-5 text-white stroke-[1.5]" />
                </div>
                <span className="font-bold text-slate-900 text-xl tracking-tight">Leads Scraper</span>
              </a>
              <p className="text-slate-500 font-light leading-relaxed mb-8 max-w-sm">
                The ultimate AI-powered business directory. Harvest real business data from premium sources simultaneously with pin-point accuracy.
              </p>
              {/* Social Icons (using standard Lucide icons as placeholders for social) */}
              <div className="flex items-center gap-4">
                <a href="#" className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm transition-all">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm transition-all">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/></svg>
                </a>
              </div>
            </div>

            {/* Links Columns */}
            <div>
              <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-wider text-sm">Product</h4>
              <ul className="flex flex-col gap-4">
                <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-light transition-colors">Features</a></li>
                <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-light transition-colors">Pricing</a></li>
                <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-light transition-colors">Use Cases</a></li>
                <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-light transition-colors">Enterprise</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-wider text-sm">Resources</h4>
              <ul className="flex flex-col gap-4">
                <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-light transition-colors">Documentation</a></li>
                <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-light transition-colors">API Reference</a></li>
                <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-light transition-colors">Blog</a></li>
                <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-light transition-colors">Help Center</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-wider text-sm">Company</h4>
              <ul className="flex flex-col gap-4">
                <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-light transition-colors">About Us</a></li>
                <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-light transition-colors">Careers</a></li>
                <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-light transition-colors">Contact</a></li>
                <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-light transition-colors">Partners</a></li>
              </ul>
            </div>

          </div>
          
          <div className="pt-8 border-t border-gray-200/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-400 font-light">
              &copy; {new Date().getFullYear()} Leads Scraper Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-slate-400 font-light">
              <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Cookie Settings</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

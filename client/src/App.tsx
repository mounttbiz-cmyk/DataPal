import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import BackgroundPattern from "./components/BackgroundPattern";
import DashboardLayout from "./components/DashboardLayout";
import SearchPage from "./pages/SearchPage";
import HistoryPage from "./pages/HistoryPage";
import ResultsPage from "./pages/ResultsPage";
import Home from "./pages/Home";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";

function ProtectedRoute({ component: Component, params }: { component: any, params?: any }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) {
    startLogin();
    return null;
  }
  return <Component params={params} />;
}

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/search">{() => <ProtectedRoute component={SearchPage} />}</Route>
        <Route path="/history">{() => <ProtectedRoute component={HistoryPage} />}</Route>
        <Route path="/results/:searchId">{(params) => <ProtectedRoute component={ResultsPage} params={params} />}</Route>
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <BackgroundPattern />
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

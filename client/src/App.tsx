import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Layout/Sidebar';
import TitleBar from './components/Layout/TitleBar';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Sales from './pages/Sales';
import SupplierPayments from './pages/SupplierPayments';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';

const TITLE_BAR_HEIGHT = 34;

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #faf8f5 0%, #f5f0e8 50%, #ece4d9 100%)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full animate-spin"
            style={{
              border: '3px solid rgba(218, 165, 32, 0.2)',
              borderTopColor: '#DAA520'
            }}
          />
          <p className="font-medium" style={{ color: '#8D6E63' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const { user } = useAuth();
  const isElectron = useMemo(() => typeof window !== 'undefined' && Boolean((window as any).electronAPI), []);
  const topOffset = isElectron ? TITLE_BAR_HEIGHT : 0;
  const contentPadding = 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div
                  className="flex h-screen overflow-hidden font-sans"
                  style={{ background: 'linear-gradient(135deg, #faf8f5 0%, #f5f0e8 50%, #ece4d9 100%)' }}
                >
                  <Sidebar />
                  <main
                    className="flex-1 overflow-y-auto overflow-x-hidden"
                    style={{
                      marginTop: topOffset,
                      padding: `${contentPadding}px`,
                      height: `calc(100vh - ${topOffset}px)`
                    }}
                  >
                    <div
                      className="h-full overflow-hidden"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.86) 0%, rgba(255, 255, 255, 0.78) 100%)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(218, 165, 32, 0.12)',
                        boxShadow: '0 16px 48px -20px rgba(62, 39, 35, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.45)',
                        borderRadius: 0
                      }}
                    >
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/expenses" element={<Expenses />} />
                        <Route path="/sales" element={<Sales />} />
                        <Route path="/supplier-payments" element={<SupplierPayments />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/settings" element={<Settings />} />
                      </Routes>
                    </div>
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <TitleBar />
      <AppRoutes />
    </Router>
  );
}

export default App;

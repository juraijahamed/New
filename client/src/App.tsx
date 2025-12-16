import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Sidebar from './components/Layout/Sidebar';
import ClockNotch from './components/UI/ClockNotch';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Sales from './pages/Sales';
import SupplierPayments from './pages/SupplierPayments';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';

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

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DataProvider>
              <div
                className="flex h-screen overflow-hidden font-sans"
                style={{ background: 'linear-gradient(135deg, #faf8f5 0%, #f5f0e8 50%, #ece4d9 100%)' }}
              >
                {/* Clock Notch */}
                <ClockNotch />

                <Sidebar />
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 pt-12">
                  <div
                    className="h-full rounded-3xl overflow-hidden"
                    style={{
                      background: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(218, 165, 32, 0.1)',
                      boxShadow: 'inset 0 2px 10px rgba(218, 165, 32, 0.05)'
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
            </DataProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;

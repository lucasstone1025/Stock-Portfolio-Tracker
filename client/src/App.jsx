import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Watchlist from './pages/Watchlist';
import Alerts from './pages/Alerts';
import StockDetails from './pages/StockDetails';
import Search from './pages/Search';
import FindStocks from './pages/FindStocks';
import FAQ from './pages/FAQ';
import Settings from './pages/Settings';
import Budget from './pages/Budget';
import BudgetPlanner from './pages/BudgetPlanner';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import Navbar from './components/Navbar';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/landing" />;
};

// Redirect logged-in users away from landing/login to dashboard
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? <Navigate to="/dashboard" /> : children;
};

const Layout = ({ children }) => {
  const { user } = useAuth();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {user && <Navbar />}
      <main style={{ flex: 1, padding: '2rem 0' }}>
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes - no layout wrapper, redirect to dashboard if logged in */}
          <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/landing" element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/about" element={<Landing />} />

          {/* All other routes with Layout */}
          <Route path="*" element={
            <Layout>
              <Routes>
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/watchlist" element={<PrivateRoute><Watchlist /></PrivateRoute>} />
                <Route path="/alerts" element={<PrivateRoute><Alerts /></PrivateRoute>} />
                <Route path="/search" element={<PrivateRoute><Search /></PrivateRoute>} />
                <Route path="/find-stocks" element={<PrivateRoute><FindStocks /></PrivateRoute>} />
                <Route path="/faq" element={<PrivateRoute><FAQ /></PrivateRoute>} />
                <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
                <Route path="/budget" element={<PrivateRoute><Budget /></PrivateRoute>} />
                <Route path="/budget/planner" element={<PrivateRoute><BudgetPlanner /></PrivateRoute>} />
                <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
                <Route path="/categories" element={<PrivateRoute><Categories /></PrivateRoute>} />
                <Route path="/stock/:symbol" element={<PrivateRoute><StockDetails /></PrivateRoute>} />
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

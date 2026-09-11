import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Transfer from './components/Transfer';
import Bills from './components/Bills';
import Deposit from './components/Deposit';
import Statement from './components/Statement';
import History from './components/History';
import Cards from './components/Cards';
import DirectDeposit from './components/DirectDeposit';
import Security from './components/Security';
import Admin from './components/Admin';

const Protected = ({ children, adminOnly }) => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" />;
  if (adminOnly && !user?.isAdmin) return <Navigate to="/dashboard" />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Protected><Layout /></Protected>}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard"       element={<Dashboard />} />
            <Route path="transfer"        element={<Transfer />} />
            <Route path="bills"           element={<Bills />} />
            <Route path="deposit"         element={<Deposit />} />
            <Route path="statement"       element={<Statement />} />
            <Route path="history"         element={<History />} />
            <Route path="cards"           element={<Cards />} />
            <Route path="direct-deposit"  element={<DirectDeposit />} />
            <Route path="security"        element={<Security />} />
            <Route path="admin"           element={<Protected adminOnly><Admin /></Protected>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import Activate from './components/Activate';
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
import Settings from './components/Settings';
import HelpCenter from './components/HelpCenter';
import PayrollLayout from './components/PayrollLayout';
import PayrollDashboard from './components/PayrollDashboard';
import PayrollWorkers from './components/PayrollWorkers';
import PayrollPay from './components/PayrollPay';
import PayrollBatch from './components/PayrollBatch';
import PayrollHistory from './components/PayrollHistory';
import PayrollReports from './components/PayrollReports';
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
          <Route path="/activate" element={<Activate />} />
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
            <Route path="settings"        element={<Settings />} />
            <Route path="help"            element={<HelpCenter />} />
            {/* Payroll — separate console */}
            <Route path="payroll" element={<PayrollLayout />}>
              <Route index element={<PayrollDashboard />} />
              <Route path="dashboard" element={<PayrollDashboard />} />
              <Route path="workers"   element={<PayrollWorkers />} />
              <Route path="pay"       element={<PayrollPay />} />
              <Route path="batch"     element={<PayrollBatch />} />
              <Route path="history"   element={<PayrollHistory />} />
              <Route path="reports"   element={<PayrollReports />} />
            </Route>
            <Route path="admin"           element={<Protected adminOnly><Admin /></Protected>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

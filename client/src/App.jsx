import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Tables from './pages/Tables';
import POS from './pages/POS';
import Kitchen from './pages/Kitchen';
import Cash from './pages/Cash';
import Inventory from './pages/Inventory';
import Recipes from './pages/Recipes';
import MenuPage from './pages/Menu';
import Customers from './pages/Customers';
import Staff from './pages/Staff';
import { useAuth } from './context/AuthContext';

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <Private>
            <Layout />
          </Private>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tables" element={<Tables />} />
        <Route path="pos" element={<POS />} />
        <Route path="kitchen" element={<Kitchen />} />
        <Route path="cash" element={<Cash />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="recipes" element={<Recipes />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="customers" element={<Customers />} />
        <Route path="staff" element={<Staff />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Vendors from './pages/Vendors';
import Customers from './pages/Customers';
import Purchases from './pages/Purchases';
import Production from './pages/Production';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Users from './pages/Users';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            background: '#1e293b',
                            color: '#e2e8f0',
                            border: '1px solid #334155',
                            borderRadius: '12px',
                        },
                        success: { iconTheme: { primary: '#10b981', secondary: '#1e293b' } },
                        error: { iconTheme: { primary: '#ef4444', secondary: '#1e293b' } },
                    }}
                />
                <Routes>
                    {/* Public */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />

                    {/* Protected - all authenticated users */}
                    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/reports" element={<Reports />} />

                        {/* Admin + Production Manager */}
                        <Route path="/products" element={
                            <ProtectedRoute roles={['admin', 'production_manager']}>
                                <Products />
                            </ProtectedRoute>
                        } />

                        {/* Admin + Store Manager + Production Manager */}
                        <Route path="/inventory" element={
                            <ProtectedRoute roles={['admin', 'store_manager', 'production_manager']}>
                                <Inventory />
                            </ProtectedRoute>
                        } />

                        {/* Admin + Store Manager */}
                        <Route path="/vendors" element={
                            <ProtectedRoute roles={['admin', 'store_manager']}>
                                <Vendors />
                            </ProtectedRoute>
                        } />

                        <Route path="/purchases" element={
                            <ProtectedRoute roles={['admin', 'store_manager']}>
                                <Purchases />
                            </ProtectedRoute>
                        } />

                        {/* Admin + Production Manager */}
                        <Route path="/production" element={
                            <ProtectedRoute roles={['admin', 'production_manager']}>
                                <Production />
                            </ProtectedRoute>
                        } />

                        {/* Admin + Sales Manager */}
                        <Route path="/customers" element={
                            <ProtectedRoute roles={['admin', 'sales_manager']}>
                                <Customers />
                            </ProtectedRoute>
                        } />

                        <Route path="/sales" element={
                            <ProtectedRoute roles={['admin', 'sales_manager']}>
                                <Sales />
                            </ProtectedRoute>
                        } />

                        {/* Admin only */}
                        <Route path="/users" element={
                            <ProtectedRoute roles={['admin']}>
                                <Users />
                            </ProtectedRoute>
                        } />
                    </Route>

                    {/* Catch all */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;

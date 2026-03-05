import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Protects any route that requires authentication
const ProtectedRoute = ({ children, roles }) => {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }
    return children;
};

export default ProtectedRoute;

import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, requiredRole }) {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!token || !user) {
        return <Navigate to="/login" />;
    }

    if (requiredRole && user.role !== requiredRole) {
        return <Navigate to="/login" />;
    }

    return children;
}

export default ProtectedRoute;
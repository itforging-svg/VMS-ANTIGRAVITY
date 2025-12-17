import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import VisitorForm from './components/VisitorForm';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/admin" />;
};

function App() {
    return (
        <Routes>
            <Route path="/" element={<VisitorForm />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={
                <PrivateRoute>
                    <AdminDashboard />
                </PrivateRoute>
            } />
        </Routes>
    );
}

export default App;

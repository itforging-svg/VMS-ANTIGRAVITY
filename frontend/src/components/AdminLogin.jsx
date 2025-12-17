import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
    const [creds, setCreds] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/auth/login', creds);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', res.data.username);
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
    };

    return (
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
                <h2 className="text-center">Admin Portal</h2>
                {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Username</label>
                        <input type="text" value={creds.username} onChange={e => setCreds({ ...creds, username: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" value={creds.password} onChange={e => setCreds({ ...creds, password: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Login</button>
                    <div className="text-center" style={{ marginTop: '1rem' }}>
                        <a href="/" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>Back to Visitor Form</a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;

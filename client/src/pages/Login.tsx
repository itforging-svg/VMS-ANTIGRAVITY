import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, ShieldCheck } from 'lucide-react';
import { API_URL } from '../config';

export const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                const data = await res.json();
                login(data.token, data.username, data.plant);
                navigate('/dashboard');
            } else {
                setError('Access Denied: Invalid Credentials');
            }
        } catch (err) {
            setError('System Error: Login Failed');
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Hero */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/90 to-amber-900/20"></div>
                <div className="relative z-10 p-12 text-white max-w-lg">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <ShieldCheck className="text-slate-900" size={28} />
                        </div>
                        <h1 className="text-3xl font-bold tracking-wide">CHANDAN STEEL LTD</h1>
                    </div>
                    <h2 className="text-5xl font-bold mb-6 leading-tight">Secure <span className="text-amber-500">Visitor</span> Management.</h2>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        Enterprise-grade security and tracking for industrial facilities.
                        monitor entries, exits, and approvals in real-time.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-50 p-8">
                <div className="glass w-full max-w-md p-8 rounded-2xl animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-600"></div>

                    <div className="mb-8 text-center lg:text-left">
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Admin Portal</h3>
                        <p className="text-slate-500">Authenticate to access system controls.</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm font-medium border-l-4 border-red-500 flex items-center gap-2 animate-pulse">
                            <Lock size={16} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider text-[11px]">Username</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="input-field pl-12"
                                    placeholder="Enter ID"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider text-[11px]">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field pl-12"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn-primary w-full mt-4">
                            Log In
                        </button>
                    </form>

                    <div className="mt-8 text-center text-xs text-slate-400">
                        Protected by Antigravity Systems v1.0
                    </div>
                </div>
            </div>
        </div>
    );
};

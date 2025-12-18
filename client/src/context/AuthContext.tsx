import { createContext, useContext, useState, type ReactNode } from 'react';

interface AuthContextType {
    token: string | null;
    username: string | null;
    plant: string | null;
    login: (token: string, username: string, plant: string | null) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
    const [plant, setPlant] = useState<string | null>(localStorage.getItem('plant'));

    const login = (newToken: string, newUsername: string, newPlant: string | null) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('username', newUsername);
        if (newPlant) localStorage.setItem('plant', newPlant);
        else localStorage.removeItem('plant');
        setToken(newToken);
        setUsername(newUsername);
        setPlant(newPlant);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('plant');
        setToken(null);
        setUsername(null);
        setPlant(null);
    };

    return (
        <AuthContext.Provider value={{ token, username, plant, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken]       = useState(localStorage.getItem('nb_token'));
  const [user, setUser]         = useState(JSON.parse(localStorage.getItem('nb_user') || 'null'));
  const [accounts, setAccounts] = useState(JSON.parse(localStorage.getItem('nb_accs') || '[]'));

  const login = (t, u, a) => {
    setToken(t); setUser(u); setAccounts(a);
    localStorage.setItem('nb_token', t);
    localStorage.setItem('nb_user', JSON.stringify(u));
    localStorage.setItem('nb_accs', JSON.stringify(a));
  };

  const logout = () => {
    setToken(null); setUser(null); setAccounts([]);
    localStorage.removeItem('nb_token');
    localStorage.removeItem('nb_user');
    localStorage.removeItem('nb_accs');
  };

  const refreshAccounts = (a) => {
    setAccounts(a);
    localStorage.setItem('nb_accs', JSON.stringify(a));
  };

  return (
    <AuthContext.Provider value={{ token, user, accounts, login, logout, refreshAccounts }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

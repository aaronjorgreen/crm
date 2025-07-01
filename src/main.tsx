import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthContext, useAuthState } from './hooks/useAuth';
import './index.css';

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authMethods = useAuthState();
  return (
    <AuthContext.Provider value={authMethods}>
      {children}
    </AuthContext.Provider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
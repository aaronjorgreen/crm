import React from "react";
import { useAuth } from "./hooks/useAuth";
import Dashboard from "./components/Dashboard";
import LoginPage from "./components/LoginPage";

function App() {
  const { authState } = useAuth();

  if (authState.loading) {
    return <div>Loading...</div>;
  }

  if (!authState.user) {
    return <LoginPage />;
  }

  return <Dashboard />;
}

export default App;

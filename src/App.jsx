import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import Login from './components/Login';
import bgImg from './assets/IMG_3736.jpeg';   // import the background properly
import HomeScreen from './components/HomeScreen';

function App() {
  const { t } = useTranslation();
  const shouldBypassLogin = typeof import.meta !== 'undefined' &&
    import.meta.env &&
    String(import.meta.env.VITE_BYPASS_LOGIN).toLowerCase() === 'true';
  const bypassRole = (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_BYPASS_LOGIN_ROLE) || 'yönetici';

  const getInitialLoginState = () => {
    if (typeof window === 'undefined') return shouldBypassLogin;
    const existingUser = localStorage.getItem('currentUser');
    return shouldBypassLogin || Boolean(existingUser);
  };

  const [isLoggedIn, setIsLoggedIn] = useState(getInitialLoginState);

  useEffect(() => {
    if (!shouldBypassLogin || typeof window === 'undefined') return;

    const existingUser = localStorage.getItem('currentUser');
    if (!existingUser) {
      // Seed a lightweight demo user so role-based UI keeps working
      const demoUser = { username: 'demo', role: bypassRole };
      localStorage.setItem('currentUser', JSON.stringify(demoUser));
    }

    setIsLoggedIn(true);
  }, [shouldBypassLogin, bypassRole]);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        backgroundImage: `url(${bgImg})`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    >
      {/* white translucent overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(255,255,255,0.5)',
          zIndex: 1,
        }}
      />
      {/* login form sits above overlay */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {isLoggedIn ? <HomeScreen /> : <Login onLoginSuccess={() => setIsLoggedIn(true)} />}
      </div>
    </div>
  );
}

export default App;

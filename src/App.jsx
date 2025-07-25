import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import Login from './components/Login';
import bgImg from './assets/IMG_3736.jpeg';   // import the background properly
import HomeScreen from './components/HomeScreen';

function App() {
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

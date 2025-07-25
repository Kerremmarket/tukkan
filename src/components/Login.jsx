import React, { useState } from 'react';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setError('');
        // Store user info in localStorage
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        console.log('Login successful!', data.user);
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }
      } else {
        setError(data.error || 'Hatalı kullanıcı adı veya şifre!');
        console.log('Login failed:', data.error);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      flexDirection: 'column',
      textAlign: 'center' 
    }}>
      <h1 style={{ fontSize: '3rem', color: '#333' }}>HOŞGELDİNİZ</h1>
      <div>
        <input
          type="text"
          placeholder="Kullanıcı Adı"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{ 
            margin: '0.5rem', 
            padding: '0.5rem', 
            fontSize: '1rem',
            backgroundColor: '#fff',
            color: '#333',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{ 
            margin: '0.5rem', 
            padding: '0.5rem', 
            fontSize: '1rem',
            backgroundColor: '#fff',
            color: '#333',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
      </div>
      {error && (
        <div style={{ color: 'red', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}
      <button 
        onClick={handleLogin} 
        style={{ 
          marginTop: '1rem', 
          padding: '0.5rem 1rem', 
          fontSize: '1rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
        Giriş Yap
      </button>
    </div>
  );
}

export default Login; 
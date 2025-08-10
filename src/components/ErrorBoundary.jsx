import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          background: '#1a1a1a', 
          border: '1px solid #ff6b6b', 
          borderRadius: '6px', 
          padding: '1rem', 
          margin: '1rem',
          color: '#fff'
        }}>
          <h3 style={{ color: '#ff6b6b', margin: '0 0 0.5rem 0' }}>Bir hata oluştu</h3>
          <p style={{ margin: '0 0 0.5rem 0' }}>Bu bileşen yüklenirken bir sorun yaşandı.</p>
          <details style={{ marginTop: '0.5rem' }}>
            <summary style={{ cursor: 'pointer', color: '#888' }}>Teknik Detaylar</summary>
            <pre style={{ 
              fontSize: '0.8rem', 
              background: '#333', 
              padding: '0.5rem', 
              borderRadius: '4px',
              marginTop: '0.5rem',
              overflow: 'auto'
            }}>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo.componentStack}
            </pre>
          </details>
          <button 
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            style={{
              marginTop: '0.5rem',
              background: '#4dabf7',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Tekrar Dene
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

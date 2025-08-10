import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/api.js';

const SalePhotos = ({ saleId }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!saleId) {
      setLoading(false);
      return;
    }

    const fetchPhotos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const url = buildApiUrl('/api/sales', `${saleId}/media`);
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setPhotos(data.files || []);
      } catch (err) {
        console.error('Error fetching photos:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [saleId]);

  if (loading) {
    return (
      <div style={{ background: '#1a1a1a', border: '1px solid #444', borderRadius: '6px', padding: '0.75rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Görsel</div>
        <div style={{ height: '160px', background: '#333', border: '1px dashed #555', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
          Yükleniyor...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#1a1a1a', border: '1px solid #444', borderRadius: '6px', padding: '0.75rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Görsel</div>
        <div style={{ height: '160px', background: '#333', border: '1px dashed #555', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b', fontSize: '0.8rem' }}>
          Hata: {error}
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div style={{ background: '#1a1a1a', border: '1px solid #444', borderRadius: '6px', padding: '0.75rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Görsel</div>
        <div style={{ height: '160px', background: '#333', border: '1px dashed #555', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
          Görsel bulunamadı
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #444', borderRadius: '6px', padding: '0.75rem' }}>
      <div style={{ marginBottom: '0.5rem', fontWeight: '600', textAlign: 'center' }}>Görsel ({photos.length})</div>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
        gap: '0.5rem',
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
        {photos.map((photo, index) => (
          <div key={photo.filename} style={{ position: 'relative' }}>
            <img
              src={`https://tukkan-production.up.railway.app${photo.url}`}
              alt={`Sale ${saleId} - ${photo.filename}`}
              style={{
                width: '100%',
                height: '120px',
                objectFit: 'cover',
                borderRadius: '4px',
                border: '1px solid #555',
                cursor: 'pointer'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
              onClick={() => {
                // Open photo in new tab for full view
                window.open(`https://tukkan-production.up.railway.app${photo.url}`, '_blank');
              }}
            />
            <div style={{
              display: 'none',
              width: '100%',
              height: '120px',
              background: '#333',
              border: '1px solid #555',
              borderRadius: '4px',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#888',
              fontSize: '0.7rem',
              textAlign: 'center'
            }}>
              Görsel<br/>yüklenemedi
            </div>
            <div style={{
              position: 'absolute',
              bottom: '2px',
              left: '2px',
              right: '2px',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              fontSize: '0.6rem',
              padding: '1px 3px',
              borderRadius: '2px',
              textAlign: 'center'
            }}>
              {new Date(photo.created_at).toLocaleDateString('tr-TR')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalePhotos;

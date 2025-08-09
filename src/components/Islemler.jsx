import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api.js';

function Islemler({ onBackToHome, onNavigate }) {
  const [salesSearch, setSalesSearch] = useState('');
  const [purchasesSearch, setPurchasesSearch] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [noteModal, setNoteModal] = useState({ show: false, note: '' });
  
  // User management states
  const [showUserRegistration, setShowUserRegistration] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'çalışan'
  });
  
  // Get current user role
  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem('currentUser');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };
  
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'yönetici';

  // Helper function to format numbers with commas
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '';
    return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Helper function to format date with timezone correction
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Add 3 hours to correct timezone issue
    date.setHours(date.getHours() + 3);
    return date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Helper function to extract transaction ID from description
  const extractTransactionId = (description, fallbackId, type) => {
    if (!description) return `${type === 'satis' ? 'SAT' : 'ALS'}-${fallbackId}`;
    
    // Look for "Satış ID: SAT-YYMMDD-HHMMSS" pattern
    const match = description.match(/Satış ID: (SAT-\d{6}-\d{6})/);
    if (match) {
      return match[1];
    }
    
    // Look for "Alış ID: ALIS-YYMMDD-HHMMSS" or any transaction ID pattern
    const purchaseMatch = description.match(/Alış ID: ([^,]+)/);
    if (purchaseMatch) {
      return purchaseMatch[1].trim();
    }
    
    // Fallback to database ID format
    return `${type === 'satis' ? 'SAT' : 'ALS'}-${fallbackId}`;
  };

  // Helper function to calculate profit percentage
  const calculateProfit = (sale) => {
    const inventoryItem = inventory.find(item => 
      item.urun_kodu.toLowerCase() === sale.urun_kodu.toLowerCase()
    );
    
    if (!inventoryItem) return 0;
    
    const costPerMeter = inventoryItem.metre_maliyet;
    const revenuePerMeter = sale.birim_fiyat;
    const profitPerMeter = revenuePerMeter - costPerMeter;
    const profitPercentage = costPerMeter > 0 ? (profitPerMeter / costPerMeter) * 100 : 0;
    
    return profitPercentage;
  };

  // Helper function to extract note from description
  const extractDeliveryDate = (description) => {
    if (!description) return '';
    const m = description.match(/Teslim: (\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  };

  const daysUntil = (dateStr) => {
    if (!dateStr) return '';
    const today = new Date();
    const target = new Date(dateStr);
    const diff = Math.ceil((target - new Date(today.toDateString())) / (1000 * 60 * 60 * 24));
    return diff;
  };



  // Fetch transactions and inventory from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch transactions
        const transactionsResponse = await fetch(API_ENDPOINTS.ISLEMLER);
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          setTransactions(transactionsData);
        } else {
          console.error('Failed to fetch transactions:', transactionsResponse.status);
        }
        
        // Fetch inventory for profit calculations
        const inventoryResponse = await fetch(API_ENDPOINTS.ENVANTER);
        if (inventoryResponse.ok) {
          const inventoryData = await inventoryResponse.json();
          setInventory(inventoryData);
        } else {
          console.error('Failed to fetch inventory:', inventoryResponse.status);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Separate sales and purchases
  const salesData = transactions.filter(t => t.islem_tipi === 'satis');
  const purchasesData = transactions.filter(t => t.islem_tipi === 'alis');

  const filteredSales = salesData.filter(item => {
    const transactionId = extractTransactionId(item.aciklama, item.id, 'satis');
    return item.urun_kodu.toLowerCase().includes(salesSearch.toLowerCase()) ||
           (item.musteri && item.musteri.toLowerCase().includes(salesSearch.toLowerCase())) ||
           (item.aciklama && item.aciklama.toLowerCase().includes(salesSearch.toLowerCase())) ||
           transactionId.toLowerCase().includes(salesSearch.toLowerCase());
  });

  const filteredPurchases = purchasesData.filter(item => {
    if (purchasesSearch === '') return true;
    const transactionId = extractTransactionId(item.aciklama, item.id, 'alis');
    return item.urun_kodu?.toLowerCase().includes(purchasesSearch.toLowerCase()) ||
           (item.musteri && item.musteri.toLowerCase().includes(purchasesSearch.toLowerCase())) ||
           (item.aciklama && item.aciklama.toLowerCase().includes(purchasesSearch.toLowerCase())) ||
           transactionId.toLowerCase().includes(purchasesSearch.toLowerCase());
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      height: '100vh',
      width: '100vw',
      display: 'flex',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      overflow: 'hidden',
      zIndex: 1000
    }}>
      {/* Note Modal */}
      {noteModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            color: '#fff'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#28a745' }}>İşlem Notu</h3>
            <p style={{ 
              backgroundColor: '#1a1a1a',
              padding: '1rem',
              borderRadius: '4px',
              border: '1px solid #555',
              whiteSpace: 'pre-wrap'
            }}>
              {noteModal.note || 'Not bulunamadı'}
            </p>
            <button 
              onClick={() => setNoteModal({ show: false, note: '' })}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Left Sidebar - Fixed to match other pages */}
      <div style={{
        width: '280px',
        backgroundColor: '#2a2a2a',
        padding: '1rem',
        paddingBottom: '1.5rem',
        borderRight: '1px solid #404040',
        height: 'calc(100vh - 2rem)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        margin: '1rem 0'
      }}>
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <button 
              onClick={onBackToHome}
              style={{
                width: '100%',
                padding: '0.8rem',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '1rem',
                fontSize: '1rem'
              }}>
              🏠 Ana Sayfa
            </button>
          </div>

          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Menü</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <button 
                onClick={() => onNavigate && onNavigate('urun-satis')}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '1.3rem'
                }}>- ÜRÜN SATIŞ</button>
            </li>
            {isAdmin && (
              <li style={{ marginBottom: '0.5rem' }}>
                <button 
                  onClick={() => onNavigate && onNavigate('urun-alis')}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    backgroundColor: '#333',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '1.3rem'
                  }}>- ÜRÜN ALIŞ</button>
              </li>
            )}
            <li style={{ marginBottom: '0.5rem' }}>
              <button 
                onClick={() => onNavigate && onNavigate('envanter')}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '1.3rem'
                }}>- ENVANTER</button>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <button style={{
                width: '100%',
                padding: '0.8rem',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '1.3rem'
              }}>- İŞLEMLER</button>
            </li>
                        {isAdmin && (
              <li style={{ marginBottom: '0.5rem' }}>
                <button 
                  onClick={() => onNavigate && onNavigate('yonetici')}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    backgroundColor: '#333',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '1.3rem'
                  }}>- YÖNETİCİ</button>
              </li>
            )}
          </ul>
        </div>

        {/* User Management & Logout Section */}
        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          {isAdmin && (
            <button 
              onClick={() => setShowUserRegistration(true)}
              style={{
                width: '100%',
                padding: '0.8rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                marginBottom: '0.5rem'
              }}>
              👤 Yeni Kullanıcı
            </button>
          )}
          <button 
            onClick={() => window.location.reload()}
            style={{
              width: '100%',
              padding: '0.8rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}>
            🚪 Çıkış
          </button>
        </div>
      </div>

      {/* Main Content - Made scrollable */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '1rem',
        overflow: 'auto',
        height: '100vh'
      }}>
        {/* Header */}

        {/* Sales Section - Made longer */}
        <div style={{
          minHeight: '600px',
          marginBottom: '2rem',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Sales Header */}
          <div style={{
            backgroundColor: '#28a745',
            padding: '1rem',
            color: 'white',
            fontSize: '1.2rem',
            fontWeight: '600'
          }}>
            SATIŞLAR
          </div>

          {/* Sales Search */}
          <div style={{ padding: '1rem', backgroundColor: '#333' }}>
            <input
              type="text"
              placeholder="Satış ara (işlem kodu, ürün, satıcı, müşteri)..."
              value={salesSearch}
              onChange={(e) => setSalesSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.8rem',
                backgroundColor: '#1a1a1a',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            />
            <div style={{ 
              marginTop: '0.5rem', 
              fontSize: '0.8rem', 
              color: '#ccc' 
            }}>
              {filteredSales.length} satış gösteriliyor
            </div>
          </div>

          {/* Sales Table */}
          <div style={{ 
            flex: 1, 
            overflow: 'auto',
            backgroundColor: '#1a1a1a'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '0.75rem'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#28a745' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '90px' }}>İşlem Kodu</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '80px' }}>Ürün Kodu</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '100px' }}>Birim Fiyat</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '100px' }}>Toplam Tutar</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '70px' }}>Metre</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '90px' }}>Kar</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '120px' }}>Satıcı İsmi</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '140px' }}>Müşteri</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '120px' }}>Tarih</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '100px' }}>Teslim Günü</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '70px' }}>Kalan Gün</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} style={{ 
                      padding: '2rem', 
                      textAlign: 'center', 
                      color: '#ccc',
                      fontStyle: 'italic'
                    }}>
                      Veriler yükleniyor...
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ 
                      padding: '2rem', 
                      textAlign: 'center', 
                      color: '#ccc',
                      fontStyle: 'italic'
                    }}>
                      {salesSearch ? 'Arama kriterlerine uygun satış bulunamadı.' : 'Henüz satış işlemi kaydı bulunmuyor.'}
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale, index) => {
                    const profit = calculateProfit(sale);
                    const teslim = extractDeliveryDate(sale.aciklama);
                    const kalanGun = teslim ? daysUntil(teslim) : '';
                    
                    return (
                      <tr key={sale.id} style={{ 
                        backgroundColor: index % 2 === 0 ? '#2a2a2a' : '#333',
                        borderBottom: '1px solid #555'
                      }}>
                        <td style={{ padding: '0.5rem', color: '#28a745', fontWeight: '500', cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => {
                              const tx = extractTransactionId(sale.aciklama, sale.id, 'satis');
                              const details = `Satış Detayı\n\n` +
                                `İşlem Kodu: ${tx}\n` +
                                `Ürün: ${sale.urun_kodu}\n` +
                                `Miktar: ${formatNumber(sale.miktar)} m\n` +
                                `Birim Fiyat: ${formatNumber(sale.birim_fiyat)} ₺\n` +
                                `Toplam: ${formatNumber(sale.toplam_tutar)} ₺\n` +
                                `Satıcı: ${sale.aciklama?.includes('Satıcı:') ? sale.aciklama.split('Satıcı:')[1]?.split(',')[0]?.trim() : '-'}\n` +
                                `Müşteri: ${sale.musteri || '-'}\n` +
                                `Teslim Günü: ${extractDeliveryDate(sale.aciklama) || '-'}\n` +
                                `Ödeme Tipi: ${sale.odeme_tipi}`;
                              alert(details + "\n\n[Resim önizleme yeri - placeholder]");
                            }}
                        >
                          {extractTransactionId(sale.aciklama, sale.id, 'satis')}
                        </td>
                        <td style={{ padding: '0.5rem', color: '#fff' }}>{sale.urun_kodu}</td>
                        <td style={{ padding: '0.5rem', color: '#fff', fontWeight: '500' }}>{formatNumber(sale.birim_fiyat)} ₺</td>
                        <td style={{ padding: '0.5rem', color: '#28a745' }}>{formatNumber(sale.toplam_tutar)} ₺</td>
                        <td style={{ padding: '0.5rem', color: '#fff' }}>{formatNumber(sale.miktar)} m</td>
                        <td style={{ 
                          padding: '0.5rem', 
                          color: profit >= 0 ? '#28a745' : '#dc3545',
                          fontWeight: '500'
                        }}>
                          {formatNumber(profit)}%
                        </td>
                        <td style={{ padding: '0.5rem', color: '#fff' }}>{sale.aciklama?.includes('Satıcı:') ? sale.aciklama.split('Satıcı:')[1]?.split(',')[0]?.trim() : '-'}</td>
                        <td style={{ padding: '0.5rem', color: '#fff' }}>{sale.musteri || '-'}</td>
                        <td style={{ padding: '0.5rem', color: '#ccc' }}>{formatDate(sale.created_at)}</td>
                        <td style={{ padding: '0.5rem', color: '#ffc107' }}>{teslim || '-'}</td>
                        <td style={{ padding: '0.5rem', color: kalanGun < 0 ? '#ff6b6b' : '#51cf66' }}>
                          {teslim ? (kalanGun >= 0 ? `${kalanGun} gün` : `${Math.abs(kalanGun)} gün gecikti`) : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Purchases Section - Made longer */}
        <div style={{
          minHeight: '600px',
          marginBottom: '2rem',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Purchases Header */}
          <div style={{
            backgroundColor: '#dc3545',
            padding: '1rem',
            color: 'white',
            fontSize: '1.2rem',
            fontWeight: '600'
          }}>
            ALIŞLAR
          </div>

          {/* Purchases Search */}
          <div style={{ padding: '1rem', backgroundColor: '#333' }}>
            <input
              type="text"
              placeholder="Alış ara (işlem kodu, ürün, alıcı, tedarikçi)..."
              value={purchasesSearch}
              onChange={(e) => setPurchasesSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.8rem',
                backgroundColor: '#1a1a1a',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            />
            <div style={{ 
              marginTop: '0.5rem', 
              fontSize: '0.8rem', 
              color: '#ccc' 
            }}>
              {filteredPurchases.length} alış gösteriliyor
            </div>
          </div>

          {/* Purchases Table */}
          <div style={{ 
            flex: 1, 
            overflow: 'auto',
            backgroundColor: '#1a1a1a'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '0.75rem'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#dc3545' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '90px' }}>İşlem Kodu</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '80px' }}>Ürün Kodu</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '100px' }}>Alış Fiyatı</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '70px' }}>Metre</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '120px' }}>Alıcı İsmi</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '140px' }}>Tedarikçi Bilgileri</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '120px' }}>Tarih</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'white', width: '90px' }}>Not</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ 
                      padding: '2rem', 
                      textAlign: 'center', 
                      color: '#ccc',
                      fontStyle: 'italic'
                    }}>
                      Veriler yükleniyor...
                    </td>
                  </tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ 
                      padding: '2rem', 
                      textAlign: 'center', 
                      color: '#ccc',
                      fontStyle: 'italic'
                    }}>
                      {purchasesSearch ? 'Arama kriterlerine uygun alış bulunamadı.' : 'Henüz alış işlemi kaydı bulunmuyor.'}
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((purchase, index) => {
                    const note = extractNote(purchase.aciklama);
                    
                    return (
                      <tr key={purchase.id} style={{ 
                        backgroundColor: index % 2 === 0 ? '#2a2a2a' : '#333',
                        borderBottom: '1px solid #555'
                      }}>
                        <td style={{ padding: '0.5rem', color: '#dc3545', fontWeight: '500' }}>
                          {extractTransactionId(purchase.aciklama, purchase.id, 'alis')}
                        </td>
                        <td style={{ padding: '0.5rem', color: '#fff' }}>{purchase.urun_kodu}</td>
                        <td style={{ padding: '0.5rem', color: '#fff', fontWeight: '500' }}>{formatNumber(purchase.birim_fiyat)} ₺</td>
                        <td style={{ padding: '0.5rem', color: '#fff' }}>{formatNumber(purchase.miktar)} m</td>
                        <td style={{ padding: '0.5rem', color: '#fff' }}>{purchase.aciklama?.includes('Alıcı:') ? purchase.aciklama.split('Alıcı:')[1]?.split(',')[0]?.trim() : '-'}</td>
                        <td style={{ padding: '0.5rem', color: '#fff' }}>{purchase.musteri || '-'}</td>
                        <td style={{ padding: '0.5rem', color: '#ccc' }}>{formatDate(purchase.created_at)}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          {note ? (
                            <button 
                              onClick={() => setNoteModal({ show: true, note: note })}
                              style={{
                                padding: '0.2rem 0.4rem',
                                backgroundColor: '#ffc107',
                                color: '#000',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.7rem'
                              }}
                              title="Notu görüntüle"
                            >
                              📝
                            </button>
                          ) : (
                            <span style={{ color: '#666' }}>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Registration Modal */}
      {showUserRegistration && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '2rem',
            borderRadius: '8px',
            width: '400px',
            color: '#fff'
          }}>
            <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>Yeni Kullanıcı Oluştur</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Kullanıcı Adı (en az 3 harf):</label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: '#444',
                  color: '#fff',
                  border: '1px solid #666',
                  borderRadius: '4px'
                }}
                placeholder="Sadece İngilizce harfler"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Şifre (en az 8 karakter):</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: '#444',
                  color: '#fff',
                  border: '1px solid #666',
                  borderRadius: '4px'
                }}
                placeholder="En az 8 karakter"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Rol:</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: '#444',
                  color: '#fff',
                  border: '1px solid #666',
                  borderRadius: '4px'
                }}
              >
                <option value="çalışan">Çalışan</option>
                <option value="yönetici">Yönetici</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(API_ENDPOINTS.REGISTER, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(newUser)
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                      alert(`Kullanıcı başarıyla oluşturuldu!\nKullanıcı: ${data.username}\nRol: ${data.role}`);
                      setShowUserRegistration(false);
                      setNewUser({ username: '', password: '', role: 'çalışan' });
                    } else {
                      alert(`Hata: ${data.error}`);
                    }
                  } catch (error) {
                    alert('Bağlantı hatası. Lütfen tekrar deneyin.');
                  }
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Oluştur
              </button>
              
              <button
                onClick={() => {
                  setShowUserRegistration(false);
                  setNewUser({ username: '', password: '', role: 'çalışan' });
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Islemler; 
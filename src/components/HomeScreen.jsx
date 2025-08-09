import React, { useState, useEffect } from 'react';
import UrunSatis from './UrunSatis';
import UrunAlis from './UrunAlis';
import Envanter from './Envanter';
import Islemler from './Islemler';
import Yonetici from './Yonetici';
import { API_ENDPOINTS } from '../config/api.js';

function HomeScreen() {
  const [currentPage, setCurrentPage] = useState('home');
  const [posts, setPosts] = useState([]);
  const [overduePayments, setOverduePayments] = useState([]);
  const [paymentAmounts, setPaymentAmounts] = useState({}); // Track payment amounts for each payment
  const [allPayments, setAllPayments] = useState([]); // All beklenen ödemeler
  const [paymentsSearch, setPaymentsSearch] = useState(''); // Search term for payments
  const [paymentsSort, setPaymentsSort] = useState('lastPayment'); // Sort option
  
  // Shared inventory state
  const [inventoryItems, setInventoryItems] = useState([]);
  
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
  
  // TODO: Make overdue threshold configurable instead of hardcoded
  const OVERDUE_THRESHOLD_DAYS = 30;



  // Payment handling functions
  const handlePaymentAmountChange = (paymentId, amount) => {
    setPaymentAmounts(prev => ({
      ...prev,
      [paymentId]: amount === '' ? '' : parseInt(amount) || 0
    }));
  };

  const handlePayment = async (payment) => {
    const paymentAmount = paymentAmounts[payment.transaction_id] || (payment.taksit_miktari || 0);
    
    if (!paymentAmount || paymentAmount <= 0) {
      alert('Lütfen geçerli bir ödeme miktarı girin.');
      return;
    }
    
    try {
      const response = await fetch(`${API_ENDPOINTS.BEKLENEN_ODEMELER}/${payment.transaction_id}/odeme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          odeme_miktari: paymentAmount
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Ödeme başarılı: ₺${result.paid_amount} - Taksit ${result.installment_no}`);
        
        // Clear the payment amount input
        setPaymentAmounts(prev => ({
          ...prev,
          [payment.transaction_id]: ''
        }));
        
        // Reload overdue payments
        loadOverduePayments();
      } else {
        const error = await response.json();
        alert(`Ödeme hatası: ${error.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Ödeme sırasında bir hata oluştu');
    }
  };

  // Helper function to get days since last payment
  const getDaysSinceLastPayment = (lastPaymentDate) => {
    if (!lastPaymentDate) return null;
    const now = new Date();
    const lastPayment = new Date(lastPaymentDate);
    const diffTime = Math.abs(now - lastPayment);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Helper function to sort payments
  const sortPayments = (payments, sortType) => {
    if (sortType === 'none') return payments;
    
    return [...payments].sort((a, b) => {
      switch (sortType) {
        case 'lastPayment':
          const daysA = getDaysSinceLastPayment(a.last_payment_date) || 0;
          const daysB = getDaysSinceLastPayment(b.last_payment_date) || 0;
          return daysB - daysA; // Descending (oldest first)
          
        case 'debtSize':
          return (b.acik_odeme || 0) - (a.acik_odeme || 0); // Descending (largest first)
          
        case 'customer':
          return (a.musteri || '').localeCompare(b.musteri || ''); // Ascending
          
        default:
          return 0;
      }
    });
  };

  // Helper function to filter payments
  const filterPayments = (payments, searchTerm) => {
    if (!searchTerm) return payments;
    
    const search = searchTerm.toLowerCase();
    return payments.filter(payment => 
      (payment.musteri || '').toLowerCase().includes(search) ||
      (payment.islem_kodu || '').toLowerCase().includes(search)
    );
  };

  // Extract the loadOverduePayments function so it can be called from payment handler
  const loadOverduePayments = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.BEKLENEN_ODEMELER);
      if (response.ok) {
        const payments = await response.json();
        
        // Set all payments for the main section
        setAllPayments(payments);
        
        // Filter payments that are overdue and are nakit type
        const overdue = payments.filter(payment => {
          if (!payment || payment.odeme_tipi !== 'nakit' || !payment.last_payment_date) {
            return false;
          }
          
          const now = new Date();
          const lastPayment = new Date(payment.last_payment_date);
          const diffTime = Math.abs(now - lastPayment);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          return diffDays > OVERDUE_THRESHOLD_DAYS;
        });
      
        setOverduePayments(overdue);
      } else {
        console.error('Failed to fetch overdue payments:', response.status);
        setOverduePayments([]);
        setAllPayments([]);
      }
    } catch (error) {
      console.error('Error loading overdue payments:', error);
      setOverduePayments([]);
      setAllPayments([]);
    }
  };

  // Fetch inventory data from backend
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.ENVANTER);
        if (response.ok) {
          const data = await response.json();
          // Transform backend data to match frontend format
          const transformedData = data.map(item => ({
            id: item.id,
            urunKodu: item.urun_kodu,
            metre: item.metre,
            metreMaliyet: item.metre_maliyet,
            fiyat: item.fiyat,
            sonIslemTarihi: item.son_islem_tarihi ? item.son_islem_tarihi.split(' ')[0] : '',
            son30GunIslem: item.son_30_gun_islem
          }));
          setInventoryItems(transformedData);
          console.log('Inventory loaded from backend:', transformedData);
        } else {
          console.error('Failed to fetch inventory:', response.status);
        }
      } catch (error) {
        console.error('Error fetching inventory:', error);
      }
    };

    fetchInventory();
  }, []);

  useEffect(() => {
    // Load posts from localStorage
    const loadPosts = () => {
      const savedPosts = localStorage.getItem('tukkan-gundem-posts');
      if (savedPosts) {
        try {
          const parsedPosts = JSON.parse(savedPosts);
          console.log('Loaded posts:', parsedPosts); // Debug log
          setPosts(parsedPosts);
        } catch (error) {
          console.error('Error loading posts:', error);
        }
      } else {
        console.log('No posts found in localStorage'); // Debug log
        // No default posts - start with empty state
        setPosts([]);
      }
    };

    loadPosts();

    // Listen for storage changes to update posts when they're added from Yönetici
    const handleStorageChange = (e) => {
      if (e.key === 'tukkan-gundem-posts') {
        loadPosts();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check for updates periodically (in case storage event doesn't fire)
    const interval = setInterval(loadPosts, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

    useEffect(() => {
    loadOverduePayments();
    
    // Check for updates periodically
    const paymentInterval = setInterval(loadOverduePayments, 2000);

    return () => {
      clearInterval(paymentInterval);
    };
  }, []); // Load once on component mount

  if (currentPage === 'urun-satis') {
    return <UrunSatis 
      onBackToHome={() => setCurrentPage('home')} 
      onNavigate={setCurrentPage} 
      inventoryItems={inventoryItems}
      setInventoryItems={setInventoryItems}
    />;
  }

  if (currentPage === 'urun-alis') {
    return <UrunAlis 
      onBackToHome={() => setCurrentPage('home')} 
      onNavigate={setCurrentPage}
      inventoryItems={inventoryItems}
      setInventoryItems={setInventoryItems}
    />;
  }

  if (currentPage === 'envanter') {
    return <Envanter 
      onBackToHome={() => setCurrentPage('home')} 
      onNavigate={setCurrentPage}
      inventoryItems={inventoryItems}
      setInventoryItems={setInventoryItems}
    />;
  }

  if (currentPage === 'islemler') {
    return <Islemler onBackToHome={() => setCurrentPage('home')} onNavigate={setCurrentPage} />;
  }

  if (currentPage === 'yonetici') {
    return <Yonetici onBackToHome={() => setCurrentPage('home')} onNavigate={setCurrentPage} />;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      padding: '1rem',
      paddingTop: '4rem',
      zIndex: 1000,
      overflow: 'hidden'
    }}>


      {/* Logout Button - Top Right */}
      <button 
        onClick={() => window.location.reload()}
        style={{
          position: 'absolute',
          top: '0.5rem',
          right: '3rem',
          padding: '0.4rem 0.8rem',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: '500',
          whiteSpace: 'nowrap'
        }}>
        🚪 Çıkış
      </button>

      {/* Navigation buttons */}
      <div style={{ 
        marginBottom: '3rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button 
          onClick={() => setCurrentPage('urun-satis')}
          style={{ 
            margin: '0.5rem',
            padding: '1.2rem 2rem',
            backgroundColor: '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1.1rem',
            fontWeight: '500',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>Ürün Satış</button>
        {isAdmin && (
          <button 
            onClick={() => setCurrentPage('urun-alis')}
            style={{ 
              margin: '0.5rem',
              padding: '1.2rem 2rem',
              backgroundColor: '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: '500',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>Ürün Alış</button>
        )}
        <button 
          onClick={() => setCurrentPage('envanter')}
          style={{ 
            margin: '0.5rem',
            padding: '1.2rem 2rem',
            backgroundColor: '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1.1rem',
            fontWeight: '500',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>Envanter</button>
        <button 
          onClick={() => setCurrentPage('islemler')}
          style={{ 
          margin: '0.5rem',
          padding: '1.2rem 2rem',
          backgroundColor: '#333',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '1.1rem',
          fontWeight: '500',
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>İşlemler</button>
        {isAdmin && (
          <button 
            onClick={() => setCurrentPage('yonetici')}
            style={{ 
            margin: '0.5rem',
            padding: '1.2rem 2rem',
            backgroundColor: '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1.1rem',
            fontWeight: '500',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>Yönetici</button>
        )}
      </div>
      
      {/* Main content boxes */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        width: '100%',
        maxWidth: '1200px',
        gap: '2rem',
        flex: 1
      }}>
        <div style={{ 
          flex: 1, 
          padding: '2rem', 
          backgroundColor: '#2a2a2a',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          border: '1px solid #444',
          minHeight: '400px'
        }}>
          <h2 style={{ 
            marginTop: 0,
            marginBottom: '1.5rem',
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#fff'
          }}>Gündem</h2>
          <div style={{ 
            color: '#ccc', 
            fontSize: '1rem',
            maxHeight: '350px',
            overflowY: 'auto'
          }}>
            {posts.length === 0 ? (
              <div>
                <p style={{ fontStyle: 'italic', color: '#999' }}>Henüz gündem içeriği bulunmuyor.</p>
                <p style={{ fontSize: '0.8rem', color: '#999' }}>Debug: {posts.length} posts loaded</p>
              </div>
            ) : (
              posts.map((post, index) => (
                <div key={index} style={{
                  backgroundColor: post.isImportant ? '#2d1810' : '#333',
                  border: post.isImportant ? '2px solid #ff6b35' : '1px solid #555',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  position: 'relative'
                }}>
                  {post.isImportant && (
                    <div style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '8px',
                      backgroundColor: '#ff6b35',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold'
                    }}>
                      ⭐ ÖNEMLİ
                    </div>
                  )}
                  <h3 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: post.isImportant ? '#ff6b35' : '#fff'
                  }}>
                    {post.title}
                  </h3>
                  <p style={{
                    margin: '0 0 0.5rem 0',
                    color: '#ccc',
                    lineHeight: '1.4'
                  }}>
                    {post.content}
                  </p>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#999',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>Yayınlayan: {post.author}</span>
                    <span>{new Date(post.createdAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div style={{ 
          flex: 1, 
          padding: '2rem', 
          backgroundColor: '#2a2a2a',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          border: '1px solid #444',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          <h2 style={{ 
            marginTop: 0,
            marginBottom: '1rem',
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#fff'
          }}>Tüm Beklenen Ödemeler</h2>
          
          {/* Search and Sort Controls */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '1rem',
            alignItems: 'center'
          }}>
            <input
              type="text"
              placeholder="Müşteri adı veya işlem kodu ile ara..."
              value={paymentsSearch}
              onChange={(e) => setPaymentsSearch(e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #555',
                backgroundColor: '#333',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            />
            <select
              value={paymentsSort}
              onChange={(e) => setPaymentsSort(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #555',
                backgroundColor: '#333',
                color: '#fff',
                fontSize: '0.9rem',
                minWidth: '180px'
              }}
            >
              <option value="lastPayment">Son Ödeme Tarihine Göre</option>
              <option value="debtSize">Borç Büyüklüğüne Göre</option>
              <option value="customer">Müşteri Adına Göre</option>
              <option value="none">Sıralama Yok</option>
            </select>
          </div>
          
          {/* Payments List */}
          <div style={{ 
            flex: 1,
            overflowY: 'auto',
            color: '#ccc',
            maxHeight: 'calc(100vh - 300px)'
          }}>
            {(() => {
              const filteredPayments = filterPayments(allPayments, paymentsSearch);
              const sortedPayments = sortPayments(filteredPayments, paymentsSort);
              
              if (sortedPayments.length === 0) {
                return (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#999', 
                    fontStyle: 'italic',
                    padding: '2rem'
                  }}>
                    {paymentsSearch ? 'Arama kriterlerine uygun ödeme bulunamadı.' : 'Henüz beklenen ödeme bulunmuyor.'}
                  </div>
                );
              }
              
              return sortedPayments.map((payment, index) => {
                const daysSinceLastPayment = getDaysSinceLastPayment(payment.last_payment_date);
                const isOverdue = daysSinceLastPayment && daysSinceLastPayment > OVERDUE_THRESHOLD_DAYS;
                
                return (
                  <div key={payment.transaction_id || index} style={{
                    backgroundColor: isOverdue ? '#2d1810' : '#333',
                    border: isOverdue ? '2px solid #dc3545' : '1px solid #555',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '0.5rem'
                    }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: isOverdue ? '#dc3545' : '#4dabf7'
                      }}>
                        {payment.musteri}
                      </h3>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{
                          backgroundColor: payment.odeme_tipi === 'kart' ? '#495057' : '#228be6',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold'
                        }}>
                          {payment.odeme_tipi === 'kart' ? 'KART' : 'NAKİT'}
                        </span>
                        {daysSinceLastPayment && (
                          <span style={{
                            backgroundColor: isOverdue ? '#dc3545' : '#51cf66',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                          }}>
                            {daysSinceLastPayment} gün
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr 1fr', 
                      gap: '0.5rem',
                      fontSize: '0.9rem',
                      color: '#ccc',
                      marginBottom: '0.5rem'
                    }}>
                      <div>İşlem: {payment.islem_kodu}</div>
                      <div>Açık Tutar: ₺{payment.acik_odeme?.toLocaleString() || 0}</div>
                      <div>Taksit: ₺{payment.taksit_miktari?.toLocaleString() || 0}</div>
                    </div>
                    
                    {/* Payment Section - Only for nakit payments */}
                    {payment.odeme_tipi === 'nakit' && (
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                        marginTop: '0.5rem',
                        paddingTop: '0.5rem',
                        borderTop: '1px solid #555'
                      }}>
                        <input
                          type="number"
                          step="1"
                          placeholder="Ödeme miktarı"
                          value={paymentAmounts[payment.transaction_id] || ''}
                          onChange={(e) => handlePaymentAmountChange(payment.transaction_id, e.target.value)}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            borderRadius: '4px',
                            border: '1px solid #555',
                            backgroundColor: '#333',
                            color: '#fff',
                            fontSize: '0.8rem'
                          }}
                        />
                        <button
                          onClick={() => handlePayment(payment)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#51cf66',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '500'
                          }}
                        >
                          ÖDE
                        </button>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeScreen; 
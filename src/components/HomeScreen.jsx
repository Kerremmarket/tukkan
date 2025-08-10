import React, { useState, useEffect } from 'react';
import SalePhotos from './SalePhotos.jsx';
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
  const [deliveries, setDeliveries] = useState([]);
  const [deliveriesSearch, setDeliveriesSearch] = useState('');
  const [deliveriesSort, setDeliveriesSort] = useState('days');
  const [saleDetail, setSaleDetail] = useState({ show: false, sale: null });
  const [transactions, setTransactions] = useState([]); // 'days' | 'customer' | 'ready'
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
  // Load deliveries from sales (transactions)
  const getReadySet = () => {
    try {
      const raw = localStorage.getItem('tukkan-ready-deliveries');
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(arr);
    } catch { return new Set(); }
  };

  const saveReadySet = (setObj) => {
    try { localStorage.setItem('tukkan-ready-deliveries', JSON.stringify(Array.from(setObj))); } catch {}
  };

  const loadDeliveries = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.ISLEMLER);
      if (!res.ok) return setDeliveries([]);
      const txs = await res.json();
      const sales = (txs || []).filter(t => t.islem_tipi === 'satis');
      const extractDeliveryDate = (description) => {
        if (!description) return '';
        const m = description.match(/Teslim: (\d{4}-\d{2}-\d{2})/);
        return m ? m[1] : '';
      };
      const extractTransactionId = (description, fallbackId) => {
        if (!description) return `SAT-${fallbackId}`;
        const m = description.match(/Satış ID: (SAT-\d{6}-\d{6})/);
        return m ? m[1] : `SAT-${fallbackId}`;
      };
      const daysUntil = (dateStr) => {
        if (!dateStr) return null;
        const today = new Date();
        const target = new Date(dateStr);
        return Math.ceil((target - new Date(today.toDateString())) / (1000*60*60*24));
      };
      const readySet = getReadySet();
      const mapped = sales.map(s => {
        const teslim = extractDeliveryDate(s.aciklama);
        return {
          id: s.id,
          islemKodu: extractTransactionId(s.aciklama, s.id),
          musteri: s.musteri || '-',
          teslimGunu: teslim,
          kalanGun: teslim ? daysUntil(teslim) : null,
          ready: readySet.has(s.id)
        };
      }).filter(d => d.teslimGunu); // only those with delivery
      setDeliveries(mapped);
    } catch {
      setDeliveries([]);
    }
  };

  const markDeliveryReady = (id) => {
    const setObj = getReadySet();
    setObj.add(id);
    saveReadySet(setObj);
    setDeliveries(prev => prev.map(d => d.id === id ? { ...d, ready: true } : d));
  };

  
  // TODO: Make overdue threshold configurable instead of hardcoded
  const OVERDUE_THRESHOLD_DAYS = 30;

  // Helper functions for sale detail modal
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

  const extractDeliveryDate = (description) => {
    if (!description) return '';
    const m = description.match(/Teslim: (\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  };

  const buildPaymentDetails = (sale) => {
    const desc = sale.aciklama || '';
    const pesinAmount = sale.pesin_miktar || 0;
    const taksitAmount = sale.taksit_miktar || 0;
    const taksitCount = sale.taksit_sayisi || 0;
    const pesinType = desc.includes('Pesin_Odeme_Tipi: kart') ? 'Kart' : 'Nakit';
    const taksitType = desc.includes('Taksit_Odeme_Tipi: kart') ? 'Kart' : 'Nakit';
    const isMail = desc.includes('Mail_Order: true') || sale.odeme_tipi === 'mail order';
    return {
      pesinAmount,
      taksitAmount,
      taksitCount,
      pesinType,
      taksitType,
      isMail
    };
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };



  // Payment handling functions
  const handlePaymentAmountChange = (payment, rawValue) => {
    const paymentId = payment.transaction_id || payment.id;
    const typed = rawValue === '' ? '' : parseInt(rawValue) || 0;
    const remaining = Math.max(0, (payment.acik_odeme || 0));
    const installment = Math.max(0, (payment.taksit_miktari || 0));
    const cap = Math.min(remaining || Infinity, installment || Infinity);
    const clamped = rawValue === '' ? '' : Math.max(0, Math.min(typed, isFinite(cap) ? cap : typed));
    setPaymentAmounts(prev => ({
      ...prev,
      [paymentId]: clamped
    }));
  };

  const handlePayment = async (payment) => {
    const paymentId = payment.transaction_id || payment.id;
    const txId = Number(payment.transaction_id ?? payment.id);
    if (!Number.isFinite(txId)) {
      alert('Geçersiz işlem kimliği. Lütfen sayfayı yenileyin.');
      return;
    }
    const remaining = Math.max(0, (payment.acik_odeme || 0));
    const installment = Math.max(0, (payment.taksit_miktari || 0));
    const cap = Math.min(remaining || Infinity, installment || Infinity);
    const entered = paymentAmounts[paymentId];
    const paymentAmount = entered === '' || entered === undefined ? (installment || 0) : Math.min(entered, isFinite(cap) ? cap : entered);
    
    if (!paymentAmount || paymentAmount <= 0) {
      alert('Lütfen geçerli bir ödeme miktarı girin.');
      return;
    }
    
    try {
      const response = await fetch(`${API_ENDPOINTS.BEKLENEN_ODEMELER}/${txId}/odeme`, {
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
        const paid = result.paid_amount_total ?? result.paid_amount ?? paymentAmount;
        alert(`Ödeme başarılı: ₺${paid}`);

        // Optimistic update: reduce açık_odeme locally for immediate UI feedback
        setAllPayments(prev => {
          const updated = prev.map(p => {
          if ((p.transaction_id || p.id) === (paymentId)) {
            const currentRemaining = p.acik_odeme || 0;
            const paid = (result.paid_amount_total ?? result.paid_amount ?? paymentAmount) || 0;
              const newRemaining = Math.max(0, currentRemaining - paid);
              return { ...p, acik_odeme: newRemaining, last_payment_date: new Date().toISOString() };
            }
            return p;
          });
          // Remove fully paid items immediately
          return updated.filter(p => (p.acik_odeme || 0) > 0);
        });

        // Clear the payment amount input
        setPaymentAmounts(prev => ({
          ...prev,
          [paymentId]: ''
        }));

        // Also refresh from backend shortly to ensure consistency
        setTimeout(loadOverduePayments, 400);
      } else {
        let message = 'Bilinmeyen hata';
        try {
          const error = await response.json();
          message = error.error || message;
        } catch (_) {
          try {
            const txt = await response.text();
            if (txt) message = txt;
          } catch (_) {}
        }
        alert(`Ödeme hatası: ${message}`);
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

  // Fetch transactions data from backend
  const fetchTransactions = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ISLEMLER);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      } else {
        console.error('Failed to fetch transactions:', response.status);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
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
    fetchTransactions();
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
    loadDeliveries();
    const deliveryInterval = setInterval(loadDeliveries, 3000);

    return () => {
      clearInterval(paymentInterval);
      clearInterval(deliveryInterval);
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
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        width: '100%',
        maxWidth: '100%',
        gap: '1rem',
        flex: 1,
        minWidth: 0
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
                          value={paymentAmounts[payment.transaction_id || payment.id] || ''}
                          onChange={(e) => handlePaymentAmountChange(payment, e.target.value)}
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

        {/* Deliveries */}
        <div style={{ 
          flex: 1, 
          padding: '2rem', 
          backgroundColor: '#2a2a2a',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          border: '1px solid #444',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '600', color: '#fff' }}>Teslimatlar</h2>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Müşteri veya işlem kodu ile ara..."
              value={deliveriesSearch}
              onChange={(e) => setDeliveriesSearch(e.target.value)}
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
              value={deliveriesSort}
              onChange={(e) => setDeliveriesSort(e.target.value)}
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
              <option value="days">Kalan Güne Göre</option>
              <option value="customer">Müşteri Adına Göre</option>
              <option value="ready">Hazır Durumuna Göre</option>
            </select>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', color: '#ccc' }}>
            {(() => {
              const search = deliveriesSearch.toLowerCase();
              let list = deliveries.filter(d =>
                d.musteri.toLowerCase().includes(search) || d.islemKodu.toLowerCase().includes(search)
              );
              if (deliveriesSort === 'days') {
                list.sort((a, b) => (a.kalanGun ?? 9999) - (b.kalanGun ?? 9999));
              } else {
                if (deliveriesSort === 'customer') {
                  list.sort((a, b) => a.musteri.localeCompare(b.musteri));
                } else if (deliveriesSort === 'ready') {
                  list.sort((a, b) => (b.ready === true) - (a.ready === true));
                }
              }
              if (list.length === 0) {
                return <div style={{ textAlign: 'center', color: '#999', fontStyle: 'italic', padding: '2rem' }}>Henüz teslimat bulunmuyor.</div>;
              }
              return list.map((d, idx) => (
                <div key={d.id} style={{
                  backgroundColor: d.ready ? '#1f3a2a' : '#333',
                  border: `1px solid ${d.ready ? '#2f6f46' : '#555'}`,
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '0.75rem'
                }}
                onClick={() => {
                  // Find the sale from transactions based on the transaction code
                  const saleTransaction = transactions.find(t => {
                    const txId = extractTransactionId(t.aciklama, t.id, 'satis');
                    return txId === d.islemKodu && t.islem_tipi === 'satis';
                  });
                  if (saleTransaction) {
                    setSaleDetail({ show: true, sale: saleTransaction });
                  } else {
                    alert(`İşlem Detayı\n\nİşlem Kodu: ${d.islemKodu}\nMüşteri: ${d.musteri}\nTeslim: ${d.teslimGunu}`);
                  }
                }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#4dabf7' }}>{d.musteri}</div>
                      <div style={{ color: '#ccc', fontSize: '0.9rem' }}>{d.islemKodu}</div>
                    </div>
                    <div style={{ color: (d.kalanGun ?? 0) < 0 ? '#ff6b6b' : '#51cf66', fontWeight: '600' }}>
                      {d.kalanGun !== null ? (d.kalanGun >= 0 ? `${d.kalanGun} gün` : `${Math.abs(d.kalanGun)} gün gecikti`) : '-'}
                    </div>
                  </div>
                  <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (!d.ready) markDeliveryReady(d.id); }}
                      style={{
                        padding: '0.35rem 0.7rem',
                        backgroundColor: d.ready ? '#2f6f46' : '#51cf66',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      {d.ready ? 'Hazırlandı' : '✓ Hazır'}
                    </button>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Sale Detail Modal */}
      {saleDetail.show && saleDetail.sale && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000
        }}>
          <div style={{ backgroundColor: '#2a2a2a', color: '#fff', borderRadius: '10px', width: '700px', maxWidth: '95%', padding: '1.25rem' }}>
            {(() => {
              const s = saleDetail.sale;
              const tx = extractTransactionId(s.aciklama, s.id, 'satis');
              const teslim = extractDeliveryDate(s.aciklama);
              const p = buildPaymentDetails(s);
              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, color: '#4dabf7' }}>Satış Detayı — {tx}</h3>
                    <button onClick={() => setSaleDetail({ show: false, sale: null })} style={{ background: 'none', border: '1px solid #555', color: '#fff', borderRadius: '6px', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>Kapat</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ background: '#1a1a1a', border: '1px solid #444', borderRadius: '6px', padding: '0.75rem' }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Ürün</div>
                      <div>Ürün Kodu: {s.urun_kodu}</div>
                      <div>Miktar: {formatNumber(s.miktar)} m</div>
                      <div>Birim Fiyat: {formatNumber(s.birim_fiyat)} ₺</div>
                      <div>Toplam: {formatNumber(s.toplam_tutar)} ₺</div>
                      {teslim && <div>Teslim: {teslim}</div>}
                    </div>
                    <div style={{ background: '#1a1a1a', border: '1px solid #444', borderRadius: '6px', padding: '0.75rem' }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Ödeme Detayı</div>
                      <div>Peşin: {formatNumber(p.pesinAmount)} ₺ ({p.pesinType})</div>
                      <div>Taksit: {formatNumber(p.taksitAmount)} ₺ ({p.taksitType})</div>
                      <div>Taksit Sayısı: {p.taksitCount}</div>
                      <div>Mail Order: {p.isMail ? 'Evet' : 'Hayır'}</div>
                    </div>
                  </div>
                  <SalePhotos saleId={selectedPayment.transaction_id} />
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default HomeScreen; 
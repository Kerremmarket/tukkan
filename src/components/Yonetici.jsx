import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api.js';

function Yonetici({ onBackToHome, onNavigate }) {
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

  const [activeTab, setActiveTab] = useState('acik-borclar');
  
  // State for açık borçlar (loaded from backend)
  const [acikBorclar, setAcikBorclar] = useState([]);

  const [beklenenOdemeler, setBeklenenOdemeler] = useState([]);

  const [calisanlar, setCalisanlar] = useState([]);

  const [yeniCalisan, setYeniCalisan] = useState({ ad: '', telefon: '', pozisyon: '' });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeProfile, setShowEmployeeProfile] = useState(false);
  
  // Search states
  const [acikBorclarSearch, setAcikBorclarSearch] = useState('');
  const [borcSort, setBorcSort] = useState('none'); // 'kalan', 'toplam', 'none'
  const [beklenenOdemelerSearch, setBeklenenOdemelerSearch] = useState('');
  
  // Sorting states
  const [beklenenOdemelerSort, setBeklenenOdemelerSort] = useState('none');
  
  // Sub-tab states
  const [acikBorclarSubTab, setAcikBorclarSubTab] = useState('acik-borclar');
  const [beklenenOdemelerSubTab, setBeklenenOdemelerSubTab] = useState('beklenen-odemeler');
  const [finansallarSubTab, setFinansallarSubTab] = useState('nakit-akisi');
  
  // Özet Tablolar state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Cash flow states
  const [cashFlowYear, setCashFlowYear] = useState(new Date().getFullYear());
  const [cashFlowData, setCashFlowData] = useState([]);
  
  // Business metrics cash flow data (separate from main cash flow)
  const [businessMetricsCashFlowData, setBusinessMetricsCashFlowData] = useState([]);
  
  // Debt management states
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [showDebtManagement, setShowDebtManagement] = useState(false);
  const [plannedPayments, setPlannedPayments] = useState([]);
  const [planSearch, setPlanSearch] = useState('');
  const [planSort, setPlanSort] = useState('none'); // 'kalan', 'toplam', 'none'
  
  // Payment planning form states
  const [newPaymentMonth, setNewPaymentMonth] = useState(new Date().getMonth() + 1);
  const [newPaymentYear, setNewPaymentYear] = useState(new Date().getFullYear());
  const [newPaymentAmount, setNewPaymentAmount] = useState('');

  // Payment input amounts for açık borçlar (separate from backend data)
  const [paymentAmounts, setPaymentAmounts] = useState({});

  // Gündem states
  const [gundemPosts, setGundemPosts] = useState(() => {
    const saved = localStorage.getItem('tukkan-gundem-posts');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImportant, setNewPostImportant] = useState(false);



  // Function to load açık borçlar from backend
  const loadAcikBorclar = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ACIK_BORCLAR);
      if (response.ok) {
        const data = await response.json();
        // Map backend field names to frontend format
        const mappedData = data.map(item => ({
          id: item.id,
          borcSahibi: item.borc_sahibi,
          islemKodu: item.islem_kodu,
          acikBorc: item.acik_borc,
          nagdOdeme: item.nagd_odeme || 0,
          originalBorc: item.original_borc,
          paymentMade: item.payment_made || false
        }));
        setAcikBorclar(mappedData);
      } else {
        console.warn('Backend not available for açık borçlar, using empty list');
        setAcikBorclar([]);
      }
    } catch (error) {
      console.warn('Backend connection failed for açık borçlar:', error);
      setAcikBorclar([]);
    }
  };

  // Load açık borçlar from backend on component mount
  React.useEffect(() => {
    loadAcikBorclar();
  }, []);

  // Reload açık borçlar periodically to catch new purchases
  React.useEffect(() => {
    const interval = setInterval(loadAcikBorclar, 3000); // Reload every 3 seconds
    return () => clearInterval(interval);
  }, []);

  // Load beklenen odemeler from backend on component mount and when time simulation changes
  React.useEffect(() => {
    const loadBeklenenOdemeler = async () => {
          try {
      const response = await fetch(API_ENDPOINTS.BEKLENEN_ODEMELER);
        if (response.ok) {
          const data = await response.json();
          setBeklenenOdemeler(data);
        } else {
          console.warn('Backend not available for beklenen odemeler, using empty list');
          setBeklenenOdemeler([]);
        }
      } catch (error) {
        console.warn('Backend connection failed for beklenen odemeler:', error);
        setBeklenenOdemeler([]);
      }
    };
    
    loadBeklenenOdemeler();
  }, []); // Load once on component mount

  // Employees are now managed in backend, no localStorage needed

  // Load planned payments from backend
  const loadPlannedPayments = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.PLANLANAN_ODEMELER);
      if (response.ok) {
        const data = await response.json();
        setPlannedPayments(data);
      } else {
        console.warn('Backend not available for planned payments, using empty list');
        setPlannedPayments([]);
      }
    } catch (error) {
      console.warn('Backend connection failed for planned payments:', error);
      setPlannedPayments([]);
    }
  };

  React.useEffect(() => {
    loadPlannedPayments();
  }, []);

  React.useEffect(() => {
    localStorage.setItem('tukkan-gundem-posts', JSON.stringify(gundemPosts));
  }, [gundemPosts]);

  // Load employees from backend on component mount
  React.useEffect(() => {
    const loadEmployees = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.CALISANLAR);
        if (response.ok) {
          const employees = await response.json();
          // Map backend field names to frontend field names
          const mappedEmployees = employees.map(emp => ({
            id: emp.id,
            ad: emp.ad,
            telefon: emp.telefon,
            pozisyon: emp.pozisyon,
            baslangicTarihi: emp.baslangic_tarihi,
            sonAy: emp.son_ay || 0,
            son3Ay: emp.son_3_ay || 0,
            son6Ay: emp.son_6_ay || 0,
            son12Ay: emp.son_12_ay || 0
          }));
          setCalisanlar(mappedEmployees);
        } else {
          console.warn('Backend not available, using empty employee list');
          setCalisanlar([]);
        }
      } catch (error) {
        console.warn('Backend connection failed, using empty employee list:', error);
        setCalisanlar([]);
      }
    };
    
    loadEmployees();
  }, []);

  const handleBorcOdeme = async (id, odemeMiktari) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.ACIK_BORCLAR}/${id}/odeme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          odeme_miktari: odemeMiktari
        })
      });

      if (response.ok) {
        // Reload data from backend to get updated state
        loadAcikBorclar();
        // Clear the payment amount input
        setPaymentAmounts(prev => ({
          ...prev,
          [id]: ''
        }));
        alert(`✅ Ödeme başarıyla yapıldı: ₺${odemeMiktari}`);
      } else {
        const error = await response.json();
        alert(`❌ Ödeme hatası: ${error.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('❌ Ödeme sırasında bir hata oluştu');
    }
  };

  const handleBorcUndo = async (id) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.ACIK_BORCLAR}/${id}/undo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        // Reload data from backend to get updated state
        loadAcikBorclar();
        alert('✅ Ödeme geri alındı');
      } else {
        const error = await response.json();
        alert(`❌ Geri alma hatası: ${error.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Undo error:', error);
      alert('❌ Geri alma sırasında bir hata oluştu');
    }
  };

  const handleOdemeGuncelle = (id, odemeMiktari) => {
    setBeklenenOdemeler(prev => prev.map(odeme => 
      odeme && (odeme.id === id || odeme.transaction_id === id)
        ? { ...odeme, odemeMiktari: odemeMiktari }
        : odeme
    ));
  };

  const handleOdemeYap = async (transactionId, odemeMiktari) => {
    if (!odemeMiktari || odemeMiktari <= 0) {
      alert('Lütfen geçerli bir ödeme miktarı girin.');
      return;
    }
    
    try {
      const response = await fetch(`${API_ENDPOINTS.BEKLENEN_ODEMELER}/${transactionId}/odeme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          odeme_miktari: odemeMiktari
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Ödeme başarılı: ₺${result.paid_amount} - Taksit ${result.installment_no}`);
        
        // Reload the data
        const refreshResponse = await fetch(API_ENDPOINTS.BEKLENEN_ODEMELER);
        if (refreshResponse.ok) {
          const refreshedData = await refreshResponse.json();
          setBeklenenOdemeler(refreshedData);
        }
      } else {
        const error = await response.json();
        alert(`Ödeme hatası: ${error.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Ödeme sırasında bir hata oluştu');
    }
  };

  const handleOdemeUndo = async (transactionId) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.BEKLENEN_ODEMELER}/${transactionId}/undo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Ödeme geri alındı: ₺${result.reverted_amount} - Taksit ${result.installment_no}`);
        
        // Reload the data
        const refreshResponse = await fetch(API_ENDPOINTS.BEKLENEN_ODEMELER);
        if (refreshResponse.ok) {
          const refreshedData = await refreshResponse.json();
          setBeklenenOdemeler(refreshedData);
        }
      } else {
        const error = await response.json();
        alert(`Geri alma hatası: ${error.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Undo error:', error);
      alert('Geri alma sırasında bir hata oluştu');
    }
  };

  const handleCalisanEkle = async () => {
    if (yeniCalisan.ad && yeniCalisan.telefon && yeniCalisan.pozisyon) {
      try {
        // Try to save to backend first
        const response = await fetch(API_ENDPOINTS.CALISANLAR, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ad: yeniCalisan.ad,
            telefon: yeniCalisan.telefon,
            pozisyon: yeniCalisan.pozisyon
          })
        });

        if (response.ok) {
          const result = await response.json();
          
          // Update frontend state with backend ID and proper field mapping
          setCalisanlar(prev => [...prev, {
            id: result.id,
            ad: yeniCalisan.ad,
            telefon: yeniCalisan.telefon,
            pozisyon: yeniCalisan.pozisyon,
            baslangicTarihi: new Date().toISOString().split('T')[0],
            sonAy: 0,
            son3Ay: 0,
            son6Ay: 0,
            son12Ay: 0
          }]);
          
          setYeniCalisan({ ad: '', telefon: '', pozisyon: '' });
          alert('Çalışan başarıyla eklendi!');
        } else {
          const error = await response.json();
          alert(`Çalışan eklenirken hata oluştu: ${error.error || 'Bilinmeyen hata'}`);
        }
      } catch (error) {
        console.warn('Backend not available, saving locally only:', error);
        
        // Fallback: save locally if backend is not available
        setCalisanlar(prev => [...prev, {
          id: Date.now(), // Use timestamp as fallback ID
          ad: yeniCalisan.ad,
          telefon: yeniCalisan.telefon,
          pozisyon: yeniCalisan.pozisyon,
          baslangicTarihi: new Date().toISOString().split('T')[0],
          sonAy: 0,
          son3Ay: 0,
          son6Ay: 0,
          son12Ay: 0
        }]);
        
        setYeniCalisan({ ad: '', telefon: '', pozisyon: '' });
        alert('Backend bağlantısı yok - Çalışan geçici olarak yerel kayıt edildi. Backend çalıştırıldığında tekrar ekleyin.');
      }
    } else {
      alert('Lütfen tüm alanları doldurun (Ad, Telefon, Pozisyon)');
    }
  };

  const handleEmployeeDelete = async (id) => {
    if (window.confirm('Bu çalışanı silmek istediğinizden emin misiniz?')) {
          try {
      const response = await fetch(`${API_ENDPOINTS.CALISANLAR}/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setCalisanlar(prev => prev.filter(calisan => calisan.id !== id));
          setShowEmployeeProfile(false);
          setSelectedEmployee(null);
          alert('Çalışan başarıyla silindi!');
        } else {
          const error = await response.json();
          alert(`Çalışan silinirken hata oluştu: ${error.error || 'Bilinmeyen hata'}`);
        }
      } catch (error) {
        console.warn('Backend not available, deleting locally only:', error);
        
        // Fallback: delete locally if backend is not available
        setCalisanlar(prev => prev.filter(calisan => calisan.id !== id));
        setShowEmployeeProfile(false);
        setSelectedEmployee(null);
        alert('Backend bağlantısı yok - Çalışan geçici olarak yerel silindi.');
      }
    }
  };

  const handleEmployeeUpdate = (id, updatedData) => {
    setCalisanlar(prev => prev.map(calisan => 
      calisan.id === id ? { ...calisan, ...updatedData } : calisan
    ));
  };

  // Debt management functions
  const handleAddPlannedPayment = async (debtId, month, year, amount) => {
    try {
      const response = await fetch(API_ENDPOINTS.PLANLANAN_ODEMELER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          debt_id: debtId,
          month,
          year,
          amount
        })
      });

      if (response.ok) {
        // Reload planned payments and cash flow from backend
        loadPlannedPayments();
        loadCashFlowData();
        loadBusinessMetricsCashFlow(); // Also update business metrics
        alert('✅ Planlanan ödeme eklendi ve nakit akışına eklendi');
      } else {
        const error = await response.json();
        alert(`❌ Ödeme planı eklenirken hata: ${error.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Add planned payment error:', error);
      alert('❌ Ödeme planı eklenirken bir hata oluştu');
    }
  };

  const handleConfirmPayment = async (paymentId) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.PLANLANAN_ODEMELER}/${paymentId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        // Reload all data to reflect the changes
        loadPlannedPayments();
        loadAcikBorclar();
        loadCashFlowData();
        loadBusinessMetricsCashFlow(); // Also update business metrics
        alert('✅ Ödeme onaylandı ve nakit akışına eklendi');
      } else {
        const error = await response.json();
        alert(`❌ Ödeme onaylanırken hata: ${error.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Confirm payment error:', error);
      alert('❌ Ödeme onaylanırken bir hata oluştu');
    }
  };

  const handleDeletePlannedPayment = async (paymentId) => {
    if (window.confirm('Bu planlanan ödemeyi silmek istediğinizden emin misiniz?')) {
          try {
      const response = await fetch(`${API_ENDPOINTS.PLANLANAN_ODEMELER}/${paymentId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          // Reload planned payments and cash flow from backend
          loadPlannedPayments();
          loadCashFlowData();
          loadBusinessMetricsCashFlow(); // Also update business metrics
          alert('✅ Planlanan ödeme silindi ve nakit akışından çıkarıldı');
        } else {
          const error = await response.json();
          alert(`❌ Ödeme silinirken hata: ${error.error || 'Bilinmeyen hata'}`);
        }
      } catch (error) {
        console.error('Delete planned payment error:', error);
        alert('❌ Ödeme silinirken bir hata oluştu');
      }
    }
  };

  // Gündem management functions
  const handleAddPost = () => {
    if (newPostTitle.trim() && newPostContent.trim()) {
      const newPost = {
        id: Date.now(),
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        author: 'Yönetici', // This can be made configurable later
        createdAt: new Date().toISOString(),
        isImportant: newPostImportant
      };
      setGundemPosts(prev => [newPost, ...prev]);
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostImportant(false);
    }
  };

  const handleDeletePost = (postId) => {
    if (window.confirm('Bu gönderiyi silmek istediğinizden emin misiniz?')) {
      setGundemPosts(prev => prev.filter(post => post.id !== postId));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Bugün';
    if (diffDays === 2) return 'Dün';
    if (diffDays <= 7) return `${diffDays - 1} gün önce`;
    
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getCurrentMonth = () => new Date().getMonth() + 1;
  const getCurrentYear = () => new Date().getFullYear();

  const getMonthName = (month) => {
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                   'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return months[month - 1];
  };

  const getDaysSinceLastPayment = (lastPaymentDate) => {
    if (!lastPaymentDate) return null;
    const now = new Date();
    const lastPayment = new Date(lastPaymentDate);
    const diffTime = Math.abs(now - lastPayment);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const sortBeklenenOdemeler = (odemeler, sortType) => {
    if (sortType === 'none') return odemeler;
    
    return [...odemeler].sort((a, b) => {
      switch (sortType) {
        case 'lastPayment':
          // Sort by last payment date (oldest first for nakit, kart payments go to end)
          if (a.odemeTipi === 'kart' && b.odemeTipi === 'nakit') return 1;
          if (a.odemeTipi === 'nakit' && b.odemeTipi === 'kart') return -1;
          if (a.odemeTipi === 'kart' && b.odemeTipi === 'kart') return 0;
          
          const daysA = getDaysSinceLastPayment(a.lastPaymentDate) || 0;
          const daysB = getDaysSinceLastPayment(b.lastPaymentDate) || 0;
          return daysB - daysA; // Descending (oldest first)
          
        case 'debtSize':
          // Sort by debt size (largest first)
          return (b.acikOdeme || 0) - (a.acikOdeme || 0);
          
        default:
          return 0;
      }
    });
  };

  const renderAcikBorclar = () => {
    // Filter debts based on search
    const filteredBorclar = acikBorclar.filter(borc => 
      borc.borcSahibi.toLowerCase().includes(acikBorclarSearch.toLowerCase()) ||
      borc.islemKodu.toLowerCase().includes(acikBorclarSearch.toLowerCase())
    );

    // Sorting for açık borçlar (no hooks here to avoid nested hooks issues)
    const sortedBorclar = (() => {
      const list = [...filteredBorclar];
      if (borcSort === 'kalan') {
        list.sort((a, b) => (b.acikBorc || 0) - (a.acikBorc || 0));
      } else if (borcSort === 'toplam') {
        list.sort((a, b) => (b.originalBorc || 0) - (a.originalBorc || 0));
      }
      return list;
    })();

    const renderAcikBorclarContent = () => (
      <div>
        {/* Search Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder="Borç sahibi veya işlem kodu ile ara..."
            value={acikBorclarSearch}
            onChange={(e) => setAcikBorclarSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.8rem',
              fontSize: '1rem',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '8px'
            }}
          />
        </div>

        <div style={{ 
          backgroundColor: '#2a2a2a', 
          borderRadius: '12px', 
          padding: '1.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
        }}>
          {/* Sort controls */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
            <select
              value={borcSort}
              onChange={(e) => setBorcSort(e.target.value)}
              style={{
                padding: '0.5rem',
                fontSize: '0.9rem',
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '8px',
                minWidth: '180px'
              }}
            >
              <option value="none">Sıralama Yok</option>
              <option value="kalan">Kalan Borca Göre</option>
              <option value="toplam">Toplam Borca Göre</option>
            </select>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr 1fr', 
            gap: '1rem',
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            fontWeight: '600'
          }}>
            <div>Borç Sahibi</div>
            <div>İşlem Kodu</div>
            <div>Açık Borç</div>
            <div>İşlemler</div>
          </div>
          {sortedBorclar.map(borc => (
            <div key={borc.id} style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr 1fr', 
              gap: '1rem',
              padding: '1rem',
              borderBottom: '1px solid #404040',
              alignItems: 'center'
            }}>
              <div>{borc.borcSahibi}</div>
              <div 
                style={{ 
                  color: '#4dabf7', 
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
                onClick={() => {
                  setSelectedDebt(borc);
                  setShowDebtManagement(true);
                  // Reset form when opening modal
                  setNewPaymentMonth(getCurrentMonth());
                  setNewPaymentYear(getCurrentYear());
                  setNewPaymentAmount('');
                }}
              >
                {borc.islemKodu}
              </div>
              <div style={{ color: borc.acikBorc > 0 ? '#ff6b6b' : '#51cf66' }}>
                ₺{borc.acikBorc.toLocaleString()}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="Ödeme"
                  value={paymentAmounts[borc.id] || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPaymentAmounts(prev => ({
                      ...prev,
                      [borc.id]: value === '' ? '' : parseInt(value) || 0
                    }));
                  }}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #404040',
                    backgroundColor: '#333',
                    color: '#fff',
                    width: '100px'
                  }}
                />
                <button
                  onClick={() => handleBorcOdeme(borc.id, paymentAmounts[borc.id] || 0)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#51cf66',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Öde
                </button>
                {(borc.acikBorc < borc.originalBorc || borc.paymentMade) && (
                  <button
                    onClick={() => handleBorcUndo(borc.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#ffa502',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Geri Al
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );

    const renderPlannedPaymentsContent = () => {
      const currentMonth = getCurrentMonth();
      const currentYear = getCurrentYear();
      
      // Group planned payments by debt
      const groupedPayments = plannedPayments.reduce((acc, payment) => {
        const debt = acikBorclar.find(b => b.id === payment.debt_id);
        if (debt) {
          if (!acc[payment.debt_id]) {
            acc[payment.debt_id] = {
              debt,
              payments: []
            };
          }
          acc[payment.debt_id].payments.push(payment);
        }
        return acc;
      }, {});

      // Transform to array and apply search/sort (no hooks inside)
      let groups = Object.values(groupedPayments).map(({ debt, payments }) => ({
        debt,
        payments
      }));

      if (planSearch) {
        const s = planSearch.toLowerCase();
        groups = groups.filter(g =>
          g.debt.borcSahibi.toLowerCase().includes(s) ||
          g.debt.islemKodu.toLowerCase().includes(s)
        );
      }

      if (planSort === 'kalan') {
        groups.sort((a, b) => (b.debt.acikBorc || 0) - (a.debt.acikBorc || 0));
      } else if (planSort === 'toplam') {
        groups.sort((a, b) => (b.debt.originalBorc || 0) - (a.debt.originalBorc || 0));
      }

      return (
        <div>
          {/* Search & Sort */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Borç sahibi veya işlem kodu ile ara..."
              value={planSearch}
              onChange={(e) => setPlanSearch(e.target.value)}
              style={{
                flex: 1,
                padding: '0.75rem',
                fontSize: '1rem',
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '8px'
              }}
            />
            <select
              value={planSort}
              onChange={(e) => setPlanSort(e.target.value)}
              style={{
                padding: '0.75rem',
                fontSize: '1rem',
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '8px',
                minWidth: '180px'
              }}
            >
              <option value="none">Sıralama Yok</option>
              <option value="kalan">Kalan Borca Göre</option>
              <option value="toplam">Toplam Borca Göre</option>
            </select>
          </div>

          {groups.length === 0 ? (
            <div style={{ 
              backgroundColor: '#2a2a2a', 
              borderRadius: '12px', 
              padding: '2rem',
              textAlign: 'center',
              color: '#ccc'
            }}>
              <p>Henüz planlanan ödeme bulunmuyor.</p>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Açık Borçlar sekmesinden işlem kodlarına tıklayarak ödeme planı oluşturabilirsiniz.
              </p>
            </div>
          ) : (
            groups.map(({ debt, payments }) => (
              <div key={debt.id} style={{ 
                backgroundColor: '#2a2a2a', 
                borderRadius: '12px', 
                padding: '1.5rem',
                marginBottom: '1.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
              }}>
                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #404040' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#4dabf7', marginBottom: '0.5rem' }}>
                    {debt.borcSahibi} - {debt.islemKodu}
                  </h3>
                  <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', color: '#ccc' }}>
                    <span>Toplam Borç: ₺{debt.originalBorc.toLocaleString()}</span>
                    <span>Kalan Borç: ₺{debt.acikBorc.toLocaleString()}</span>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {payments
                    .sort((a, b) => a.year - b.year || a.month - b.month)
                    .map(payment => {
                      const isDue = payment.month === currentMonth && payment.year === currentYear;
                      const isPast = payment.year < currentYear || (payment.year === currentYear && payment.month < currentMonth);
                      
                      return (
                        <div 
                          key={payment.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.75rem',
                            backgroundColor: payment.status === 'paid' ? '#1a4a1a' : isDue ? '#4a1a1a' : '#333',
                            borderRadius: '4px',
                            border: isDue ? '2px solid #ff6b6b' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', gap: '1rem' }}>
                            <span style={{ minWidth: '100px' }}>{getMonthName(payment.month)} {payment.year}</span>
                            <span style={{ fontWeight: 'bold', minWidth: '120px' }}>₺{payment.amount.toLocaleString()}</span>
                            <span style={{ 
                              color: payment.status === 'paid' ? '#51cf66' : isDue ? '#ff6b6b' : '#ccc',
                              fontStyle: 'italic'
                            }}>
                              {payment.status === 'paid' ? 'Ödendi' : isDue ? 'Vadesi Geldi!' : 'Planlandı'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {payment.status !== 'paid' && (isDue || isPast) && (
                              <button
                                onClick={() => handleConfirmPayment(payment.id)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  backgroundColor: '#51cf66',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.9rem'
                                }}
                              >
                                Ödeme Onayla
                              </button>
                            )}
                            {payment.status !== 'paid' && (
                              <button
                                onClick={() => handleDeletePlannedPayment(payment.id)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  backgroundColor: '#dc3545',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.9rem'
                                }}
                              >
                                Sil
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))
          )}
        </div>
      );
    };

    return (
      <div style={{ padding: '1rem', color: '#fff', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Sub-tab Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '1rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem'
        }}>
          <button
            onClick={() => setAcikBorclarSubTab('acik-borclar')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: acikBorclarSubTab === 'acik-borclar' ? '#4dabf7' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              minWidth: 'fit-content'
            }}
          >
            Açık Borçlar
          </button>
          <button
            onClick={() => setAcikBorclarSubTab('planlanan-odemeler')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: acikBorclarSubTab === 'planlanan-odemeler' ? '#4dabf7' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              minWidth: 'fit-content'
            }}
          >
            Ödemeler
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {acikBorclarSubTab === 'acik-borclar' && renderAcikBorclarContent()}
          {acikBorclarSubTab === 'planlanan-odemeler' && renderPlannedPaymentsContent()}
        </div>
      </div>
    );
  };

  const renderBeklenenOdemeler = () => {
    // Safety check to ensure beklenenOdemeler is an array
    if (!Array.isArray(beklenenOdemeler)) {
      return (
        <div style={{ padding: '1rem', color: '#fff' }}>
          <div style={{ 
            backgroundColor: '#2a2a2a', 
            borderRadius: '12px', 
            padding: '2rem',
            textAlign: 'center',
            color: '#ff6b6b'
          }}>
            <p>Veri yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</p>
          </div>
        </div>
      );
    }

    // Filter payments based on search with error handling
    const filteredOdemeler = beklenenOdemeler.filter(odeme => {
      if (!odeme) return false;
      const musteri = (odeme.musteri || '').toLowerCase();
      const islemKodu = (odeme.islemKodu || '').toLowerCase();
      const searchTerm = beklenenOdemelerSearch.toLowerCase();
      return musteri.includes(searchTerm) || islemKodu.includes(searchTerm);
    });

    // Apply sorting to filtered results
    const sortedOdemeler = sortBeklenenOdemeler(filteredOdemeler, beklenenOdemelerSort);

    const renderBeklenenOdemelerContent = () => (
      <div>
        {/* Search and Sort Controls */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder="Müşteri veya işlem kodu ile ara..."
            value={beklenenOdemelerSearch}
            onChange={(e) => setBeklenenOdemelerSearch(e.target.value)}
            style={{
              flex: 1,
              padding: '0.8rem',
              fontSize: '1rem',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '8px'
            }}
          />
          <select
            value={beklenenOdemelerSort}
            onChange={(e) => setBeklenenOdemelerSort(e.target.value)}
            style={{
              padding: '0.8rem',
              fontSize: '1rem',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '8px',
              minWidth: '200px'
            }}
          >
            <option value="none">Sıralama Yok</option>
            <option value="lastPayment">Son Ödeme Tarihine Göre</option>
            <option value="debtSize">Borç Büyüklüğüne Göre</option>
          </select>
        </div>

        <div style={{ 
          backgroundColor: '#2a2a2a', 
          borderRadius: '12px', 
          padding: '1.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr', 
            gap: '1rem',
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            fontWeight: '600'
          }}>
            <div>Müşteri</div>
            <div>İşlem Kodu</div>
            <div>Açık Ödeme</div>
            <div>Ödeme Tipi</div>
            <div>Taksit Sayısı</div>
            <div>Taksit Miktarı</div>
            <div>Son Ödeme</div>
            <div>İşlemler</div>
          </div>
          {sortedOdemeler.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#ccc',
              fontStyle: 'italic'
            }}>
              {beklenenOdemelerSearch ? 
                'Arama kriterlerine uygun ödeme bulunamadı.' : 
                'Henüz beklenen ödeme bulunmuyor.'
              }
            </div>
          ) : (
            sortedOdemeler.map(odeme => {
              const daysSinceLastPayment = getDaysSinceLastPayment(odeme.last_payment_date || odeme.lastPaymentDate);
              
              return (
                <div key={odeme.transaction_id || odeme.id} style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr', 
                  gap: '1rem',
                  padding: '1rem',
                  borderBottom: '1px solid #404040',
                  alignItems: 'center'
                }}>
                  <div>{odeme.musteri || 'N/A'}</div>
                  <div>{odeme.islem_kodu || odeme.islemKodu || 'N/A'}</div>
                  <div style={{ color: '#4dabf7' }}>₺{(odeme.acik_odeme || odeme.acikOdeme || 0).toLocaleString()}</div>
                  <div style={{ 
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: odeme.odeme_tipi === 'kart' || odeme.odemeTipi === 'kart' ? '#495057' : '#228be6',
                    fontSize: '0.8rem',
                    textAlign: 'center'
                  }}>
                    {(odeme.odeme_tipi === 'kart' || odeme.odemeTipi === 'kart') ? 'Kart' : 'Nakit'}
                  </div>
                  <div style={{ color: '#4dabf7', textAlign: 'center' }}>
                    {odeme.taksit_sayisi || odeme.taksitSayisi || 0}
                  </div>
                  <div style={{ color: '#4dabf7' }}>
                    ₺{(odeme.taksit_miktari || odeme.taksitMiktari || 0).toLocaleString()}
                  </div>
                  <div style={{ 
                    fontSize: '0.9rem',
                    color: (odeme.odeme_tipi === 'nakit' || odeme.odemeTipi === 'nakit') ? 
                      (daysSinceLastPayment > 25 ? '#ff6b6b' : daysSinceLastPayment > 15 ? '#ffa502' : '#51cf66') : 
                      '#666'
                  }}>
                    {(odeme.odeme_tipi === 'nakit' || odeme.odemeTipi === 'nakit') ? 
                      (daysSinceLastPayment ? `${daysSinceLastPayment} gün önce` : 'Hiç ödeme yok') : 
                      '-'
                    }
                  </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {(odeme.odeme_tipi === 'nakit' || odeme.odemeTipi === 'nakit') ? (
                    <>
                      <input
                        type="number"
                        step="1"
                        placeholder="Ödeme"
                        value={odeme.odemeMiktari || ''}
                        onChange={(e) => handleOdemeGuncelle(odeme.transaction_id || odeme.id, e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '4px',
                          border: '1px solid #404040',
                          backgroundColor: '#333',
                          color: '#fff',
                          width: '90px'
                        }}
                      />
                      <button
                        onClick={() => {
                          const paymentAmount = odeme.odemeMiktari || (odeme.taksit_miktari || odeme.taksitMiktari || 0);
                          handleOdemeYap(odeme.transaction_id || odeme.id, paymentAmount);
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#51cf66',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Öde
                      </button>
                    </>
                  ) : (
                    <div style={{ color: '#666', fontSize: '0.8rem', fontStyle: 'italic' }}>
                      Kart ödemesi
                    </div>
                  )}
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>
    );



    return (
      <div style={{ padding: '1rem', color: '#fff', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {renderBeklenenOdemelerContent()}
        </div>
      </div>
    );
  };

  const renderCalisanlar = () => (
    <div style={{ padding: '1rem', color: '#fff' }}>
      {/* Çalışan Listesi */}
      <div style={{ 
        backgroundColor: '#2a2a2a', 
        borderRadius: '12px', 
        padding: '1.5rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        marginBottom: '1rem'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', 
          gap: '1rem',
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          fontWeight: '600'
        }}>
          <div>Çalışan Adı</div>
          <div>Son Ay</div>
          <div>Son 3 Ay</div>
          <div>Son 6 Ay</div>
          <div>Son 12 Ay</div>
        </div>
        {calisanlar && calisanlar.length > 0 ? calisanlar.map(calisan => (
          <div key={calisan.id} style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', 
            gap: '1rem',
            padding: '1rem',
            borderBottom: '1px solid #404040',
            alignItems: 'center'
          }}>
            <div 
              style={{ 
                fontWeight: '500', 
                color: '#4dabf7', 
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
              onClick={() => {
                setSelectedEmployee(calisan);
                setShowEmployeeProfile(true);
              }}
            >
              {calisan.ad || 'İsimsiz'}
            </div>
            <div style={{ color: '#4dabf7' }}>₺{(calisan.sonAy || 0).toLocaleString()}</div>
            <div style={{ color: '#4dabf7' }}>₺{(calisan.son3Ay || 0).toLocaleString()}</div>
            <div style={{ color: '#4dabf7' }}>₺{(calisan.son6Ay || 0).toLocaleString()}</div>
            <div style={{ color: '#4dabf7' }}>₺{(calisan.son12Ay || 0).toLocaleString()}</div>
          </div>
        )) : (
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center', 
            color: '#666',
            fontStyle: 'italic'
          }}>
            Henüz çalışan eklenmemiş. Aşağıdaki formu kullanarak çalışan ekleyebilirsiniz.
          </div>
        )}
      </div>

      {/* Yeni Çalışan Ekleme */}
      <div style={{ 
        backgroundColor: '#2a2a2a', 
        borderRadius: '12px', 
        padding: '1.5rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
      }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.3rem', fontWeight: '600' }}>Yeni Çalışan Ekle</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Çalışan Adı"
            value={yeniCalisan.ad}
            onChange={(e) => setYeniCalisan(prev => ({ ...prev, ad: e.target.value }))}
            style={{
              padding: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #404040',
              backgroundColor: '#333',
              color: '#fff',
              flex: 1
            }}
          />
          <input
            type="text"
            placeholder="Telefon"
            value={yeniCalisan.telefon}
            onChange={(e) => setYeniCalisan(prev => ({ ...prev, telefon: e.target.value }))}
            style={{
              padding: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #404040',
              backgroundColor: '#333',
              color: '#fff',
              flex: 1
            }}
          />
          <input
            type="text"
            placeholder="Pozisyon"
            value={yeniCalisan.pozisyon}
            onChange={(e) => setYeniCalisan(prev => ({ ...prev, pozisyon: e.target.value }))}
            style={{
              padding: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #404040',
              backgroundColor: '#333',
              color: '#fff',
              flex: 1
            }}
          />
          <button
            onClick={handleCalisanEkle}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#51cf66',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Ekle
          </button>
        </div>
      </div>
    </div>
  );

  const renderDebtManagement = () => {
    if (!selectedDebt) return null;

    const debtPayments = plannedPayments.filter(payment => payment.debt_id === selectedDebt.id);
    const currentMonth = getCurrentMonth();
    const currentYear = getCurrentYear();

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000
      }}>
        <div style={{
          backgroundColor: '#2a2a2a',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '800px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          color: '#fff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Borç Yönetimi - {selectedDebt.islemKodu}</h2>
            <button
              onClick={() => setShowDebtManagement(false)}
              style={{
                backgroundColor: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '0.5rem 1rem',
                cursor: 'pointer'
              }}
            >
              Kapat
            </button>
          </div>

          {/* Debt Information */}
          <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#333', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem', color: '#4dabf7' }}>Borç Bilgileri</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><strong>Borç Sahibi:</strong> {selectedDebt.borcSahibi}</div>
              <div><strong>İşlem Kodu:</strong> {selectedDebt.islemKodu}</div>
              <div><strong>Toplam Borç:</strong> ₺{selectedDebt.originalBorc.toLocaleString()}</div>
              <div><strong>Kalan Borç:</strong> ₺{selectedDebt.acikBorc.toLocaleString()}</div>
            </div>
          </div>

          {/* Add New Payment Plan */}
          <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#333', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem', color: '#4dabf7' }}>Yeni Ödeme Planı Ekle</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <select
                value={newPaymentMonth}
                onChange={(e) => setNewPaymentMonth(parseInt(e.target.value))}
                style={{
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #404040',
                  backgroundColor: '#2a2a2a',
                  color: '#fff'
                }}
              >
                {Array.from({length: 12}, (_, i) => (
                  <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Yıl"
                value={newPaymentYear}
                onChange={(e) => setNewPaymentYear(parseInt(e.target.value))}
                style={{
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #404040',
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  width: '100px'
                }}
              />
              <input
                type="number"
                placeholder="Miktar"
                value={newPaymentAmount}
                onChange={(e) => setNewPaymentAmount(e.target.value)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #404040',
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  width: '150px'
                }}
              />
              <button
                onClick={() => {
                  if (newPaymentAmount) {
                    handleAddPlannedPayment(selectedDebt.id, newPaymentMonth, newPaymentYear, parseFloat(newPaymentAmount));
                    setNewPaymentAmount('');
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#51cf66',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Ekle
              </button>
            </div>
          </div>

          {/* Existing Payment Plans */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#4dabf7' }}>Planlanan Ödemeler</h3>
            {debtPayments.length === 0 ? (
              <p style={{ color: '#ccc', fontStyle: 'italic' }}>Henüz planlanan ödeme yok.</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {debtPayments.map(payment => {
                  const isDue = payment.month === currentMonth && payment.year === currentYear;
                  const isPast = payment.year < currentYear || (payment.year === currentYear && payment.month < currentMonth);
                  
                  return (
                    <div 
                      key={payment.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        backgroundColor: payment.status === 'paid' ? '#1a4a1a' : isDue ? '#4a1a1a' : '#333',
                        borderRadius: '4px',
                        border: isDue ? '2px solid #ff6b6b' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <span>{getMonthName(payment.month)} {payment.year}</span>
                        <span style={{ fontWeight: 'bold' }}>₺{payment.amount.toLocaleString()}</span>
                        <span style={{ 
                          color: payment.status === 'paid' ? '#51cf66' : isDue ? '#ff6b6b' : '#ccc',
                          fontStyle: 'italic'
                        }}>
                          {payment.status === 'paid' ? 'Ödendi' : isDue ? 'Vadesi Geldi' : 'Planlandı'}
                        </span>
                      </div>
                      {payment.status !== 'paid' && (isDue || isPast) && (
                        <button
                          onClick={() => handleConfirmPayment(payment.id)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#51cf66',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          Ödeme Onayla
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEmployeeProfile = () => {
    if (!selectedEmployee) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000
      }}>
        <div style={{
          backgroundColor: '#2a2a2a',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          color: '#fff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Çalışan Profili</h2>
            <button
              onClick={() => setShowEmployeeProfile(false)}
              style={{
                backgroundColor: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '0.5rem 1rem',
                cursor: 'pointer'
              }}
            >
              Kapat
            </button>
          </div>

          {/* Employee Information */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#4dabf7' }}>Kişisel Bilgiler</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ minWidth: '120px' }}>Ad Soyad:</label>
                <input
                  type="text"
                  value={selectedEmployee.ad}
                  onChange={(e) => setSelectedEmployee(prev => ({ ...prev, ad: e.target.value }))}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #404040',
                    backgroundColor: '#333',
                    color: '#fff'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ minWidth: '120px' }}>Telefon:</label>
                <input
                  type="text"
                  value={selectedEmployee.telefon}
                  onChange={(e) => setSelectedEmployee(prev => ({ ...prev, telefon: e.target.value }))}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #404040',
                    backgroundColor: '#333',
                    color: '#fff'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ minWidth: '120px' }}>Pozisyon:</label>
                <input
                  type="text"
                  value={selectedEmployee.pozisyon}
                  onChange={(e) => setSelectedEmployee(prev => ({ ...prev, pozisyon: e.target.value }))}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #404040',
                    backgroundColor: '#333',
                    color: '#fff'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ minWidth: '120px' }}>Başlangıç Tarihi:</label>
                <input
                  type="date"
                  value={selectedEmployee.baslangicTarihi}
                  onChange={(e) => setSelectedEmployee(prev => ({ ...prev, baslangicTarihi: e.target.value }))}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #404040',
                    backgroundColor: '#333',
                    color: '#fff'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Sales Statistics */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#4dabf7' }}>Satış İstatistikleri</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ minWidth: '120px' }}>Son Ay:</label>
                <input
                  type="number"
                  value={selectedEmployee.sonAy}
                  onChange={(e) => setSelectedEmployee(prev => ({ ...prev, sonAy: parseInt(e.target.value) || 0 }))}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #404040',
                    backgroundColor: '#333',
                    color: '#fff'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ minWidth: '120px' }}>Son 3 Ay:</label>
                <input
                  type="number"
                  value={selectedEmployee.son3Ay}
                  onChange={(e) => setSelectedEmployee(prev => ({ ...prev, son3Ay: parseInt(e.target.value) || 0 }))}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #404040',
                    backgroundColor: '#333',
                    color: '#fff'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ minWidth: '120px' }}>Son 6 Ay:</label>
                <input
                  type="number"
                  value={selectedEmployee.son6Ay}
                  onChange={(e) => setSelectedEmployee(prev => ({ ...prev, son6Ay: parseInt(e.target.value) || 0 }))}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #404040',
                    backgroundColor: '#333',
                    color: '#fff'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ minWidth: '120px' }}>Son 12 Ay:</label>
                <input
                  type="number"
                  value={selectedEmployee.son12Ay}
                  onChange={(e) => setSelectedEmployee(prev => ({ ...prev, son12Ay: parseInt(e.target.value) || 0 }))}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #404040',
                    backgroundColor: '#333',
                    color: '#fff'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                handleEmployeeUpdate(selectedEmployee.id, selectedEmployee);
                setShowEmployeeProfile(false);
              }}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#51cf66',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Kaydet
            </button>
            <button
              onClick={() => handleEmployeeDelete(selectedEmployee.id)}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Sil
            </button>
          </div>
        </div>
      </div>
    );
  };



  // Add state for transactions and inventory
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);

  // Load transactions and inventory data for financial calculations
  React.useEffect(() => {
    const loadFinancialData = async () => {
      try {
        // Load transactions
        const transactionsResponse = await fetch(API_ENDPOINTS.ISLEMLER);
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          setTransactions(transactionsData);
        }
        
        // Load inventory
        const inventoryResponse = await fetch(API_ENDPOINTS.ENVANTER);
        if (inventoryResponse.ok) {
          const inventoryData = await inventoryResponse.json();
          setInventory(inventoryData);
        }
      } catch (error) {
        console.warn('Could not load financial data:', error);
      }
    };
    
    loadFinancialData();
  }, []);

  // Function to load cash flow data
  const loadCashFlowData = async () => {
    try {
              const response = await fetch(`${API_ENDPOINTS.NAKIT_AKISI}?year=${cashFlowYear}`);
      if (response.ok) {
        const data = await response.json();
        setCashFlowData(data);
      }
    } catch (error) {
      console.error('Cash flow data loading failed:', error);
      // Fallback to empty data
      setCashFlowData(Array.from({ length: 12 }, (_, i) => ({
        ay: i + 1,
        yil: cashFlowYear,
        giris: 0,
        cikis: 0,
        aciklama: `${cashFlowYear} yılı ${i + 1}. ay`
      })));
    }
  };

  // Load cash flow data when year changes
  React.useEffect(() => {
    loadCashFlowData();
  }, [cashFlowYear]);

  // Function to load business metrics cash flow data
  const loadBusinessMetricsCashFlow = async () => {
    try {
              const response = await fetch(`${API_ENDPOINTS.NAKIT_AKISI}?year=${selectedYear}`);
      if (response.ok) {
        const data = await response.json();
        setBusinessMetricsCashFlowData(data);
      }
    } catch (error) {
      console.error('Business metrics cash flow data loading failed:', error);
      // Fallback to empty data
      setBusinessMetricsCashFlowData(Array.from({ length: 12 }, (_, i) => ({
        ay: i + 1,
        yil: selectedYear,
        giris: 0,
        cikis: 0,
        aciklama: `${selectedYear} yılı ${i + 1}. ay`
      })));
    }
  };

  // Load business metrics cash flow data when selectedYear changes
  React.useEffect(() => {
    loadBusinessMetricsCashFlow();
  }, [selectedYear]);

  // Note: Cash flow year (cashFlowYear) is independent from business metrics year (selectedYear)
  // Each section maintains its own year selection to avoid conflicts

  const renderFinansallar = () => {
    // Calculate business metrics
    const calculateBusinessMetrics = (year, month = null) => {
      const salesTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.created_at);
        const transactionYear = transactionDate.getFullYear();
        const transactionMonth = transactionDate.getMonth() + 1;
        
        if (month) {
          return t.islem_tipi === 'satis' && transactionYear === year && transactionMonth === month;
        }
        return t.islem_tipi === 'satis' && transactionYear === year;
      });
      
      const purchaseTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.created_at);
        const transactionYear = transactionDate.getFullYear();
        const transactionMonth = transactionDate.getMonth() + 1;
        
        if (month) {
          return t.islem_tipi === 'alis' && transactionYear === year && transactionMonth === month;
        }
        return t.islem_tipi === 'alis' && transactionYear === year;
      });

      // Calculate profitability directly from işlemler kar column
      let totalProfit = 0;
      let totalSalesRevenue = 0;
      let totalProfitMargin = 0;
      let validProfitTransactions = 0;
      
      salesTransactions.forEach(sale => {
        const saleRevenue = sale.toplam_tutar;
        totalSalesRevenue += saleRevenue;
        
        // Use the kar (profit) data that's already calculated in the işlemler table
        // Note: The kar column contains profit percentage, so we use it directly
        if (sale.kar !== undefined && sale.kar !== null && saleRevenue > 0) {
          const profitMargin = parseFloat(sale.kar) || 0;
          totalProfitMargin += profitMargin;
          validProfitTransactions++;
          
          // Calculate actual profit amount from the profit margin
          const transactionProfit = (saleRevenue * profitMargin) / 100;
          totalProfit += transactionProfit;
        }
      });

      // Average profitability is the average of all transaction profit margins from kar column
      const avgProfitability = validProfitTransactions > 0 ? (totalProfitMargin / validProfitTransactions) : 0;

      // Calculate volumes
      const salesVolume = salesTransactions.reduce((sum, t) => sum + t.miktar, 0);
      const purchaseVolume = purchaseTransactions.reduce((sum, t) => sum + t.miktar, 0);

      return {
        salesCount: salesTransactions.length,
        purchaseCount: purchaseTransactions.length,
        salesVolume,
        purchaseVolume,
        avgProfitability,
        totalSalesRevenue,
        totalProfit,
        salesTransactions // Add this for payment type analysis
      };
    };

    // Calculate payment type breakdown (cash vs card vs mail order)
    const calculatePaymentTypeBreakdown = (year, month = null) => {
      const salesTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.created_at);
        const transactionYear = transactionDate.getFullYear();
        const transactionMonth = transactionDate.getMonth() + 1;
        
        if (month) {
          return t.islem_tipi === 'satis' && transactionYear === year && transactionMonth === month;
        }
        return t.islem_tipi === 'satis' && transactionYear === year;
      });

      let cashTotal = 0;
      let cardTotal = 0;
      let mailOrderTotal = 0;
      let cashCount = 0;
      let cardCount = 0;
      let mailOrderCount = 0;

      salesTransactions.forEach(sale => {
        const pesinAmount = sale.pesin_miktar || 0;
        const taksitAmount = sale.taksit_miktar || 0;
        
        // Check payment types from description for detailed breakdown
        const description = sale.aciklama || '';
        const isTaksitKart = description.includes('Taksit_Odeme_Tipi: kart');
        const isPesinKart = description.includes('Pesin_Odeme_Tipi: kart');
        const isMailOrder = description.includes('Mail_Order: true');
        
        // Determine payment types based on overall payment type and description
        const paymentType = sale.odeme_tipi || 'nakit';
        
        if (isMailOrder) {
          // Mail order transactions
          mailOrderTotal += sale.toplam_tutar;
          mailOrderCount++;
        } else if (paymentType === 'kart' || paymentType === 'kredi') {
          // Full card payment
          cardTotal += sale.toplam_tutar;
          cardCount++;
        } else if (paymentType === 'nakit') {
          // Full cash payment
          cashTotal += sale.toplam_tutar;
          cashCount++;
        } else if (paymentType === 'taksit') {
          // Only installment payment - check if it's kart or nakit
          if (isTaksitKart) {
            cardTotal += sale.toplam_tutar;
            cardCount++;
          } else {
            cashTotal += sale.toplam_tutar;
            cashCount++;
          }
        } else if (paymentType === 'pesin+taksit') {
          // Mixed payment - check individual parts using description
          
          // Handle peşin portion
          if (pesinAmount > 0) {
            if (isPesinKart) {
              cardTotal += pesinAmount;
              cardCount++;
            } else {
              cashTotal += pesinAmount;
              cashCount++;
            }
          }
          
          // Handle taksit portion
          if (taksitAmount > 0) {
            if (isTaksitKart) {
              cardTotal += taksitAmount;
              cardCount++;
            } else {
              cashTotal += taksitAmount;
              cashCount++;
            }
          }
        } else {
          // Default to cash for any other payment types
          cashTotal += sale.toplam_tutar;
          cashCount++;
        }
      });

      return {
        cashTotal,
        cardTotal,
        mailOrderTotal,
        cashCount,
        cardCount,
        mailOrderCount,
        totalAmount: cashTotal + cardTotal + mailOrderTotal,
        totalCount: salesTransactions.length
      };
    };

    const renderNakitAkisiContent = () => {
      
      const months = Array.from({ length: 12 }, (_, i) => i + 1);
      
      // Map cash flow data to monthly breakdown
      const monthlyBreakdown = months.map(month => {
        const monthData = cashFlowData.find(data => data.ay === month) || {
          ay: month,
          yil: cashFlowYear,
          giris: 0,
          cikis: 0,
          aciklama: ''
        };
        
        const netCashFlow = monthData.giris - monthData.cikis;
        
        return {
          month,
          monthName: getMonthName(month),
          plannedPayments: monthData.cikis,
          expectedReceipts: monthData.giris,
          netCashFlow,
          paymentCount: 0 // Will be calculated from actual payment plans if needed
        };
      });

      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Compact Year Navigation */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '0.5rem',
            padding: '0.4rem',
            backgroundColor: '#333',
            borderRadius: '6px',
            flexShrink: 0
          }}>
            <button
              onClick={() => setCashFlowYear(cashFlowYear - 1)}
              style={{
                padding: '0.3rem 0.7rem',
                backgroundColor: '#4dabf7',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              ← {cashFlowYear - 1}
            </button>
            <h3 style={{ margin: 0, color: '#4dabf7', fontSize: '0.9rem' }}>{cashFlowYear} Nakit Akışı</h3>
            <button
              onClick={() => setCashFlowYear(cashFlowYear + 1)}
              style={{
                padding: '0.3rem 0.7rem',
                backgroundColor: '#4dabf7',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              {cashFlowYear + 1} →
            </button>
          </div>

          {/* Nakit Akışı Table */}
          <div style={{ 
            backgroundColor: '#2a2a2a', 
            borderRadius: '6px', 
            overflow: 'hidden'
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr 1fr', 
              gap: '0.65rem',
              padding: '0.75rem',
              backgroundColor: '#1a1a1a',
              fontWeight: '600',
              fontSize: '0.85rem'
            }}>
              <div>Ay</div>
              <div>Giderler</div>
              <div>Gelirler</div>
              <div>Net Akış</div>
            </div>
            
            {monthlyBreakdown.map(({ month, monthName, plannedPayments, expectedReceipts, netCashFlow }) => {
              const isCurrentMonth = month === getCurrentMonth() && cashFlowYear === getCurrentYear();
              
              return (
                <div 
                  key={month}
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr 1fr 1fr', 
                    gap: '0.65rem',
                    padding: '0.55rem 0.75rem',
                    borderBottom: '1px solid #404040',
                    backgroundColor: isCurrentMonth ? '#333' : 'transparent',
                    fontSize: '0.8rem'
                  }}
                >
                  <div style={{ 
                    fontWeight: isCurrentMonth ? 'bold' : 'normal',
                    color: isCurrentMonth ? '#4dabf7' : '#fff'
                  }}>
                    {monthName}
                  </div>
                  <div style={{ color: '#ff6b6b' }}>
                    ₺{plannedPayments.toLocaleString()}
                  </div>
                  <div style={{ color: '#51cf66' }}>
                    ₺{expectedReceipts.toLocaleString()}
                  </div>
                  <div style={{ 
                    color: netCashFlow >= 0 ? '#51cf66' : '#ff6b6b'
                  }}>
                    ₺{netCashFlow.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    const renderOzetTablorContent = () => {
      const currentYear = getCurrentYear();
      const months = Array.from({ length: 12 }, (_, i) => i + 1);
      
      // Get business metrics for current year and selected month
      const yearlyMetrics = calculateBusinessMetrics(selectedYear);
      const monthlyMetrics = calculateBusinessMetrics(selectedYear, selectedMonth);
      
      // Calculate financial data from cash flow data
      const calculateFinancialDataFromCashFlow = (year, month = null) => {
        if (month) {
          // For specific month, get from businessMetricsCashFlowData
          const monthData = businessMetricsCashFlowData.find(data => data.ay === month);
          if (monthData) {
            const ciro = monthData.giris; // Revenue from cash inflow
            const giderler = monthData.cikis; // Expenses from cash outflow
            const kar = ciro - giderler; // Profit = Revenue - Expenses
            return { ciro, giderler, kar };
          }
          return { ciro: 0, giderler: 0, kar: 0 };
        } else {
          // For yearly total, sum all months from businessMetricsCashFlowData
          const ciro = businessMetricsCashFlowData.reduce((sum, data) => sum + data.giris, 0);
          const giderler = businessMetricsCashFlowData.reduce((sum, data) => sum + data.cikis, 0);
          const kar = ciro - giderler;
          return { ciro, giderler, kar };
        }
      };
      
      const monthlyFinancials = calculateFinancialDataFromCashFlow(selectedYear, selectedMonth);
      const yearlyFinancials = calculateFinancialDataFromCashFlow(selectedYear);
      
      // Get payment type breakdowns
      const monthlyPaymentBreakdown = calculatePaymentTypeBreakdown(selectedYear, selectedMonth);
      const yearlyPaymentBreakdown = calculatePaymentTypeBreakdown(selectedYear);

              return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
          {/* Compact Month/Year Selection */}
          <div style={{ 
            display: 'flex', 
            gap: '0.7rem', 
            alignItems: 'center',
            padding: '0.5rem',
            backgroundColor: '#333',
            borderRadius: '6px',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <label style={{ color: '#ccc', fontSize: '0.8rem' }}>Ay:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{
                  padding: '0.3rem',
                  borderRadius: '3px',
                  border: '1px solid #404040',
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  fontSize: '0.75rem'
                }}
              >
                {months.map(month => (
                  <option key={month} value={month}>
                    {getMonthName(month)}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <label style={{ color: '#ccc', fontSize: '0.8rem' }}>Yıl:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{
                  padding: '0.3rem',
                  borderRadius: '3px',
                  border: '1px solid #404040',
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  fontSize: '0.75rem'
                }}
              >
                {Array.from({ length: 10 }, (_, i) => currentYear + i).map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Business Metrics Grid - 5 columns */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', 
            gap: '0.2rem',
            height: 'auto',
            flex: 1,
            overflow: 'hidden'
          }}>
            {/* Monthly Metrics */}
            <div style={{ 
              backgroundColor: '#2a2a2a', 
              borderRadius: '3px', 
              padding: '0.3rem',
              border: '1px solid #4dabf7'
            }}>
              <h4 style={{ color: '#4dabf7', marginBottom: '0.2rem', fontSize: '1.1rem' }}>
                {getMonthName(selectedMonth)} İşlemler
              </h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.1rem' }}>
                {monthlyMetrics.salesCount + monthlyMetrics.purchaseCount}
              </div>
              <div style={{ fontSize: '1rem', color: '#ccc' }}>
                {monthlyMetrics.salesCount} satış, {monthlyMetrics.purchaseCount} alış
              </div>
            </div>

            <div style={{ 
              backgroundColor: '#2a2a2a', 
              borderRadius: '3px', 
              padding: '0.3rem',
              border: '1px solid #51cf66'
            }}>
              <h4 style={{ color: '#51cf66', marginBottom: '0.2rem', fontSize: '1.1rem' }}>
                {getMonthName(selectedMonth)} Hacim
              </h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.1rem' }}>
                {(monthlyMetrics.salesVolume + monthlyMetrics.purchaseVolume).toFixed(1)}m
              </div>
              <div style={{ fontSize: '1rem', color: '#ccc' }}>
                {monthlyMetrics.salesVolume.toFixed(1)}m satış, {monthlyMetrics.purchaseVolume.toFixed(1)}m alış
              </div>
            </div>

            <div style={{ 
              backgroundColor: '#2a2a2a', 
              borderRadius: '3px', 
              padding: '0.3rem',
              border: '1px solid #ffd43b'
            }}>
              <h4 style={{ color: '#ffd43b', marginBottom: '0.2rem', fontSize: '1.1rem' }}>
                {getMonthName(selectedMonth)} Karlılık
              </h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.1rem' }}>
                {monthlyMetrics.avgProfitability.toFixed(1)}%
              </div>
              <div style={{ fontSize: '1rem', color: '#ccc' }}>
                Ortalama kar marjı
              </div>
            </div>

            <div style={{ 
              backgroundColor: '#2a2a2a', 
              borderRadius: '3px', 
              padding: '0.3rem',
              border: '1px solid #ff6b6b'
            }}>
              <h4 style={{ color: '#ff6b6b', marginBottom: '0.2rem', fontSize: '1.1rem' }}>
                {getMonthName(selectedMonth)} Finansal
              </h4>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.1rem' }}>
                ₺{monthlyFinancials.kar.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                Kar: ₺{monthlyFinancials.kar.toLocaleString()}<br/>
                Ciro: ₺{monthlyFinancials.ciro.toLocaleString()}<br/>
                Gider: ₺{monthlyFinancials.giderler.toLocaleString()}
              </div>
            </div>

            {/* Monthly Payment Breakdown */}
            <div style={{ 
              backgroundColor: '#2a2a2a', 
              borderRadius: '3px', 
              padding: '0.3rem',
              border: '1px solid #9c88ff'
            }}>
              <h4 style={{ color: '#9c88ff', marginBottom: '0.2rem', fontSize: '1.1rem' }}>
                {getMonthName(selectedMonth)} Geniş Ciro
              </h4>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.1rem' }}>
                ₺{monthlyPaymentBreakdown.totalAmount.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                Nakit: ₺{monthlyPaymentBreakdown.cashTotal.toLocaleString()} ({monthlyPaymentBreakdown.cashCount})<br/>
                Kart: ₺{monthlyPaymentBreakdown.cardTotal.toLocaleString()} ({monthlyPaymentBreakdown.cardCount})<br/>
                Mail: ₺{monthlyPaymentBreakdown.mailOrderTotal.toLocaleString()} ({monthlyPaymentBreakdown.mailOrderCount})
              </div>
            </div>

            {/* Yearly Metrics */}
            <div style={{ 
              backgroundColor: '#2a2a2a', 
              borderRadius: '3px', 
              padding: '0.3rem',
              border: '1px solid #4dabf7'
            }}>
              <h4 style={{ color: '#4dabf7', marginBottom: '0.2rem', fontSize: '1.1rem' }}>
                {selectedYear} İşlemler
              </h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.1rem' }}>
                {yearlyMetrics.salesCount + yearlyMetrics.purchaseCount}
              </div>
              <div style={{ fontSize: '1rem', color: '#ccc' }}>
                {yearlyMetrics.salesCount} satış, {yearlyMetrics.purchaseCount} alış
              </div>
            </div>

            <div style={{ 
              backgroundColor: '#2a2a2a', 
              borderRadius: '3px', 
              padding: '0.3rem',
              border: '1px solid #51cf66'
            }}>
              <h4 style={{ color: '#51cf66', marginBottom: '0.2rem', fontSize: '1.1rem' }}>
                {selectedYear} Hacim
              </h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.1rem' }}>
                {(yearlyMetrics.salesVolume + yearlyMetrics.purchaseVolume).toFixed(1)}m
              </div>
              <div style={{ fontSize: '1rem', color: '#ccc' }}>
                {yearlyMetrics.salesVolume.toFixed(1)}m satış, {yearlyMetrics.purchaseVolume.toFixed(1)}m alış
              </div>
            </div>

            <div style={{ 
              backgroundColor: '#2a2a2a', 
              borderRadius: '3px', 
              padding: '0.3rem',
              border: '1px solid #ffd43b'
            }}>
              <h4 style={{ color: '#ffd43b', marginBottom: '0.2rem', fontSize: '1.1rem' }}>
                {selectedYear} Karlılık
              </h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.1rem' }}>
                {yearlyMetrics.avgProfitability.toFixed(1)}%
              </div>
              <div style={{ fontSize: '1rem', color: '#ccc' }}>
                Ortalama kar marjı
              </div>
            </div>

            <div style={{ 
              backgroundColor: '#2a2a2a', 
              borderRadius: '3px', 
              padding: '0.3rem',
              border: '1px solid #ff6b6b'
            }}>
              <h4 style={{ color: '#ff6b6b', marginBottom: '0.2rem', fontSize: '1.1rem' }}>
                {selectedYear} Finansal
              </h4>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.1rem' }}>
                ₺{yearlyFinancials.kar.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                Kar: ₺{yearlyFinancials.kar.toLocaleString()}<br/>
                Ciro: ₺{yearlyFinancials.ciro.toLocaleString()}<br/>
                Gider: ₺{yearlyFinancials.giderler.toLocaleString()}
              </div>
            </div>

            {/* Yearly Payment Breakdown */}
            <div style={{ 
              backgroundColor: '#2a2a2a', 
              borderRadius: '3px', 
              padding: '0.3rem',
              border: '1px solid #9c88ff'
            }}>
              <h4 style={{ color: '#9c88ff', marginBottom: '0.2rem', fontSize: '1.1rem' }}>
                {selectedYear} Geniş Ciro
              </h4>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.1rem' }}>
                ₺{yearlyPaymentBreakdown.totalAmount.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                Nakit: ₺{yearlyPaymentBreakdown.cashTotal.toLocaleString()} ({yearlyPaymentBreakdown.cashCount})<br/>
                Kart: ₺{yearlyPaymentBreakdown.cardTotal.toLocaleString()} ({yearlyPaymentBreakdown.cardCount})<br/>
                Mail: ₺{yearlyPaymentBreakdown.mailOrderTotal.toLocaleString()} ({yearlyPaymentBreakdown.mailOrderCount})
              </div>
            </div>
          </div>
      </div>
      );
    };

    return (
      <div style={{ 
        padding: '1rem', 
        color: '#fff', 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Sub-tab Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          marginBottom: '1rem',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <button
            onClick={() => setFinansallarSubTab('nakit-akisi')}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: finansallarSubTab === 'nakit-akisi' ? '#4dabf7' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '500'
            }}
          >
            Nakit Akışı
          </button>
          <button
            onClick={() => setFinansallarSubTab('ozet-tablolar')}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: finansallarSubTab === 'ozet-tablolar' ? '#4dabf7' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '500'
            }}
          >
            İş Metrikleri
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {finansallarSubTab === 'nakit-akisi' && renderNakitAkisiContent()}
          {finansallarSubTab === 'ozet-tablolar' && renderOzetTablorContent()}
        </div>
      </div>
    );
  };

  const renderGundem = () => (
    <div style={{ padding: '1rem', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Add New Post Form */}
      <div style={{ 
        backgroundColor: '#2a2a2a', 
        borderRadius: '12px', 
        padding: '1.5rem',
        marginBottom: '1rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
      }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.3rem', fontWeight: '600', color: '#4dabf7' }}>
          Yeni Gönderi Ekle
        </h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Gönderi başlığı..."
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '0.8rem',
              fontSize: '1rem',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}
          />
          <textarea
            placeholder="Gönderi içeriği..."
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '0.8rem',
              fontSize: '1rem',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '8px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={newPostImportant}
              onChange={(e) => setNewPostImportant(e.target.checked)}
              style={{ marginRight: '0.5rem' }}
            />
            <span style={{ color: '#ffa502' }}>⭐ Önemli gönderi</span>
          </label>
          
          <button
            onClick={handleAddPost}
            disabled={!newPostTitle.trim() || !newPostContent.trim()}
            style={{
              padding: '0.8rem 2rem',
              backgroundColor: (!newPostTitle.trim() || !newPostContent.trim()) ? '#666' : '#51cf66',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: (!newPostTitle.trim() || !newPostContent.trim()) ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            📝 Gönderi Ekle
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.3rem', fontWeight: '600', color: '#4dabf7' }}>
          Mevcut Gönderiler ({gundemPosts.length})
        </h3>
        
        {gundemPosts.length === 0 ? (
          <div style={{ 
            backgroundColor: '#2a2a2a', 
            borderRadius: '12px', 
            padding: '3rem',
            textAlign: 'center',
            color: '#ccc'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
            <p style={{ fontSize: '1.1rem' }}>Henüz hiç gönderi yok.</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Yukarıdaki formu kullanarak ilk gönderinizi ekleyin.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {gundemPosts.map(post => (
              <div 
                key={post.id} 
                style={{ 
                  backgroundColor: '#2a2a2a', 
                  borderRadius: '12px', 
                  padding: '1.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  border: post.isImportant ? '2px solid #ffa502' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {post.isImportant && <span style={{ color: '#ffa502' }}>⭐</span>}
                      <h4 style={{ 
                        fontSize: '1.2rem', 
                        fontWeight: '600', 
                        color: post.isImportant ? '#ffa502' : '#4dabf7',
                        margin: 0
                      }}>
                        {post.title}
                      </h4>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#ccc' }}>
                      <span>👤 {post.author}</span>
                      <span>📅 {formatDate(post.createdAt)}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                    title="Gönderiyi sil"
                  >
                    🗑️
                  </button>
                </div>
                
                <div style={{ 
                  backgroundColor: '#333', 
                  borderRadius: '8px', 
                  padding: '1rem',
                  lineHeight: '1.6'
                }}>
                  {post.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

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
      zIndex: 1000
    }}>
      {/* Left Sidebar - Exactly same as other pages */}
      <div style={{
        width: '280px',
        backgroundColor: '#2a2a2a',
        padding: '1rem',
        paddingBottom: '1.5rem',
        borderRight: '1px solid #444',
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
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '1rem',
                fontSize: '1rem'
              }}>
              🏠 Ana Sayfa
            </button>
          </div>

          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: '#fff' }}>Menü</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <button 
                onClick={() => onNavigate && onNavigate('urun-satis')}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  backgroundColor: '#333',
                  color: '#fff',
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
                    color: '#fff',
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
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '1.3rem'
                }}>- ENVANTER</button>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <button 
                onClick={() => onNavigate && onNavigate('islemler')}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '1.3rem'
                }}>- İŞLEMLER</button>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <button style={{
                width: '100%',
                padding: '0.8rem',
                backgroundColor: '#4CAF50',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '1.3rem'
              }}>- YÖNETİCİ</button>
            </li>
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
            onClick={() => {
              // This will go back to login page
              window.location.reload();
            }}
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

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Navigation Bar */}
        <div style={{
          backgroundColor: '#2a2a2a',
          borderBottom: '1px solid #444',
          padding: '1rem 2rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>


            <button
              onClick={() => setActiveTab('acik-borclar')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: activeTab === 'acik-borclar' ? '#51cf66' : '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
            >
              Açık Borçlar
            </button>
            <button
              onClick={() => setActiveTab('beklenen-odemeler')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: activeTab === 'beklenen-odemeler' ? '#51cf66' : '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
            >
              Beklenen Ödemeler
            </button>
            <button
              onClick={() => setActiveTab('calisanlar')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: activeTab === 'calisanlar' ? '#51cf66' : '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
            >
              Çalışanlar
            </button>
            <button
              onClick={() => setActiveTab('finansallar')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: activeTab === 'finansallar' ? '#51cf66' : '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
            >
              Finansallar
            </button>
            <button
              onClick={() => setActiveTab('gundem')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: activeTab === 'gundem' ? '#51cf66' : '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
            >
              Gündem
            </button>
          </div>



        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'acik-borclar' && renderAcikBorclar()}
          {activeTab === 'beklenen-odemeler' && renderBeklenenOdemeler()}
          {activeTab === 'calisanlar' && renderCalisanlar()}
          {activeTab === 'finansallar' && renderFinansallar()}
          {activeTab === 'gundem' && renderGundem()}
        </div>
      </div>
      
      {/* Employee Profile Modal */}
      {showEmployeeProfile && renderEmployeeProfile()}
      
      {/* Debt Management Modal */}
      {showDebtManagement && renderDebtManagement()}

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

export default Yonetici; 
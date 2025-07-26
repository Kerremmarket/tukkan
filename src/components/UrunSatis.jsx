import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api.js';

function UrunSatis({ onBackToHome, onNavigate, inventoryItems, setInventoryItems }) {
  try {
  // Convert inventory items to products object for easy lookup
  const products = (inventoryItems || []).reduce((acc, item) => {
    acc[item.urunKodu.toLowerCase()] = {
      urunKodu: item.urunKodu,
      fiyat: item.fiyat || 0,
      metreMaliyet: item.metreMaliyet || 0,
      metre: item.metre || 0
    };
    return acc;
  }, {});

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [productCode, setProductCode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [saticiIsmi, setSaticiIsmi] = useState('');
  const [musteriBilgileri, setMusteriBilgileri] = useState('');
  const [notlar, setNotlar] = useState('');
  
  // Payment plan states
  const [paymentType, setPaymentType] = useState('pesin+taksit'); // 'mail-order' or 'pesin+taksit'
  const [taksitSayisi, setTaksitSayisi] = useState('');
  const [pesinKrediKarti, setPesinKrediKarti] = useState(false);
  const [taksitKrediKarti, setTaksitKrediKarti] = useState(false);
  const [pesinMiktar, setPesinMiktar] = useState('');
  const [taksitMiktar, setTaksitMiktar] = useState('');
  const [pesinYuzde, setPesinYuzde] = useState('');
  const [taksitYuzde, setTaksitYuzde] = useState('');

  // State for undo functionality
  const [undoNotification, setUndoNotification] = useState(null);
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

  // Error boundary to catch component errors
  if (!inventoryItems) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        color: '#fff',
        fontSize: '1.2rem'
      }}>
        Envanter yükleniyor...
      </div>
    );
  }

  // Helper function to format numbers with commas
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '';
    return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Get current product data
  const currentProduct = productCode ? products[productCode.toLowerCase()] : null;
  const envanterPrice = currentProduct ? currentProduct.fiyat : null;
  const envanterCost = currentProduct ? currentProduct.metreMaliyet : null;
  const currentEnvanterTotal = envanterPrice && quantity ? envanterPrice * parseFloat(quantity) : null;



  // Undo last transaction function
  const handleUndoLastTransaction = async () => {
    try {
      // Get the most recent transaction
      const response = await fetch(API_ENDPOINTS.ISLEMLER);
      if (!response.ok) {
        throw new Error('İşlemler yüklenemedi');
      }
      
      const allTransactions = await response.json();
      const lastTransaction = allTransactions
        .filter(t => t.islem_tipi === 'satis')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      
      if (!lastTransaction) {
        setUndoNotification({
          type: 'error',
          message: '❌ Geri alınacak satış işlemi bulunamadı.'
        });
        setTimeout(() => setUndoNotification(null), 3000);
        return;
      }
      
      const confirmMessage = `Son satış işlemini geri almak istediğinizden emin misiniz?\n\n` +
        `Ürün: ${lastTransaction.urun_kodu}\n` +
        `Miktar: ${lastTransaction.miktar} m\n` +
        `Tutar: ${formatNumber(lastTransaction.toplam_tutar)} ₺\n` +
        `Müşteri: ${lastTransaction.musteri || 'Belirtilmemiş'}\n` +
        `Tarih: ${new Date(lastTransaction.created_at).toLocaleString('tr-TR')}\n\n` +
        `Bu işlem geri alınamaz!`;
      
      if (!window.confirm(confirmMessage)) return;
      
      // Delete the transaction
      const deleteResponse = await fetch(`${API_ENDPOINTS.ISLEMLER}/${lastTransaction.id}`, {
        method: 'DELETE'
      });
      
      if (!deleteResponse.ok) {
        const error = await deleteResponse.json();
        throw new Error(error.error || 'Satış kaydı silinemedi');
      }
      
      // Show success notification
      setUndoNotification({
        type: 'success',
        message: `✅ Son satış işlemi başarıyla geri alındı!\n\n` +
                `• Ürün: ${lastTransaction.urun_kodu}\n` +
                `• Miktar: ${lastTransaction.miktar} m\n` +
                `• Tutar: ${formatNumber(lastTransaction.toplam_tutar)} ₺\n\n` +
                `Tüm ilgili veriler güncellendi.`
      });
      
      // Refresh inventory from backend
      try {
        const inventoryResponse = await fetch(API_ENDPOINTS.ENVANTER);
        if (inventoryResponse.ok) {
          const data = await inventoryResponse.json();
          const formattedData = data.map(item => ({
            id: item.id,
            urunKodu: item.urun_kodu,
            metre: item.metre,
            metreMaliyet: item.metre_maliyet,
            fiyat: item.fiyat,
            sonIslemTarihi: item.son_islem_tarihi,
            son30GunIslem: item.son_30_gun_islem
          }));
          // Update parent component's inventory
          if (setInventoryItems) {
            setInventoryItems(formattedData);
          }
        }
      } catch (error) {
        console.log('Inventory refresh failed:', error);
      }
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => setUndoNotification(null), 5000);
      
    } catch (error) {
      setUndoNotification({
        type: 'error',
        message: `❌ Hata: ${error.message}`
      });
      setTimeout(() => setUndoNotification(null), 3000);
    }
  };








  const profitMargin = envanterCost && price && quantity ? 
    ((parseFloat(price) - envanterCost) * parseFloat(quantity)) : null;
  const profitPercentage = envanterCost && price ? 
    (((parseFloat(price) - envanterCost) / envanterCost) * 100) : null;

  // Payment calculation helpers
  const totalAmount = orderItems.reduce((sum, item) => sum + item.total, 0);
  
  const updateMiktarFromYuzde = (pesinPercent, taksitPercent) => {
    if (totalAmount > 0) {
      const pesinAmount = (totalAmount * pesinPercent) / 100;
      const taksitAmount = (totalAmount * taksitPercent) / 100;
      setPesinMiktar(pesinAmount.toString());
      setTaksitMiktar(taksitAmount.toString());
    }
  };
  
  const updateYuzdeFromMiktar = (pesinAmount, taksitAmount) => {
    if (totalAmount > 0) {
      const pesinPercent = (pesinAmount / totalAmount) * 100;
      const taksitPercent = (taksitAmount / totalAmount) * 100;
      setPesinYuzde(pesinPercent.toFixed(1));
      setTaksitYuzde(taksitPercent.toFixed(1));
    }
  };

  // Generate authentic transaction ID
  const generateTransactionId = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits of year
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const second = now.getSeconds().toString().padStart(2, '0');
    
    // Format: SAT-YYMMDD-HHMMSS
    return `SAT-${year}${month}${day}-${hour}${minute}${second}`;
  };

  // Check if form is valid (for UI feedback)
  const isFormValid = () => {
    if (orderItems.length === 0) return false;
    if (!saticiIsmi.trim()) return false;
    if (!musteriBilgileri.trim()) return false;
    
    if (paymentType === 'pesin+taksit') {
      if (!pesinMiktar || !taksitMiktar) return false;
      
      const pesinAmount = parseFloat(pesinMiktar) || 0;
      const taksitAmount = parseFloat(taksitMiktar) || 0;
      const totalCheck = pesinAmount + taksitAmount;
      
      // If installment amount is greater than 0, installment count must be at least 2
      if (taksitAmount > 0 && (!taksitSayisi || parseInt(taksitSayisi) < 2)) return false;
      
      if (Math.abs(totalCheck - totalAmount) > 0.01) return false;
    }
    
    if (paymentType === 'mail-order') {
      // For mail-order, no additional validation needed
      return true;
    }
    
    return true;
  };

  // Validation function
  const validateSaleForm = () => {
    if (orderItems.length === 0) {
      alert('Lütfen en az bir ürün ekleyin.');
      return false;
    }

    if (!saticiIsmi.trim()) {
      alert('Lütfen Satıcı İsmi alanını doldurun.');
      return false;
    }

    if (!musteriBilgileri.trim()) {
      alert('Lütfen Müşteri Bilgileri alanını doldurun.');
      return false;
    }

    // Payment plan validation
    if (paymentType === 'pesin+taksit') {
      if (!pesinMiktar || !taksitMiktar) {
        alert('Lütfen Peşin ve Taksit miktarlarını doldurun.');
        return false;
      }
      
      const pesinAmount = parseFloat(pesinMiktar) || 0;
      const taksitAmount = parseFloat(taksitMiktar) || 0;
      
      // If installment amount is greater than 0, installment count must be at least 2
      if (taksitAmount > 0 && (!taksitSayisi || parseInt(taksitSayisi) < 2)) {
        alert('Taksit tutarı 0\'dan büyük olduğunda, taksit sayısı en az 2 olmalıdır.');
        return false;
      }

      const totalCheck = pesinAmount + taksitAmount;
      
      if (Math.abs(totalCheck - totalAmount) > 0.01) {
        alert('Peşin + Taksit toplamı, genel toplam ile eşleşmiyor.');
        return false;
      }
    }

    if (paymentType === 'mail-order') {
      // Mail order validation - no additional checks needed
      return true;
    }

    return true;
  };

  // Handle confirmation
  const handleConfirmSale = async () => {
    if (!validateSaleForm()) {
      return;
    }

    // Validate seller name exists in employee database
    try {
      const response = await fetch(`${API_ENDPOINTS.CALISANLAR}/validate/${encodeURIComponent(saticiIsmi)}`);
      if (!response.ok) {
        alert('Satıcı ismi çalışanlar listesinde bulunamadı!\n\nLütfen önce Yönetici → Çalışanlar sekmesinden çalışanları ekleyin.');
        return;
      }
    } catch (error) {
      console.error('Employee validation error:', error);
      alert('Çalışan doğrulaması sırasında hata oluştu. Lütfen tekrar deneyin.');
      return;
    }

    const transactionId = generateTransactionId();
    let allSalesSuccessful = true;
    let failedSales = [];
    let totalAmountProcessed = 0;

    try {
      // Determine payment type based on checkboxes and amounts
      const determinePaymentType = () => {
        if (paymentType === 'pesin+taksit') {
          const pesinAmount = parseFloat(pesinMiktar) || 0;
          const taksitAmount = parseFloat(taksitMiktar) || 0;
          
          const hasNakit = (pesinAmount > 0 && !pesinKrediKarti) || (taksitAmount > 0 && !taksitKrediKarti);
          const hasKart = (pesinAmount > 0 && pesinKrediKarti) || (taksitAmount > 0 && taksitKrediKarti);
          
          if (hasNakit && hasKart) {
            return 'nakit+kart';
          } else if (hasKart) {
            return 'kart';
          } else {
            return 'nakit';
          }
        } else {
          // For other payment types, default logic
          return pesinKrediKarti || taksitKrediKarti ? 'kart' : 'nakit';
        }
      };

      // Determine payment type based on radio button selection
      const paymentTypeResult = paymentType === 'mail-order' ? 'mail order' : determinePaymentType();

      // Process each order item
      for (const item of orderItems) {
        const itemTotalAmount = item.quantity * item.price;
        const itemPesinAmount = paymentType === 'pesin+taksit' ? 
          (parseFloat(pesinMiktar) || 0) * (itemTotalAmount / totalAmount) : itemTotalAmount;
        const itemTaksitAmount = paymentType === 'pesin+taksit' ? 
          (parseFloat(taksitMiktar) || 0) * (itemTotalAmount / totalAmount) : 0;
        
        const saleData = {
          urun_kodu: item.productCode,
          miktar: item.quantity,
          birim_fiyat: item.price,
          musteri: musteriBilgileri,
          odeme_tipi: paymentTypeResult,
          satici_ismi: saticiIsmi,
          aciklama: `Satış ID: ${transactionId}, Satıcı: ${saticiIsmi}${notlar ? ', Not: ' + notlar : ''}`,
          pesin_miktar: itemPesinAmount,
          taksit_miktar: itemTaksitAmount,
          taksit_sayisi: paymentType === 'pesin+taksit' ? parseInt(taksitSayisi) || 0 : 0,
          // Add specific payment type information for installments
          taksit_odeme_tipi: paymentType === 'pesin+taksit' ? (taksitKrediKarti ? 'kart' : 'nakit') : 'nakit',
          pesin_odeme_tipi: paymentType === 'pesin+taksit' ? (pesinKrediKarti ? 'kart' : 'nakit') : (paymentTypeResult === 'kart' ? 'kart' : 'nakit'),
          // Add mail order flag for tracking
          is_mail_order: paymentType === 'mail-order'
        };

        try {
          const response = await fetch(API_ENDPOINTS.URUN_SATIS, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(saleData)
          });

          if (response.ok) {
            const result = await response.json();
            totalAmountProcessed += result.toplam_tutar;
            console.log(`Sale processed for ${item.productCode}:`, result);
          } else {
            const error = await response.json();
            allSalesSuccessful = false;
            failedSales.push({
              product: item.productCode,
              error: error.error || 'Bilinmeyen hata'
            });
          }
        } catch (error) {
          allSalesSuccessful = false;
          failedSales.push({
            product: item.productCode,
            error: 'Bağlantı hatası: ' + error.message
          });
        }
      }

      // Show results
      if (allSalesSuccessful) {
        alert(`✅ Satış Başarıyla Tamamlandı!\n\nTransaction ID: ${transactionId}\nToplam: ${formatNumber(totalAmountProcessed)} ₺\n\nEnvanter otomatik güncellendi.`);
        
                 // Refresh inventory from backend
         try {
           const inventoryResponse = await fetch(API_ENDPOINTS.ENVANTER);
           if (inventoryResponse.ok) {
             const data = await inventoryResponse.json();
             const formattedData = data.map(item => ({
               id: item.id,
               urunKodu: item.urun_kodu,
               metre: item.metre,
               metreMaliyet: item.metre_maliyet,
               fiyat: item.fiyat,
               sonIslemTarihi: item.son_islem_tarihi,
               son30GunIslem: item.son_30_gun_islem
             }));
             // Update parent component's inventory
             if (setInventoryItems) {
               setInventoryItems(formattedData);
             }
           }
         } catch (error) {
           console.log('Inventory refresh failed:', error);
         }
        
        // Reset form
        setSelectedCustomer('');
        setProductCode('');
        setQuantity('');
        setPrice('');
        setOrderItems([]);
        setSaticiIsmi('');
        setMusteriBilgileri('');
        setNotlar('');
        setPaymentType('pesin+taksit');
        setTaksitSayisi('');
        setPesinKrediKarti(false);
        setTaksitKrediKarti(false);
        setPesinMiktar('');
        setTaksitMiktar('');
        setPesinYuzde('');
        setTaksitYuzde('');
      } else {
        let errorMessage = `❌ Bazı satışlar başarısız oldu!\n\nTransaction ID: ${transactionId}\n\nHatalar:\n`;
        failedSales.forEach(failure => {
          errorMessage += `• ${failure.product}: ${failure.error}\n`;
        });
        errorMessage += `\nBaşarılı olan satışlar kaydedildi.`;
        alert(errorMessage);
      }
    } catch (error) {
      alert(`❌ Satış işlemi sırasında hata oluştu!\n\nHata: ${error.message}\n\nLütfen tekrar deneyin.`);
    }
  };

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
      {/* Left Sidebar */}
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
              <button 
                onClick={() => onNavigate && onNavigate('islemler')}
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
      <div style={{
        flex: 1,
        height: '100vh',
        overflow: 'auto',
        backgroundColor: '#1a1a1a'
      }}>
        <div style={{
          padding: '2rem',
          minHeight: '100%'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem' 
          }}>

            <button 
              onClick={() => {
                try {
                  handleUndoLastTransaction();
                } catch (error) {
                  console.error('Undo button error:', error);
                  alert('Geri alma işlemi sırasında hata oluştu. Lütfen tekrar deneyin.');
                }
              }}
              style={{
                padding: '0.8rem 1.5rem',
                backgroundColor: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
              <span>↶</span>
              <span>SON İŞLEMİ GERİ AL</span>
            </button>
          </div>

          {/* Undo Notification */}
          {undoNotification && (
            <div style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              backgroundColor: undoNotification.type === 'success' ? '#4CAF50' : '#dc3545',
              color: 'white',
              padding: '1rem 1.5rem',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 10000,
              maxWidth: '400px',
              fontSize: '0.9rem',
              lineHeight: '1.4'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ whiteSpace: 'pre-line' }}>
                  {undoNotification.message}
                </div>
                <button
                  onClick={() => setUndoNotification(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    marginLeft: '1rem'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Product Input Section */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem',
            alignItems: 'end'
          }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                ÜRÜN KODU
                {envanterPrice && (
                  <span style={{ fontStyle: 'italic', color: '#ccc', marginLeft: '0.5rem', fontSize: '0.9rem' }}>
                    (Envanter: {formatNumber(envanterPrice)} TL/m)
                  </span>
                )}
              </label>
              <input
                type="text"
                value={productCode}
                onChange={(e) => {
                  const newProductCode = e.target.value;
                  setProductCode(newProductCode);
                  
                  // Auto-populate price with envanter price when product is found
                  const foundProduct = products[newProductCode.toLowerCase()];
                  if (foundProduct && foundProduct.fiyat > 0) {
                    setPrice(foundProduct.fiyat.toString());
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                KAÇ METRE
                {currentEnvanterTotal && (
                  <span style={{ fontStyle: 'italic', color: '#ccc', marginLeft: '0.5rem', fontSize: '0.9rem' }}>
                    (Envanter Total: {formatNumber(currentEnvanterTotal)} TL)
                  </span>
                )}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                SATIŞ FİYAT
                {profitPercentage !== null && (
                  <span style={{ 
                    fontStyle: 'italic', 
                    color: profitPercentage >= 0 ? '#4CAF50' : '#dc3545', 
                    marginLeft: '0.5rem', 
                    fontSize: '0.9rem' 
                  }}>
                    (Kar: {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%)
                  </span>
                )}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '4px'
                }}
              />
            </div>
            <button 
              onClick={() => {
                console.log('Plus button clicked!');
                console.log('Product Code:', productCode);
                console.log('Quantity:', quantity);
                console.log('Price:', price);
                
                // Validation
                if (!productCode || !quantity || !price) {
                  alert('Lütfen tüm alanları doldurun: Ürün Kodu, Kaç Metre, ve Satış Fiyat');
                  return;
                }

                const quantityNum = parseFloat(quantity);
                const priceNum = parseFloat(price);

                if (quantityNum <= 0) {
                  alert('Metre değeri 0\'dan büyük olmalıdır!');
                  return;
                }

                if (priceNum <= 0) {
                  alert('Satış fiyatı 0\'dan büyük olmalıdır!');
                  return;
                }

                const newItem = {
                  id: Date.now(),
                  productCode,
                  quantity: quantityNum,
                  price: priceNum,
                  total: quantityNum * priceNum
                };
                console.log('Adding new item:', newItem);
                setOrderItems([...orderItems, newItem]);
                setProductCode('');
                setQuantity('');
                setPrice('');
                console.log('Item added successfully!');
              }}
              style={{
                padding: '0.8rem 1.2rem',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                minWidth: '50px'
              }}>
              +
            </button>
          </div>

          {/* Order Items Table */}
          {orderItems.length > 0 && (
            <div style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>ÜRÜNLER</h3>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                color: '#fff'
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #555' }}>
                    <th style={{ padding: '0.8rem', textAlign: 'left' }}>Ürün Kodu</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left' }}>Miktar (m)</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left' }}>Fiyat</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left' }}>Toplam</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => (
                    <tr key={item.id}>
                      <td style={{ padding: '0.8rem' }}>{item.productCode}</td>
                      <td style={{ padding: '0.8rem' }}>{formatNumber(item.quantity)}</td>
                      <td style={{ padding: '0.8rem' }}>{formatNumber(item.price)} ₺</td>
                      <td style={{ padding: '0.8rem' }}>{formatNumber(item.total)} ₺</td>
                      <td style={{ padding: '0.8rem' }}>
                        <button
                          onClick={() => {
                            setOrderItems(orderItems.filter(orderItem => orderItem.id !== item.id));
                          }}
                          style={{
                            padding: '0.4rem 0.8rem',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #555', fontWeight: 'bold' }}>
                    <td colSpan={3} style={{ padding: '0.8rem', textAlign: 'right' }}>GENEL TOPLAM:</td>
                    <td style={{ padding: '0.8rem' }}>
                      {formatNumber(orderItems.reduce((sum, item) => sum + item.total, 0))} ₺
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Information Input Section */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>SATICI İSMİ</label>
              <input
                type="text"
                value={saticiIsmi}
                onChange={(e) => setSaticiIsmi(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>MÜŞTERİ BİLGİLERİ</label>
              <input
                type="text"
                value={musteriBilgileri}
                onChange={(e) => setMusteriBilgileri(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>NOTLAR</label>
              <input
                type="text"
                value={notlar}
                onChange={(e) => setNotlar(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          {/* Payment Plan Section */}
          <div style={{
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '2rem'
          }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>ÖDEME PLANI</h2>
            
            {/* Payment Type Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Ödeme Türü:
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="paymentType"
                    value="mail-order"
                    checked={paymentType === 'mail-order'}
                    onChange={(e) => setPaymentType(e.target.value)}
                    style={{ cursor: 'pointer' }}
                  />
                  Mail Order
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="paymentType"
                    value="pesin+taksit"
                    checked={paymentType === 'pesin+taksit'}
                    onChange={(e) => setPaymentType(e.target.value)}
                    style={{ cursor: 'pointer' }}
                  />
                  Peşin + Taksit
                </label>
              </div>
            </div>

            {paymentType === 'mail-order' ? (
              /* Mail Order - Simple confirmation */
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ 
                  padding: '1rem',
                  backgroundColor: '#333',
                  borderRadius: '6px',
                  textAlign: 'center',
                  color: '#4CAF50'
                }}>
                  <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>Mail Order Satışı</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#ccc' }}>
                    Toplam Tutar: ₺{formatNumber(totalAmount)}
                  </p>
                </div>
              </div>
            ) : (
              /* Peşin + Taksit - Full Table */
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                color: '#fff'
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #555' }}>
                    <th style={{ padding: '0.8rem', textAlign: 'left', width: '120px' }}></th>
                    <th style={{ padding: '0.8rem', textAlign: 'left', width: '100px' }}>Kart</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left', width: '120px' }}>Taksit Sayısı</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left', width: '150px' }}>Miktar</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left', width: '100px' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>Peşin</td>
                    <td style={{ padding: '0.8rem' }}>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: parseFloat(pesinMiktar) > 0 ? 'pointer' : 'not-allowed',
                        opacity: parseFloat(pesinMiktar) > 0 ? 1 : 0.5
                      }}>
                        <input
                          type="checkbox"
                          checked={pesinKrediKarti}
                          disabled={parseFloat(pesinMiktar) <= 0}
                          onChange={(e) => setPesinKrediKarti(e.target.checked)}
                          style={{ 
                            cursor: parseFloat(pesinMiktar) > 0 ? 'pointer' : 'not-allowed'
                          }}
                        />
                      </label>
                    </td>
                    <td style={{ padding: '0.8rem' }}>-</td>
                    <td style={{ padding: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={pesinMiktar}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setPesinMiktar(e.target.value);
                            const remaining = totalAmount - value;
                            setTaksitMiktar(remaining.toString());
                            updateYuzdeFromMiktar(value, remaining);
                          }}
                          style={{
                            width: '120px',
                            padding: '0.5rem',
                            backgroundColor: '#333',
                            color: '#fff',
                            border: '1px solid #555',
                            borderRadius: '4px'
                          }}
                        />
                        {pesinMiktar && (
                          <span style={{ fontSize: '0.8rem', color: '#ccc', fontStyle: 'italic' }}>
                            {formatNumber(parseFloat(pesinMiktar))} ₺
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.8rem' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={pesinYuzde}
                        onChange={(e) => {
                          const percent = parseFloat(e.target.value) || 0;
                          setPesinYuzde(e.target.value);
                          const remainingPercent = 100 - percent;
                          setTaksitYuzde(remainingPercent.toString());
                          updateMiktarFromYuzde(percent, remainingPercent);
                        }}
                        style={{
                          width: '80px',
                          padding: '0.5rem',
                          backgroundColor: '#333',
                          color: '#fff',
                          border: '1px solid #555',
                          borderRadius: '4px'
                        }}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>Taksit</td>
                    <td style={{ padding: '0.8rem' }}>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: parseFloat(taksitMiktar) > 0 ? 'pointer' : 'not-allowed',
                        opacity: parseFloat(taksitMiktar) > 0 ? 1 : 0.5
                      }}>
                        <input
                          type="checkbox"
                          checked={taksitKrediKarti}
                          disabled={parseFloat(taksitMiktar) <= 0}
                          onChange={(e) => setTaksitKrediKarti(e.target.checked)}
                          style={{ 
                            cursor: parseFloat(taksitMiktar) > 0 ? 'pointer' : 'not-allowed'
                          }}
                        />
                      </label>
                    </td>
                    <td style={{ padding: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <input
                          type="number"
                          min="2"
                          step="1"
                          value={taksitSayisi}
                          onChange={(e) => setTaksitSayisi(e.target.value)}
                          style={{
                            width: '80px',
                            padding: '0.5rem',
                            backgroundColor: '#333',
                            color: '#fff',
                            border: `1px solid ${
                              parseFloat(taksitMiktar) > 0 && (!taksitSayisi || parseInt(taksitSayisi) < 2) 
                                ? '#ff6b6b' 
                                : '#555'
                            }`,
                            borderRadius: '4px'
                          }}
                        />
                        {taksitSayisi >= 2 && parseFloat(taksitMiktar) > 0 && (
                          <span style={{ fontSize: '0.8rem', color: '#ccc', fontStyle: 'italic' }}>
                            {formatNumber(parseFloat(taksitMiktar) / parseInt(taksitSayisi))} ₺
                          </span>
                        )}
                        {parseFloat(taksitMiktar) > 0 && (!taksitSayisi || parseInt(taksitSayisi) < 2) && (
                          <span style={{ fontSize: '0.7rem', color: '#ff6b6b', fontStyle: 'italic' }}>
                            En az 2 taksit gerekli
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={taksitMiktar}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setTaksitMiktar(e.target.value);
                            const remaining = totalAmount - value;
                            setPesinMiktar(remaining.toString());
                            updateYuzdeFromMiktar(remaining, value);
                          }}
                          style={{
                            width: '120px',
                            padding: '0.5rem',
                            backgroundColor: '#333',
                            color: '#fff',
                            border: '1px solid #555',
                            borderRadius: '4px'
                          }}
                        />
                        {taksitMiktar && (
                          <span style={{ fontSize: '0.8rem', color: '#ccc', fontStyle: 'italic' }}>
                            {formatNumber(parseFloat(taksitMiktar))} ₺
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.8rem' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={taksitYuzde}
                        onChange={(e) => {
                          const percent = parseFloat(e.target.value) || 0;
                          setTaksitYuzde(e.target.value);
                          const remainingPercent = 100 - percent;
                          setPesinYuzde(remainingPercent.toString());
                          updateMiktarFromYuzde(remainingPercent, percent);
                        }}
                        style={{
                          width: '80px',
                          padding: '0.5rem',
                          backgroundColor: '#333',
                          color: '#fff',
                          border: '1px solid #555',
                          borderRadius: '4px'
                        }}
                      />
                    </td>
                  </tr>

                </tbody>
              </table>
            )}
          </div>



          {/* Confirm Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 'auto',
            paddingTop: '2rem'
          }}>
            <button 
              onClick={handleConfirmSale}
              disabled={!isFormValid()}
              style={{
                padding: '1rem 2rem',
                backgroundColor: isFormValid() ? '#4CAF50' : '#666',
                borderRadius: '8px',
                color: 'white',
                border: 'none',
                cursor: isFormValid() ? 'pointer' : 'not-allowed',
                fontSize: '1.1rem',
                fontWeight: '500',
                opacity: isFormValid() ? 1 : 0.6
              }}>
              ONAYLA
            </button>
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
  } catch (error) {
    console.error('UrunSatis component error:', error);
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        color: '#fff',
        fontSize: '1.2rem'
      }}>
        Bir hata oluştu. Lütfen sayfayı yenileyin.
      </div>
    );
  }
}

export default UrunSatis; 
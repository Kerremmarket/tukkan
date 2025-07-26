import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api.js';

function UrunAlis({ onBackToHome, onNavigate, inventoryItems, setInventoryItems }) {
  // Form states
  const [productCode, setProductCode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [aliciIsmi, setAliciIsmi] = useState('');
  const [tedarikcieBilgileri, setTedarikcieBilgileri] = useState('');
  const [notlar, setNotlar] = useState('');
  
  // Payment plan states
  const [pesinMiktar, setPesinMiktar] = useState('');
  const [borcMiktar, setBorcMiktar] = useState('');
  const [pesinYuzde, setPesinYuzde] = useState('');
  const [borcYuzde, setBorcYuzde] = useState('');
  
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

  // Payment calculation helpers
  const totalAmount = orderItems.reduce((sum, item) => sum + item.total, 0);
  
  const updateMiktarFromYuzde = (pesinPercent, borcPercent) => {
    if (totalAmount > 0) {
      const pesinAmount = (totalAmount * pesinPercent) / 100;
      const borcAmount = (totalAmount * borcPercent) / 100;
      setPesinMiktar(pesinAmount.toString());
      setBorcMiktar(borcAmount.toString());
    }
  };
  
  const updateYuzdeFromMiktar = (pesinAmount, borcAmount) => {
    if (totalAmount > 0) {
      const pesinPercent = (pesinAmount / totalAmount) * 100;
      const borcPercent = (borcAmount / totalAmount) * 100;
      setPesinYuzde(pesinPercent.toFixed(1));
      setBorcYuzde(borcPercent.toFixed(1));
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
    
    // Format: ALIS-YYMMDD-HHMMSS
    return `ALIS-${year}${month}${day}-${hour}${minute}${second}`;
  };

  // Check if form is valid (for UI feedback)
  const isFormValid = () => {
    if (orderItems.length === 0) return false;
    if (!aliciIsmi.trim()) return false;
    if (!tedarikcieBilgileri.trim()) return false;
    if (!pesinMiktar || !borcMiktar) return false;
    
    const pesinAmount = parseFloat(pesinMiktar) || 0;
    const borcAmount = parseFloat(borcMiktar) || 0;
    const totalCheck = pesinAmount + borcAmount;
    
    if (Math.abs(totalCheck - totalAmount) > 0.01) return false;
    
    return true;
  };

  // Validation function
  const validatePurchaseForm = () => {
    if (orderItems.length === 0) {
      alert('Lütfen en az bir ürün ekleyin.');
      return false;
    }

    if (!aliciIsmi.trim()) {
      alert('Lütfen Alıcı İsmi alanını doldurun.');
      return false;
    }

    if (!tedarikcieBilgileri.trim()) {
      alert('Lütfen Tedarikçi Bilgileri alanını doldurun.');
      return false;
    }

    // Payment plan validation
    if (!pesinMiktar || !borcMiktar) {
      alert('Lütfen Peşin ve Borç miktarlarını doldurun.');
      return false;
    }

    const pesinAmount = parseFloat(pesinMiktar) || 0;
    const borcAmount = parseFloat(borcMiktar) || 0;
    const totalCheck = pesinAmount + borcAmount;
    
    if (Math.abs(totalCheck - totalAmount) > 0.01) {
      alert('Peşin + Borç toplamı, genel toplam ile eşleşmiyor.');
      return false;
    }

    return true;
  };

  // Handle confirmation
  const handleConfirmPurchase = async () => {
    if (!validatePurchaseForm()) {
      return;
    }

    const transactionId = generateTransactionId();
    let allPurchasesSuccessful = true;
    let failedPurchases = [];
    let totalAmountProcessed = 0;

    try {
      // Process each order item
      for (const item of orderItems) {
        const itemTotalAmount = item.quantity * item.price;
        const itemPesinAmount = (parseFloat(pesinMiktar) || 0) * (itemTotalAmount / totalAmount);
        const itemBorcAmount = (parseFloat(borcMiktar) || 0) * (itemTotalAmount / totalAmount);
        
        const purchaseData = {
          urun_kodu: item.productCode,
          miktar: item.quantity,
          birim_fiyat: item.price,
          alici_ismi: aliciIsmi,
          tedarikci_bilgileri: tedarikcieBilgileri,
          notlar: notlar,
          pesin_miktar: itemPesinAmount,
          borc_miktar: itemBorcAmount,
          transaction_id: transactionId
        };

        try {
          const response = await fetch(API_ENDPOINTS.URUN_ALIS, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(purchaseData)
          });

          if (response.ok) {
            const result = await response.json();
            totalAmountProcessed += result.toplam_tutar;
            console.log(`Purchase processed for ${item.productCode}:`, result);
          } else {
            const error = await response.json();
            allPurchasesSuccessful = false;
            failedPurchases.push({
              product: item.productCode,
              error: error.error || 'Bilinmeyen hata'
            });
          }
        } catch (error) {
          allPurchasesSuccessful = false;
          failedPurchases.push({
            product: item.productCode,
            error: 'Bağlantı hatası: ' + error.message
          });
        }
      }

      // Show results
      if (allPurchasesSuccessful) {
        alert(`✅ Alış Başarıyla Tamamlandı!\n\nTransaction ID: ${transactionId}\nToplam: ${formatNumber(totalAmountProcessed)} ₺\n\nEnvanter otomatik güncellendi.\nFinansal kayıtlar güncellendi.\nBorç takibi başlatıldı.`);
        
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
        setProductCode('');
        setQuantity('');
        setPrice('');
        setOrderItems([]);
        setAliciIsmi('');
        setTedarikcieBilgileri('');
        setNotlar('');
        setPesinMiktar('');
        setBorcMiktar('');
        setPesinYuzde('');
        setBorcYuzde('');
      } else {
        let errorMessage = `❌ Bazı alışlar başarısız oldu!\n\nTransaction ID: ${transactionId}\n\nHatalar:\n`;
        failedPurchases.forEach(failure => {
          errorMessage += `• ${failure.product}: ${failure.error}\n`;
        });
        errorMessage += `\nBaşarılı olan alışlar kaydedildi.`;
        alert(errorMessage);
      }
    } catch (error) {
      alert(`❌ Alış işlemi sırasında hata oluştu!\n\nHata: ${error.message}\n\nLütfen tekrar deneyin.`);
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
              }}>- ÜRÜN ALIŞ</button>
            </li>
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


          {/* Product Entry Section */}
          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '2rem'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>Ürün Bilgileri</h2>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'end', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>ÜRÜN KODU</label>
                <input
                  type="text"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value.toUpperCase())}
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
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>KAÇ METRE</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
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
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>ALIŞ FİYAT</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
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
                  // Validation
                  if (!productCode || !quantity || !price) {
                    alert('Lütfen tüm alanları doldurun: Ürün Kodu, Kaç Metre, ve Alış Fiyat');
                    return;
                  }

                  const quantityNum = parseFloat(quantity);
                  const priceNum = parseFloat(price);

                  if (quantityNum <= 0) {
                    alert('Metre değeri 0\'dan büyük olmalıdır!');
                    return;
                  }

                  if (priceNum <= 0) {
                    alert('Alış fiyatı 0\'dan büyük olmalıdır!');
                    return;
                  }

                  const newItem = {
                    id: Date.now(),
                    productCode,
                    quantity: quantityNum,
                    price: priceNum,
                    total: quantityNum * priceNum
                  };
                  setOrderItems([...orderItems, newItem]);
                  setProductCode('');
                  setQuantity('');
                  setPrice('');
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
          </div>

          {/* Order Items Table */}
          {orderItems.length > 0 && (
            <div style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              marginBottom: '2rem',
              overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: '#dc3545',
                padding: '1rem',
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: '600'
              }}>
                ALIŞ LİSTESİ
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#333' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'white' }}>Ürün Kodu</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'white' }}>Miktar</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'white' }}>Birim Fiyat</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'white' }}>Toplam</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'white' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => (
                    <tr key={item.id} style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #555' }}>
                      <td style={{ padding: '1rem', color: '#fff' }}>{item.productCode}</td>
                      <td style={{ padding: '1rem', color: '#fff' }}>{formatNumber(item.quantity)} m</td>
                      <td style={{ padding: '1rem', color: '#fff' }}>{formatNumber(item.price)} ₺</td>
                      <td style={{ padding: '1rem', color: '#dc3545', fontWeight: 'bold' }}>{formatNumber(item.total)} ₺</td>
                      <td style={{ padding: '1rem' }}>
                        <button 
                          onClick={() => setOrderItems(orderItems.filter(i => i.id !== item.id))}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}>
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#333', borderTop: '2px solid #dc3545' }}>
                    <td colSpan={3} style={{ padding: '1rem', textAlign: 'right', color: 'white', fontWeight: 'bold' }}>
                      GENEL TOPLAM:
                    </td>
                    <td style={{ padding: '1rem', color: '#dc3545', fontWeight: 'bold', fontSize: '1.2rem' }}>
                      {formatNumber(totalAmount)} ₺
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Purchase Details Section */}
          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '2rem'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>Alış Detayları</h2>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>ALICI İSMİ</label>
                <input
                  type="text"
                  value={aliciIsmi}
                  onChange={(e) => setAliciIsmi(e.target.value)}
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
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>TEDARİKÇİ BİLGİLERİ</label>
                <input
                  type="text"
                  value={tedarikcieBilgileri}
                  onChange={(e) => setTedarikcieBilgileri(e.target.value)}
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
          </div>

          {/* Payment Plan Section - Always Visible */}
          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '2rem'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>Ödeme Planı</h2>
            <p style={{ margin: '0 0 1rem 0', color: '#ccc', fontSize: '0.9rem' }}>
              Genel Toplam: {formatNumber(totalAmount)} ₺
            </p>

              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#333' }}>
                <thead>
                  <tr style={{ backgroundColor: '#dc3545' }}>
                    <th style={{ padding: '0.8rem', textAlign: 'left', color: 'white' }}>Ödeme Türü</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left', color: 'white' }}>Miktar (₺)</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left', color: 'white' }}>Yüzde (%)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ backgroundColor: '#2a2a2a' }}>
                    <td style={{ padding: '0.8rem', color: 'white', fontWeight: 'bold' }}>PEŞİN</td>
                    <td style={{ padding: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pesinMiktar}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setPesinMiktar(e.target.value);
                            const remaining = totalAmount - value;
                            setBorcMiktar(remaining.toString());
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
                        step="0.1"
                        value={pesinYuzde}
                        onChange={(e) => {
                          const percent = parseFloat(e.target.value) || 0;
                          setPesinYuzde(e.target.value);
                          const remainingPercent = 100 - percent;
                          setBorcYuzde(remainingPercent.toString());
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
                  <tr style={{ backgroundColor: '#1a1a1a' }}>
                    <td style={{ padding: '0.8rem', color: 'white', fontWeight: 'bold' }}>BORÇ</td>
                    <td style={{ padding: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={borcMiktar}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setBorcMiktar(e.target.value);
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
                        {borcMiktar && (
                          <span style={{ fontSize: '0.8rem', color: '#ccc', fontStyle: 'italic' }}>
                            {formatNumber(parseFloat(borcMiktar))} ₺
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.8rem' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={borcYuzde}
                        onChange={(e) => {
                          const percent = parseFloat(e.target.value) || 0;
                          setBorcYuzde(e.target.value);
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
            </div>

          {/* Confirm Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 'auto',
            paddingTop: '2rem'
          }}>
            <button 
              onClick={handleConfirmPurchase}
              disabled={!isFormValid()}
              style={{
                padding: '1rem 2rem',
                backgroundColor: isFormValid() ? '#dc3545' : '#666',
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
}

export default UrunAlis;
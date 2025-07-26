import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api.js';

function Envanter({ onBackToHome, onNavigate, inventoryItems, setInventoryItems }) {
  // Inventory data is now managed by HomeScreen and passed as props

  // Deleted items for reverse functionality
  const [deletedItems, setDeletedItems] = useState([]);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('urunKodu');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'high-activity', 'low-activity'
  
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

  // Update price function
  const handlePriceUpdate = async (id, newPrice) => {
    const updatedItems = inventoryItems.map(item => 
      item.id === id ? { ...item, fiyat: parseFloat(newPrice) || 0 } : item
    );
    setInventoryItems(updatedItems);

    // Save to backend
    try {
      const item = updatedItems.find(item => item.id === id);
      const response = await fetch(`${API_ENDPOINTS.ENVANTER}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urun_kodu: item.urunKodu,
          metre: item.metre,
          metre_maliyet: item.metreMaliyet,
          fiyat: item.fiyat,
          son_islem_tarihi: item.sonIslemTarihi,
          son_30_gun_islem: item.son30GunIslem
        })
      });

      if (!response.ok) {
        console.error('Failed to update price in backend:', response.status);
      }
    } catch (error) {
      console.error('Error updating price:', error);
    }
  };

  // Reset inventory to original data
  const handleReset = async () => {
    if (window.confirm('Envanteri orijinal haline sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      try {
        const response = await fetch(API_ENDPOINTS.ENVANTER_RESET, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          // Reload inventory data from backend
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
            setInventoryItems(formattedData);
            setDeletedItems([]); // Clear deleted items
            console.log('Inventory reset successfully');
          }
        } else {
          console.error('Failed to reset inventory:', response.status);
        }
      } catch (error) {
        console.error('Error resetting inventory:', error);
      }
    }
  };

  // Delete function
  const handleDelete = async (item) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.ENVANTER}/${item.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setInventoryItems(inventoryItems.filter(invItem => invItem.id !== item.id));
        setDeletedItems([...deletedItems, { ...item, deletedAt: new Date().toISOString() }]);
        console.log('Item deleted from backend:', item);
      } else {
        console.error('Failed to delete item from backend:', response.status);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  // Reverse function - restore last deleted item
  const handleReverse = () => {
    if (deletedItems.length > 0) {
      const lastDeleted = deletedItems[deletedItems.length - 1];
      setInventoryItems([...inventoryItems, lastDeleted]);
      setDeletedItems(deletedItems.slice(0, -1));
    }
  };

  // Sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and search logic
  const getFilteredAndSortedItems = () => {
    let filtered = inventoryItems;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.urunKodu.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply activity filter
    if (filterBy === 'high-activity') {
      filtered = filtered.filter(item => item.son30GunIslem >= 10);
    } else if (filterBy === 'low-activity') {
      filtered = filtered.filter(item => item.son30GunIslem < 5);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle different data types
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  };

  const filteredItems = getFilteredAndSortedItems();

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
          <div style={{ marginBottom: '2rem' }}>

            
            {/* Summary Statistics - Moved to Top */}
            <div style={{
              display: 'flex',
              gap: '2rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
                padding: '1.5rem',
                flex: 1
              }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#4CAF50' }}>Görüntülenen Ürün</h3>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>
                  {filteredItems.length}
                  <span style={{ fontSize: '1rem', color: '#ccc', marginLeft: '0.5rem' }}>
                    / {inventoryItems.length}
                  </span>
                </p>
              </div>
              <div style={{
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
                padding: '1.5rem',
                flex: 1
              }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#FF9800' }}>Toplam Metre</h3>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>
                  {formatNumber(filteredItems.reduce((sum, item) => sum + item.metre, 0))} m
                </p>
              </div>
              <div style={{
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
                padding: '1.5rem',
                flex: 1
              }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#2196F3' }}>Ortalama 30 Gün</h3>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>
                  {filteredItems.length > 0 ? 
                    Math.round(filteredItems.reduce((sum, item) => sum + item.son30GunIslem, 0) / filteredItems.length) 
                    : 0
                  }
                </p>
              </div>
            </div>
            
            {/* Search and Filter Controls */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Search Bar */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  placeholder="Ürün kodu ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    backgroundColor: '#333',
                    color: '#fff',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              {/* Activity Filter */}
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                style={{
                  padding: '0.8rem',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                <option value="all">Tüm Ürünler</option>
                <option value="high-activity">Yüksek Aktivite (10+)</option>
                <option value="low-activity">Düşük Aktivite (&lt;5)</option>
              </select>

              {/* Reverse Button */}
              <button
                onClick={handleReverse}
                disabled={deletedItems.length === 0}
                style={{
                  padding: '0.8rem 1.5rem',
                  backgroundColor: deletedItems.length === 0 ? '#555' : '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: deletedItems.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}>
                ↶ Geri Al ({deletedItems.length})
              </button>

              {/* Reset Button */}
              <button
                onClick={handleReset}
                style={{
                  padding: '0.8rem 1.5rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}>
                🔄 Sıfırla
              </button>
            </div>

            {/* Results Info */}
            <div style={{ marginBottom: '1rem', color: '#ccc', fontSize: '0.9rem' }}>
              {filteredItems.length} ürün gösteriliyor 
              {searchTerm && ` (${inventoryItems.length} toplam)`}
              {filterBy !== 'all' && ` - ${filterBy === 'high-activity' ? 'Yüksek Aktivite' : 'Düşük Aktivite'} filtresi`}
            </div>
          </div>

          {/* Inventory Table */}
          <div style={{
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '2rem'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              color: '#fff'
            }}>
                             <thead>
                 <tr style={{ borderBottom: '2px solid #555' }}>
                   <th 
                     onClick={() => handleSort('urunKodu')}
                     style={{ 
                       padding: '1rem', 
                       textAlign: 'left', 
                       fontSize: '1.1rem', 
                       fontWeight: 'bold',
                       cursor: 'pointer',
                       userSelect: 'none',
                       backgroundColor: sortField === 'urunKodu' ? '#444' : 'transparent'
                     }}>
                     Ürün Kodu {sortField === 'urunKodu' && (sortDirection === 'asc' ? '↑' : '↓')}
                   </th>
                   <th 
                     onClick={() => handleSort('metre')}
                     style={{ 
                       padding: '1rem', 
                       textAlign: 'left', 
                       fontSize: '1.1rem', 
                       fontWeight: 'bold',
                       cursor: 'pointer',
                       userSelect: 'none',
                       backgroundColor: sortField === 'metre' ? '#444' : 'transparent'
                     }}>
                     Metre {sortField === 'metre' && (sortDirection === 'asc' ? '↑' : '↓')}
                   </th>
                   <th 
                     onClick={() => handleSort('metreMaliyet')}
                     style={{ 
                       padding: '1rem', 
                       textAlign: 'left', 
                       fontSize: '1.1rem', 
                       fontWeight: 'bold',
                       cursor: 'pointer',
                       userSelect: 'none',
                       backgroundColor: sortField === 'metreMaliyet' ? '#444' : 'transparent'
                     }}>
                     Metre Maliyet {sortField === 'metreMaliyet' && (sortDirection === 'asc' ? '↑' : '↓')}
                   </th>
                   <th 
                     onClick={() => handleSort('fiyat')}
                     style={{ 
                       padding: '1rem', 
                       textAlign: 'left', 
                       fontSize: '1.1rem', 
                       fontWeight: 'bold',
                       cursor: 'pointer',
                       userSelect: 'none',
                       backgroundColor: sortField === 'fiyat' ? '#444' : 'transparent'
                     }}>
                     Fiyat {sortField === 'fiyat' && (sortDirection === 'asc' ? '↑' : '↓')}
                   </th>
                   <th 
                     onClick={() => handleSort('sonIslemTarihi')}
                     style={{ 
                       padding: '1rem', 
                       textAlign: 'left', 
                       fontSize: '1.1rem', 
                       fontWeight: 'bold',
                       cursor: 'pointer',
                       userSelect: 'none',
                       backgroundColor: sortField === 'sonIslemTarihi' ? '#444' : 'transparent'
                     }}>
                     Son İşlem Tarihi {sortField === 'sonIslemTarihi' && (sortDirection === 'asc' ? '↑' : '↓')}
                   </th>
                   <th 
                     onClick={() => handleSort('son30GunIslem')}
                     style={{ 
                       padding: '1rem', 
                       textAlign: 'left', 
                       fontSize: '1.1rem', 
                       fontWeight: 'bold',
                       cursor: 'pointer',
                       userSelect: 'none',
                       backgroundColor: sortField === 'son30GunIslem' ? '#444' : 'transparent'
                     }}>
                     30 Gün İşlem {sortField === 'son30GunIslem' && (sortDirection === 'asc' ? '↑' : '↓')}
                   </th>
                   <th style={{ padding: '1rem', textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}>İşlem</th>
                 </tr>
               </thead>
                             <tbody>
                 {filteredItems.length === 0 ? (
                   <tr>
                     <td colSpan={7} style={{ 
                       padding: '2rem', 
                       textAlign: 'center', 
                       color: '#ccc',
                       fontStyle: 'italic'
                     }}>
                       {inventoryItems.length === 0 
                         ? "Envanter boş. Silinen öğeler varsa 'Geri Al' butonunu kullanabilirsiniz."
                         : "Arama kriterlerinize uygun ürün bulunamadı."
                       }
                     </td>
                   </tr>
                 ) : (
                   filteredItems.map((item) => (
                     <tr key={item.id} style={{ borderBottom: '1px solid #444' }}>
                       <td style={{ padding: '1rem', fontSize: '1rem', fontWeight: '500' }}>
                         {item.urunKodu}
                       </td>
                       <td style={{ padding: '1rem', fontSize: '1rem' }}>
                         {formatNumber(item.metre)} m
                       </td>
                       <td style={{ padding: '1rem', fontSize: '1rem' }}>
                         {formatNumber(item.metreMaliyet)} ₺/m
                       </td>
                       <td style={{ padding: '1rem', fontSize: '1rem' }}>
                         <input
                           type="number"
                           value={item.fiyat || ''}
                           onChange={(e) => handlePriceUpdate(item.id, e.target.value)}
                           placeholder="Fiyat girin..."
                           style={{
                             width: '120px',
                             padding: '0.5rem',
                             backgroundColor: '#333',
                             color: '#fff',
                             border: '1px solid #555',
                             borderRadius: '4px',
                             fontSize: '0.9rem'
                           }}
                         />
                         <span style={{ marginLeft: '0.5rem', color: '#ccc' }}>₺</span>
                       </td>
                       <td style={{ padding: '1rem', fontSize: '1rem', color: '#ccc' }}>
                         {item.sonIslemTarihi}
                       </td>
                       <td style={{ padding: '1rem', fontSize: '1rem', textAlign: 'center' }}>
                         <span style={{ 
                           backgroundColor: item.son30GunIslem >= 10 ? '#4CAF50' : item.son30GunIslem >= 5 ? '#FF9800' : '#dc3545',
                           color: 'white',
                           padding: '0.3rem 0.8rem',
                           borderRadius: '12px',
                           fontSize: '0.85rem',
                           fontWeight: 'bold'
                         }}>
                           {item.son30GunIslem}
                         </span>
                       </td>
                       <td style={{ padding: '1rem', textAlign: 'center' }}>
                         <button
                           onClick={() => handleDelete(item)}
                           style={{
                             padding: '0.5rem 1rem',
                             backgroundColor: '#dc3545',
                             color: 'white',
                             border: 'none',
                             borderRadius: '4px',
                             cursor: 'pointer',
                             fontSize: '0.9rem',
                             fontWeight: '500'
                           }}
                         >
                           🗑️ Sil
                         </button>
                       </td>
                     </tr>
                   ))
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

export default Envanter; 
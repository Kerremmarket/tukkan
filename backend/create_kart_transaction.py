import sqlite3
from datetime import datetime

def create_kart_transaction():
    conn = sqlite3.connect('tukkan.db')
    cursor = conn.cursor()
    
    print("Creating test transaction with KART installments...")
    
    # Create a payment plan for kart installments
    cursor.execute('''
        INSERT INTO odeme_plani (islem_id, musteri, toplam_tutar, pesin_miktar, taksit_miktar, taksit_sayisi, ay, yil)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (3, 'Kart Müşterisi', 3000.0, 1000.0, 2000.0, 5, 7, 2025))
    
    plan_id = cursor.lastrowid
    print(f"Created payment plan ID: {plan_id}")
    
    # Create installment details
    for i in range(5):
        cursor.execute('''
            INSERT INTO taksit_detaylari (odeme_plani_id, taksit_no, miktar, vade_ay, vade_yil)
            VALUES (?, ?, ?, ?, ?)
        ''', (plan_id, i + 1, 400.0, 7 + i, 2025))
    
    # Create the transaction with KART installments
    cursor.execute('''
        INSERT INTO islemler (id, islem_tipi, urun_kodu, miktar, birim_fiyat, toplam_tutar, musteri, 
                            odeme_tipi, aciklama, pesin_miktar, taksit_miktar, taksit_sayisi, kar, odeme_plani_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        3,
        'satis',
        'LALE',
        10.0,
        300.0,
        3000.0,
        'Kart Müşterisi',
        'kart',  # This is the key - kart payment type
        'Satış ID: SAT-250713-2315, Satıcı: test, Taksit_Odeme_Tipi: kart',  # This should filter it out
        1000.0,
        2000.0,
        5,
        20.0,
        plan_id,
        datetime.now().isoformat()
    ))
    
    print("✅ Created kart transaction")
    
    conn.commit()
    conn.close()
    print("Kart transaction creation complete!")

if __name__ == "__main__":
    create_kart_transaction() 
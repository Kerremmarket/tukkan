import sqlite3
from datetime import datetime

def create_test_transaction():
    conn = sqlite3.connect('tukkan.db')
    cursor = conn.cursor()
    
    print("Creating test transaction with installments...")
    
    # First, let's see what payment plans exist
    cursor.execute('SELECT * FROM odeme_plani')
    plans = cursor.fetchall()
    print(f"Found {len(plans)} payment plans")
    for plan in plans:
        print(f"  Plan ID: {plan[0]}, Transaction ID: {plan[1]}, Customer: {plan[2]}")
    
    # Create a test transaction that matches the existing payment plan
    if plans:
        plan = plans[0]  # Use the first payment plan
        plan_id = plan[0]
        expected_transaction_id = plan[1]
        customer = plan[2]
        total_amount = plan[3]
        pesin_amount = plan[4]
        taksit_amount = plan[5]
        taksit_count = plan[6]
        
        print(f"\nCreating transaction ID {expected_transaction_id} for payment plan {plan_id}")
        
        # Create the transaction
        cursor.execute('''
            INSERT INTO islemler (id, islem_tipi, urun_kodu, miktar, birim_fiyat, toplam_tutar, musteri, 
                                odeme_tipi, aciklama, pesin_miktar, taksit_miktar, taksit_sayisi, kar, odeme_plani_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            expected_transaction_id,
            'satis',
            'ZAMBAK',
            11.5,  # Example quantity
            452.17,  # Example price to get the total amount
            total_amount,
            customer,
            'nakit',  # Use nakit so it shows up in beklenen ödemeler
            f'Satış ID: SAT-250713-2314, Satıcı: test, Taksit_Odeme_Tipi: nakit',
            pesin_amount,
            taksit_amount,
            taksit_count,
            15.5,  # Example profit margin
            plan_id,
            datetime.now().isoformat()
        ))
        
        print(f"✅ Created transaction ID {expected_transaction_id}")
        
        # Verify the transaction was created
        cursor.execute('SELECT * FROM islemler WHERE id = ?', (expected_transaction_id,))
        transaction = cursor.fetchone()
        if transaction:
            print(f"✅ Transaction verified: {transaction}")
        else:
            print("❌ Transaction not found after creation")
    else:
        print("No payment plans found to create transaction for")
    
    conn.commit()
    conn.close()
    print("\nTest transaction creation complete!")

if __name__ == "__main__":
    create_test_transaction() 
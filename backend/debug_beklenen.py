import sqlite3
import json

def debug_beklenen_odemeler():
    conn = sqlite3.connect('tukkan.db')
    cursor = conn.cursor()
    
    print("=== DEBUGGING BEKLENEN ÖDEMELER ===\n")
    
    # Check table structures
    print("1. TABLE STRUCTURES:")
    tables = ['islemler', 'odeme_plani', 'taksit_detaylari']
    for table in tables:
        cursor.execute(f'PRAGMA table_info({table})')
        columns = cursor.fetchall()
        print(f"\n{table.upper()} TABLE:")
        for col in columns:
            print(f"  {col[1]} ({col[2]})")
    
    # Check row counts
    print("\n2. ROW COUNTS:")
    for table in tables:
        cursor.execute(f'SELECT COUNT(*) FROM {table}')
        count = cursor.fetchone()[0]
        print(f"  {table}: {count} rows")
    
    # Check all transactions
    print("\n3. ALL TRANSACTIONS:")
    cursor.execute('SELECT * FROM islemler ORDER BY id')
    transactions = cursor.fetchall()
    if transactions:
        for row in transactions:
            print(f"  ID: {row[0]}, Type: {row[1]}, Customer: {row[5]}, Payment Type: {row[6]}")
            print(f"    Description: {row[7]}")
            print(f"    Installment Amount: {row[9]}, Installment Count: {row[10]}")
            print(f"    Payment Plan ID: {row[12]}")
            print()
    else:
        print("  No transactions found")
    
    # Check payment plans
    print("\n4. PAYMENT PLANS:")
    cursor.execute('SELECT * FROM odeme_plani')
    plans = cursor.fetchall()
    if plans:
        for row in plans:
            print(f"  ID: {row[0]}, Transaction ID: {row[1]}, Customer: {row[2]}")
            print(f"    Total: {row[3]}, Down Payment: {row[4]}, Installment: {row[5]}")
            print(f"    Installment Count: {row[6]}, Month: {row[7]}, Year: {row[8]}")
            print()
    else:
        print("  No payment plans found")
    
    # Check installment details
    print("\n5. INSTALLMENT DETAILS:")
    cursor.execute('SELECT * FROM taksit_detaylari ORDER BY odeme_plani_id, taksit_no')
    details = cursor.fetchall()
    if details:
        for row in details:
            print(f"  Plan ID: {row[1]}, Installment: {row[2]}, Amount: {row[3]}")
            print(f"    Due: {row[4]}/{row[5]}, Paid: {row[6]}, Payment Date: {row[7]}")
    else:
        print("  No installment details found")
    
    # Now run the actual beklenen_odemeler query
    print("\n6. BEKLENEN ÖDEMELER QUERY RESULT:")
    cursor.execute('''
        SELECT 
            i.id as transaction_id,
            i.musteri,
            CASE 
                WHEN i.aciklama LIKE '%Satış ID: SAT-%' THEN 
                    SUBSTR(i.aciklama, INSTR(i.aciklama, 'Satış ID: ') + 10, 15)
                ELSE 'SAT-' || i.id
            END as islem_kodu,
            i.taksit_miktar as acik_odeme,
            CASE 
                WHEN i.aciklama LIKE '%Taksit_Odeme_Tipi: kart%' THEN 'kart'
                ELSE 'nakit'
            END as odeme_tipi,
            i.taksit_sayisi,
            CASE WHEN i.taksit_sayisi > 0 THEN i.taksit_miktar / i.taksit_sayisi ELSE 0 END as taksit_miktari,
            i.created_at,
            op.id as odeme_plani_id,
            i.created_at as last_payment_date
        FROM islemler i
        LEFT JOIN odeme_plani op ON i.odeme_plani_id = op.id
        WHERE i.islem_tipi = 'satis' 
        AND i.taksit_miktar > 0
        AND op.id IS NOT NULL
        AND (i.aciklama NOT LIKE '%Taksit_Odeme_Tipi: kart%' OR i.aciklama IS NULL)
        ORDER BY i.created_at DESC
    ''')
    
    results = cursor.fetchall()
    if results:
        print(f"  Found {len(results)} results:")
        for row in results:
            print(f"    Transaction ID: {row[0]}, Customer: {row[1]}, Payment Type: {row[4]}")
            print(f"    Description contains 'kart': {'kart' in (row[1] or '')}")
    else:
        print("  No results from beklenen_odemeler query")
    
    # Alternative query to find transactions with payment plans
    print("\n7. ALTERNATIVE QUERY - TRANSACTIONS WITH PAYMENT PLANS:")
    cursor.execute('''
        SELECT i.*, op.* 
        FROM islemler i 
        JOIN odeme_plani op ON i.odeme_plani_id = op.id 
        WHERE i.islem_tipi = 'satis'
    ''')
    
    alt_results = cursor.fetchall()
    if alt_results:
        print(f"  Found {len(alt_results)} transactions with payment plans:")
        for row in alt_results:
            print(f"    Transaction ID: {row[0]}, Customer: {row[5]}, Payment Type: {row[6]}")
            print(f"    Description: {row[7]}")
            print(f"    Installment Amount: {row[9]}, Count: {row[10]}")
            print(f"    Payment Plan Customer: {row[15]}")
            print()
    else:
        print("  No transactions with payment plans found")
    
    conn.close()

if __name__ == "__main__":
    debug_beklenen_odemeler() 
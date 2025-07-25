from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime, timedelta
import json

# Set up Flask to serve static files from the dist directory
static_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'dist')
app = Flask(__name__, static_folder=static_folder, static_url_path='')
CORS(app)  # Enable CORS for React frontend

# Database configuration
DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'tukkan.db')

def init_db():
    """Initialize the database with all required tables"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Açık Borçlar table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS acik_borclar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            borc_sahibi TEXT NOT NULL,
            islem_kodu TEXT NOT NULL,
            acik_borc REAL NOT NULL,
            nagd_odeme REAL DEFAULT 0,
            original_borc REAL NOT NULL,
            payment_made BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('yönetici', 'çalışan')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Add default admin user if not exists
    cursor.execute('SELECT COUNT(*) FROM users WHERE username = ?', ('Oh No!',))
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO users (username, password, role) 
            VALUES (?, ?, ?)
        ''', ('Oh No!', 'temmuz31201', 'yönetici'))
    
    # Beklenen Ödemeler table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS beklenen_odemeler (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            musteri TEXT NOT NULL,
            islem_kodu TEXT NOT NULL,
            acik_odeme REAL NOT NULL,
            odeme_tipi TEXT NOT NULL CHECK(odeme_tipi IN ('nakit', 'kart')),
            taksit_sayisi INTEGER DEFAULT 0,
            taksit_miktari REAL DEFAULT 0,
            odeme_miktari REAL DEFAULT 0,
            original_odeme REAL NOT NULL,
            payment_made BOOLEAN DEFAULT FALSE,
            last_payment_date TIMESTAMP,
            previous_last_payment_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Add new columns to existing table if they don't exist
    try:
        cursor.execute('ALTER TABLE beklenen_odemeler ADD COLUMN taksit_sayisi INTEGER DEFAULT 0')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        cursor.execute('ALTER TABLE beklenen_odemeler ADD COLUMN taksit_miktari REAL DEFAULT 0')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    # Çalışanlar table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS calisanlar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ad TEXT NOT NULL,
            telefon TEXT,
            pozisyon TEXT,
            baslangic_tarihi DATE,
            son_ay REAL DEFAULT 0,
            son_3_ay REAL DEFAULT 0,
            son_6_ay REAL DEFAULT 0,
            son_12_ay REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Planlanan Ödemeler table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS planlanan_odemeler (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            debt_id INTEGER NOT NULL,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'due', 'paid')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (debt_id) REFERENCES acik_borclar (id)
        )
    ''')
    
    # Gündem Posts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS gundem_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            author TEXT DEFAULT 'Yönetici',
            is_important BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Envanter table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS envanter (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            urun_kodu TEXT NOT NULL UNIQUE,
            metre REAL NOT NULL,
            metre_maliyet REAL NOT NULL,
            fiyat REAL DEFAULT 0,
            son_islem_tarihi TEXT,
            son_30_gun_islem INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create işlemler table with updated constraints
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS islemler (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            islem_tipi TEXT NOT NULL CHECK(islem_tipi IN ('satis', 'alis')),
            urun_kodu TEXT NOT NULL,
            miktar REAL NOT NULL,
            birim_fiyat REAL NOT NULL,
            toplam_tutar REAL NOT NULL,
            musteri TEXT,
            odeme_tipi TEXT CHECK(odeme_tipi IN ('nakit', 'kart', 'kredi', 'nakit+kart', 'mail order', 'pesin+taksit', 'taksit')),
            aciklama TEXT,
            pesin_miktar REAL DEFAULT 0,
            taksit_miktar REAL DEFAULT 0,
            taksit_sayisi INTEGER DEFAULT 0,
            kar REAL DEFAULT 0,
            odeme_plani_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (urun_kodu) REFERENCES envanter (urun_kodu),
            FOREIGN KEY (odeme_plani_id) REFERENCES odeme_plani (id)
        )
    ''')
    
    # Nakit Akışı table - Monthly cash flows
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS nakit_akisi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ay INTEGER NOT NULL,
            yil INTEGER NOT NULL,
            giris REAL DEFAULT 0,
            cikis REAL DEFAULT 0,
            aciklama TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(ay, yil)
        )
    ''')
    
    # Ödeme Planı table - Payment plans and installments
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS odeme_plani (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            islem_id INTEGER NOT NULL,
            musteri TEXT NOT NULL,
            toplam_tutar REAL NOT NULL,
            pesin_miktar REAL DEFAULT 0,
            taksit_miktar REAL DEFAULT 0,
            taksit_sayisi INTEGER DEFAULT 0,
            ay INTEGER NOT NULL,
            yil INTEGER NOT NULL,
            durum TEXT DEFAULT 'aktif' CHECK(durum IN ('aktif', 'tamamlandi', 'iptal')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (islem_id) REFERENCES islemler (id)
        )
    ''')
    
    # Taksit Detayları table - Individual installment details
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS taksit_detaylari (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            odeme_plani_id INTEGER NOT NULL,
            taksit_no INTEGER NOT NULL,
            miktar REAL NOT NULL,
            vade_ay INTEGER NOT NULL,
            vade_yil INTEGER NOT NULL,
            odendi BOOLEAN DEFAULT FALSE,
            odeme_tarihi TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (odeme_plani_id) REFERENCES odeme_plani (id)
        )
    ''')
    
    # Insert sample data if tables are empty
    cursor.execute('SELECT COUNT(*) FROM acik_borclar')
    if cursor.fetchone()[0] == 0:
        # No sample data - start with empty database
        pass
    
    cursor.execute('SELECT COUNT(*) FROM beklenen_odemeler')
    if cursor.fetchone()[0] == 0:
        sample_beklenen_odemeler = [
            ('Mehmet Yılmaz', 'ISL004', 1200, 'nakit', 0, 1200, False, (datetime.now() - timedelta(days=6)).isoformat(), None),
            ('Ayşe Özkan', 'ISL005', 950, 'kart', 950, 950, False, None, None),
            ('Hasan Çelik', 'ISL006', 1750, 'nakit', 0, 1750, False, (datetime.now() - timedelta(days=13)).isoformat(), None),
            ('Fatma Demir', 'ISL007', 2300, 'nakit', 0, 2300, False, (datetime.now() - timedelta(days=35)).isoformat(), None),
            ('Ali Kaya', 'ISL008', 1850, 'kart', 1850, 1850, False, None, None)
        ]
        cursor.executemany('''
            INSERT INTO beklenen_odemeler (musteri, islem_kodu, acik_odeme, odeme_tipi, odeme_miktari, original_odeme, payment_made, last_payment_date, previous_last_payment_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', sample_beklenen_odemeler)
    
    # No sample data for calisanlar - users will create employees from the frontend
    
    cursor.execute('SELECT COUNT(*) FROM gundem_posts')
    if cursor.fetchone()[0] == 0:
        sample_posts = [
            ('Yeni Ürün Kampanyası', 'Bu hafta tüm elektronik ürünlerde %20 indirim! Kampanya 15 Ocak\'a kadar geçerli.', 'Yönetici', True),
            ('Çalışma Saatleri Güncellendi', 'Yeni çalışma saatlerimiz: Pazartesi-Cumartesi 09:00-19:00, Pazar 10:00-17:00', 'Yönetici', False)
        ]
        cursor.executemany('''
            INSERT INTO gundem_posts (title, content, author, is_important)
            VALUES (?, ?, ?, ?)
        ''', sample_posts)
    
    cursor.execute('SELECT COUNT(*) FROM envanter')
    if cursor.fetchone()[0] == 0:
        sample_envanter = [
            ('ZAMBAK', 52.34, 120.50, 435.00, '2025-07-08 14:22', 5),
            ('GÜL', 75.20, 98.30, 520.75, '2025-07-05 09:10', 8),
            ('LALE', 40.10, 210.00, 350.00, '2025-07-03 18:45', 3),
            ('MENEKŞE', 62.80, 150.75, 600.20, '2025-07-09 11:05', 7),
            ('NERGİS', 30.55, 175.40, 275.60, '2025-06-30 16:30', 2),
            ('SÜMBÜL', 85.00, 250.00, 725.10, '2025-07-06 12:55', 10),
            ('KARANFİL', 58.90, 140.20, 490.45, '2025-07-01 08:20', 6),
            ('YASEMİN', 70.25, 190.80, 580.00, '2025-07-04 20:10', 4),
            ('BEGONYA', 45.60, 160.90, 410.30, '2025-07-02 13:15', 1),
            ('AÇELYA', 55.75, 130.60, 465.90, '2025-07-07 17:40', 9)
        ]
        cursor.executemany('''
            INSERT INTO envanter (urun_kodu, metre, metre_maliyet, fiyat, son_islem_tarihi, son_30_gun_islem)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', sample_envanter)
    
    # Initialize nakit_akisi table with current year's months
    cursor.execute('SELECT COUNT(*) FROM nakit_akisi')
    if cursor.fetchone()[0] == 0:
        current_year = datetime.now().year
        sample_nakit_akisi = []
        for month in range(1, 13):
            # Add some sample data for demonstration
            giris = 0  # Will be populated by actual sales
            cikis = 0  # Will be populated by actual expenses
            sample_nakit_akisi.append((month, current_year, giris, cikis, f'{current_year} yılı {month}. ay'))
        
        cursor.executemany('''
            INSERT INTO nakit_akisi (ay, yil, giris, cikis, aciklama)
            VALUES (?, ?, ?, ?, ?)
        ''', sample_nakit_akisi)
    
    conn.commit()
    conn.close()

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# API Routes

@app.route('/api/acik-borclar', methods=['GET'])
def get_acik_borclar():
    """Get all açık borçlar"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM acik_borclar ORDER BY created_at DESC')
    borclar = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(borclar)

@app.route('/api/acik-borclar', methods=['POST'])
def create_acik_borc():
    """Create new açık borç"""
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO acik_borclar (borc_sahibi, islem_kodu, acik_borc, original_borc)
        VALUES (?, ?, ?, ?)
    ''', (data['borc_sahibi'], data['islem_kodu'], data['acik_borc'], data['acik_borc']))
    
    borc_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'id': borc_id, 'message': 'Açık borç oluşturuldu'}), 201

@app.route('/api/acik-borclar/<int:borc_id>/odeme', methods=['POST'])
def make_payment_acik_borc(borc_id):
    """Make payment for açık borç"""
    data = request.json
    odeme_miktari = data['odeme_miktari']
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM acik_borclar WHERE id = ?', (borc_id,))
    borc = dict(cursor.fetchone())
    
    new_acik_borc = max(0, borc['acik_borc'] - odeme_miktari)
    
    cursor.execute('''
        UPDATE acik_borclar 
        SET acik_borc = ?, nagd_odeme = ?, payment_made = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (new_acik_borc, odeme_miktari, borc_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Ödeme yapıldı'})

@app.route('/api/acik-borclar/<int:borc_id>/undo', methods=['POST'])
def undo_payment_acik_borc(borc_id):
    """Undo payment for açık borç"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE acik_borclar 
        SET acik_borc = original_borc, nagd_odeme = 0, payment_made = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (borc_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Ödeme geri alındı'})

@app.route('/api/beklenen-odemeler', methods=['GET'])
def get_beklenen_odemeler():
    """Get all beklenen ödemeler with debt information from transactions"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get transactions that have outstanding debts (taksit_miktar > 0)
    # ONLY include transactions where the installment portion is paid with 'nakit'
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
            i.odeme_plani_id,
            i.created_at as last_payment_date
        FROM islemler i
        WHERE i.islem_tipi = 'satis' 
        AND i.taksit_miktar > 0
        AND i.aciklama NOT LIKE '%Taksit_Odeme_Tipi: kart%'
        ORDER BY i.created_at DESC
    ''')
    
    odemeler = [dict(row) for row in cursor.fetchall()]
    
    # Calculate remaining debt and last payment date for each transaction
    for odeme in odemeler:
        if odeme['odeme_plani_id']:
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_installments,
                    COUNT(CASE WHEN odendi = 1 THEN 1 END) as paid_installments,
                    SUM(CASE WHEN odendi = 0 THEN miktar ELSE 0 END) as remaining_amount,
                    MAX(CASE WHEN odendi = 1 THEN odeme_tarihi END) as last_payment_date
                FROM taksit_detaylari 
                WHERE odeme_plani_id = ?
            ''', (odeme['odeme_plani_id'],))
            
            debt_info = cursor.fetchone()
            if debt_info:
                odeme['acik_odeme'] = debt_info['remaining_amount'] or 0
                odeme['paid_installments'] = debt_info['paid_installments']
                odeme['total_installments'] = debt_info['total_installments']
                odeme['paymentMade'] = debt_info['paid_installments'] > 0
                
                # Update last payment date if there were payments
                if debt_info['last_payment_date']:
                    odeme['last_payment_date'] = debt_info['last_payment_date']
    
    # Filter based on business rules - ONLY show nakit payments with unpaid installments
    filtered_odemeler = []
    for odeme in odemeler:
        # Only show transactions that have unpaid installments AND are nakit payments
        if odeme['acik_odeme'] > 0 and odeme['odeme_tipi'] == 'nakit':
            from datetime import datetime, timedelta
            last_payment = datetime.fromisoformat(odeme['last_payment_date'].replace('Z', '+00:00'))
            days_since_payment = (datetime.now() - last_payment).days
            
            # Show if it's been more than 25 days OR if there are unpaid installments
            if days_since_payment > 25 or odeme['acik_odeme'] > 0:
                filtered_odemeler.append(odeme)
    
    conn.close()
    return jsonify(filtered_odemeler)

@app.route('/api/beklenen-odemeler', methods=['POST'])
def create_beklenen_odeme():
    """Create new beklenen ödeme"""
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    last_payment_date = None
    if data['odeme_tipi'] == 'nakit':
        last_payment_date = datetime.now().isoformat()
    
    cursor.execute('''
        INSERT INTO beklenen_odemeler (musteri, islem_kodu, acik_odeme, odeme_tipi, original_odeme, last_payment_date)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (data['musteri'], data['islem_kodu'], data['acik_odeme'], data['odeme_tipi'], data['acik_odeme'], last_payment_date))
    
    odeme_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'id': odeme_id, 'message': 'Beklenen ödeme oluşturuldu'}), 201

@app.route('/api/beklenen-odemeler/<int:transaction_id>/odeme', methods=['POST'])
def make_payment_beklenen_odeme(transaction_id):
    """Make payment for cash debt from transaction"""
    data = request.json
    odeme_miktari = float(data['odeme_miktari'])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get transaction and payment plan info
    cursor.execute('''
        SELECT i.*, op.id as odeme_plani_id 
        FROM islemler i
        LEFT JOIN odeme_plani op ON i.odeme_plani_id = op.id
        WHERE i.id = ? AND i.islem_tipi = 'satis'
    ''', (transaction_id,))
    
    transaction = cursor.fetchone()
    if not transaction:
        conn.close()
        return jsonify({'error': 'İşlem bulunamadı'}), 404
    
    # Check if this is a cash payment
    odeme_tipi = 'kart' if transaction['odeme_tipi'] in ('kart', 'kredi') else 'nakit'
    if odeme_tipi != 'nakit':
        conn.close()
        return jsonify({'error': 'Sadece nakit ödemeler için ödeme yapılabilir'}), 400
    
    odeme_plani_id = transaction['odeme_plani_id']
    if not odeme_plani_id:
        conn.close()
        return jsonify({'error': 'Ödeme planı bulunamadı'}), 404
    
    # Find the next unpaid installment
    cursor.execute('''
        SELECT * FROM taksit_detaylari 
        WHERE odeme_plani_id = ? AND odendi = 0 
        ORDER BY taksit_no ASC 
        LIMIT 1
    ''', (odeme_plani_id,))
    
    next_installment = cursor.fetchone()
    if not next_installment:
        conn.close()
        return jsonify({'error': 'Ödenmemiş taksit bulunamadı'}), 404
    
    # Validate payment amount
    if odeme_miktari > next_installment['miktar']:
        conn.close()
        return jsonify({'error': f'Ödeme miktarı taksit miktarından fazla olamaz (₺{next_installment["miktar"]})'})
    
    # Mark installment as paid
    cursor.execute('''
        UPDATE taksit_detaylari 
        SET odendi = 1, odeme_tarihi = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (next_installment['id'],))
    
    # Add payment to cash flow (exclude mail orders)
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    # Check if this is a mail order transaction
    is_mail_order = transaction.get('aciklama', '').find('Mail_Order: true') != -1
    
    if not is_mail_order:
        cursor.execute('''
            INSERT OR REPLACE INTO nakit_akisi (ay, yil, giris, cikis, aciklama, updated_at)
            VALUES (?, ?, 
                    COALESCE((SELECT giris FROM nakit_akisi WHERE ay = ? AND yil = ?), 0) + ?,
                    COALESCE((SELECT cikis FROM nakit_akisi WHERE ay = ? AND yil = ?), 0),
                    ?, CURRENT_TIMESTAMP)
        ''', (current_month, current_year, current_month, current_year, odeme_miktari, 
              current_month, current_year, f"Taksit ödemesi - {transaction['musteri']}"))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'message': 'Taksit ödemesi yapıldı', 
        'paid_amount': odeme_miktari,
        'installment_no': next_installment['taksit_no']
    })

@app.route('/api/beklenen-odemeler/<int:transaction_id>/undo', methods=['POST'])
def undo_payment_beklenen_odeme(transaction_id):
    """Undo the last payment for a transaction"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get transaction and payment plan info
    cursor.execute('''
        SELECT i.*, op.id as odeme_plani_id 
        FROM islemler i
        LEFT JOIN odeme_plani op ON i.odeme_plani_id = op.id
        WHERE i.id = ? AND i.islem_tipi = 'satis'
    ''', (transaction_id,))
    
    transaction = cursor.fetchone()
    if not transaction:
        conn.close()
        return jsonify({'error': 'İşlem bulunamadı'}), 404
    
    odeme_plani_id = transaction['odeme_plani_id']
    if not odeme_plani_id:
        conn.close()
        return jsonify({'error': 'Ödeme planı bulunamadı'}), 404
    
    # Find the last paid installment
    cursor.execute('''
        SELECT * FROM taksit_detaylari 
        WHERE odeme_plani_id = ? AND odendi = 1 
        ORDER BY taksit_no DESC 
        LIMIT 1
    ''', (odeme_plani_id,))
    
    last_paid_installment = cursor.fetchone()
    if not last_paid_installment:
        conn.close()
        return jsonify({'error': 'Geri alınacak ödeme bulunamadı'}), 404
    
    # Mark installment as unpaid
    cursor.execute('''
        UPDATE taksit_detaylari 
        SET odendi = 0, odeme_tarihi = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (last_paid_installment['id'],))
    
    # Remove payment from cash flow
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    # Check if this is a mail order transaction
    is_mail_order = transaction.get('aciklama', '').find('Mail_Order: true') != -1
    
    if not is_mail_order:
        cursor.execute('''
            INSERT OR REPLACE INTO nakit_akisi (ay, yil, giris, cikis, aciklama, updated_at)
            VALUES (?, ?, 
                    MAX(0, COALESCE((SELECT giris FROM nakit_akisi WHERE ay = ? AND yil = ?), 0) - ?),
                    COALESCE((SELECT cikis FROM nakit_akisi WHERE ay = ? AND yil = ?), 0),
                    ?, CURRENT_TIMESTAMP)
        ''', (current_month, current_year, current_month, current_year, last_paid_installment['miktar'], 
              current_month, current_year, f"Taksit geri alma - {transaction['musteri']}"))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'message': 'Taksit ödemesi geri alındı', 
        'reverted_amount': last_paid_installment['miktar'],
        'installment_no': last_paid_installment['taksit_no']
    })



@app.route('/api/calisanlar', methods=['GET'])
def get_calisanlar():
    """Get all çalışanlar"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM calisanlar ORDER BY created_at DESC')
    calisanlar = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(calisanlar)

@app.route('/api/calisanlar', methods=['POST'])
def create_calisan():
    """Create new çalışan"""
    data = request.json
    
    # Validate required fields
    if not data.get('ad') or not data.get('ad').strip():
        return jsonify({'error': 'Çalışan adı gerekli'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO calisanlar (ad, telefon, pozisyon, baslangic_tarihi, son_ay, son_3_ay, son_6_ay, son_12_ay)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (data['ad'].strip(), data.get('telefon', ''), data.get('pozisyon', ''), 
              datetime.now().date().isoformat(), 0, 0, 0, 0))
        
        calisan_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'id': calisan_id, 'message': 'Çalışan başarıyla eklendi'}), 201
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': f'Çalışan eklenirken hata oluştu: {str(e)}'}), 500

@app.route('/api/calisanlar/<int:calisan_id>', methods=['PUT'])
def update_calisan(calisan_id):
    """Update çalışan"""
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE calisanlar 
        SET ad = ?, telefon = ?, pozisyon = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (data['ad'], data['telefon'], data['pozisyon'], calisan_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Çalışan güncellendi'})

@app.route('/api/calisanlar/<int:calisan_id>', methods=['DELETE'])
def delete_calisan(calisan_id):
    """Delete çalışan"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM calisanlar WHERE id = ?', (calisan_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Çalışan silindi'})

@app.route('/api/planlanan-odemeler', methods=['GET'])
def get_planlanan_odemeler():
    """Get all planlanan ödemeler"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM planlanan_odemeler ORDER BY year, month')
    odemeler = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(odemeler)

@app.route('/api/planlanan-odemeler', methods=['POST'])
def create_planlanan_odeme():
    """Create new planlanan ödeme and add to planned cash flow"""
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Create planned payment
        cursor.execute('''
            INSERT INTO planlanan_odemeler (debt_id, month, year, amount)
            VALUES (?, ?, ?, ?)
        ''', (data['debt_id'], data['month'], data['year'], data['amount']))
        
        odeme_id = cursor.lastrowid
        
        # Add to cash flow as planned expense
        # First check if record exists for this month
        cursor.execute('SELECT giris, cikis FROM nakit_akisi WHERE ay = ? AND yil = ?', 
                      (data['month'], data['year']))
        existing = cursor.fetchone()
        
        if existing:
            # Update existing record with planned payment
            cursor.execute('''
                UPDATE nakit_akisi 
                SET cikis = cikis + ?, 
                    aciklama = COALESCE(aciklama, '') || '; Planlanan borç ödemesi ₺' || ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE ay = ? AND yil = ?
            ''', (data['amount'], data['amount'], data['month'], data['year']))
        else:
            # Insert new record with planned payment
            cursor.execute('''
                INSERT INTO nakit_akisi (ay, yil, giris, cikis, aciklama, updated_at)
                VALUES (?, ?, 0, ?, ?, CURRENT_TIMESTAMP)
            ''', (data['month'], data['year'], data['amount'],
                  f"Planlanan borç ödemesi ₺{data['amount']}"))
        
        conn.commit()
        return jsonify({'id': odeme_id, 'message': 'Planlanan ödeme eklendi ve nakit akışına eklendi'}), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/planlanan-odemeler/<int:odeme_id>/confirm', methods=['POST'])
def confirm_planlanan_odeme(odeme_id):
    """Confirm planlanan ödeme and update debt/cash flow"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get payment details before updating
        cursor.execute('SELECT * FROM planlanan_odemeler WHERE id = ?', (odeme_id,))
        payment = cursor.fetchone()
        if not payment:
            return jsonify({'error': 'Ödeme bulunamadı'}), 404
        
        payment_dict = dict(payment)
        
        # Update payment status
        cursor.execute('''
            UPDATE planlanan_odemeler 
            SET status = 'paid', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (odeme_id,))
        
        # Update debt amount in açık_borclar (using CASE for SQLite compatibility)
        cursor.execute('''
            UPDATE acik_borclar 
            SET acik_borc = CASE 
                WHEN acik_borc - ? < 0 THEN 0 
                ELSE acik_borc - ? 
            END, 
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (payment_dict['amount'], payment_dict['amount'], payment_dict['debt_id']))
        
        # Add payment to cash flow as expense (çıkış)
        # First check if record exists
        cursor.execute('SELECT giris, cikis FROM nakit_akisi WHERE ay = ? AND yil = ?', 
                      (payment_dict['month'], payment_dict['year']))
        existing = cursor.fetchone()
        
        if existing:
            # Update existing record
            cursor.execute('''
                UPDATE nakit_akisi 
                SET cikis = cikis + ?, 
                    aciklama = COALESCE(aciklama, '') || '; Borç ödemesi ₺' || ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE ay = ? AND yil = ?
            ''', (payment_dict['amount'], payment_dict['amount'], 
                  payment_dict['month'], payment_dict['year']))
        else:
            # Insert new record
            cursor.execute('''
                INSERT INTO nakit_akisi (ay, yil, giris, cikis, aciklama, updated_at)
                VALUES (?, ?, 0, ?, ?, CURRENT_TIMESTAMP)
            ''', (payment_dict['month'], payment_dict['year'], payment_dict['amount'],
                  f"Borç ödemesi ₺{payment_dict['amount']}"))
        
        conn.commit()
        return jsonify({'message': 'Ödeme onaylandı ve nakit akışına eklendi'})
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/planlanan-odemeler/<int:odeme_id>', methods=['DELETE'])
def delete_planlanan_odeme(odeme_id):
    """Delete planlanan ödeme and remove from cash flow"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get payment details before deleting
        cursor.execute('SELECT * FROM planlanan_odemeler WHERE id = ?', (odeme_id,))
        payment = cursor.fetchone()
        if not payment:
            return jsonify({'error': 'Ödeme bulunamadı'}), 404
        
        payment_dict = dict(payment)
        
        # Delete planned payment
        cursor.execute('DELETE FROM planlanan_odemeler WHERE id = ?', (odeme_id,))
        
        # Remove from cash flow if it was only a planned payment (not confirmed)
        if payment_dict['status'] == 'planned':
            cursor.execute('SELECT giris, cikis FROM nakit_akisi WHERE ay = ? AND yil = ?', 
                          (payment_dict['month'], payment_dict['year']))
            existing = cursor.fetchone()
            
            if existing:
                new_cikis = max(0, existing['cikis'] - payment_dict['amount'])
                if new_cikis == 0:
                    # If this was the only expense, delete the record
                    cursor.execute('DELETE FROM nakit_akisi WHERE ay = ? AND yil = ? AND giris = 0', 
                                  (payment_dict['month'], payment_dict['year']))
                else:
                    # Update the expense amount
                    cursor.execute('''
                        UPDATE nakit_akisi 
                        SET cikis = ?, 
                            updated_at = CURRENT_TIMESTAMP
                        WHERE ay = ? AND yil = ?
                    ''', (new_cikis, payment_dict['month'], payment_dict['year']))
        
        conn.commit()
        return jsonify({'message': 'Planlanan ödeme silindi ve nakit akışından çıkarıldı'})
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/gundem-posts', methods=['GET'])
def get_gundem_posts():
    """Get all gündem posts"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM gundem_posts ORDER BY created_at DESC')
    posts = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(posts)

@app.route('/api/gundem-posts', methods=['POST'])
def create_gundem_post():
    """Create new gündem post"""
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO gundem_posts (title, content, author, is_important)
        VALUES (?, ?, ?, ?)
    ''', (data['title'], data['content'], data.get('author', 'Yönetici'), data.get('is_important', False)))
    
    post_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'id': post_id, 'message': 'Gündem yazısı eklendi'}), 201

@app.route('/api/gundem-posts/<int:post_id>', methods=['DELETE'])
def delete_gundem_post(post_id):
    """Delete gündem post"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM gundem_posts WHERE id = ?', (post_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Gündem yazısı silindi'})

@app.route('/api/overdue-payments', methods=['GET'])
def get_overdue_payments():
    """Get payments that are overdue (>30 days for nakit payments)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
    
    cursor.execute('''
        SELECT * FROM beklenen_odemeler 
        WHERE odeme_tipi = 'nakit' 
        AND last_payment_date IS NOT NULL 
        AND last_payment_date < ?
        ORDER BY last_payment_date ASC
    ''', (thirty_days_ago,))
    
    overdue = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(overdue)

@app.route('/api/envanter', methods=['GET'])
def get_envanter():
    """Get all envanter items"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM envanter ORDER BY urun_kodu')
    items = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(items)

@app.route('/api/envanter', methods=['POST'])
def create_envanter_item():
    """Create new envanter item"""
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO envanter (urun_kodu, metre, metre_maliyet, fiyat, son_islem_tarihi, son_30_gun_islem)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (data['urun_kodu'], data['metre'], data['metre_maliyet'], 
              data.get('fiyat', 0), data.get('son_islem_tarihi'), data.get('son_30_gun_islem', 0)))
        
        item_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'id': item_id, 'message': 'Envanter ürünü eklendi'}), 201
        
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Bu ürün kodu zaten mevcut'}), 400

@app.route('/api/envanter/<int:item_id>', methods=['PUT'])
def update_envanter_item(item_id):
    """Update envanter item"""
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE envanter 
        SET urun_kodu = ?, metre = ?, metre_maliyet = ?, fiyat = ?, 
            son_islem_tarihi = ?, son_30_gun_islem = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (data['urun_kodu'], data['metre'], data['metre_maliyet'], 
          data.get('fiyat', 0), data.get('son_islem_tarihi'), 
          data.get('son_30_gun_islem', 0), item_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Envanter ürünü güncellendi'})

@app.route('/api/envanter/<int:item_id>', methods=['DELETE'])
def delete_envanter_item(item_id):
    """Delete envanter item"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM envanter WHERE id = ?', (item_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Envanter ürünü silindi'})

@app.route('/api/envanter/by-code/<string:urun_kodu>', methods=['GET'])
def get_envanter_by_code(urun_kodu):
    """Get envanter item by product code"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM envanter WHERE urun_kodu = ? COLLATE NOCASE', (urun_kodu,))
    item = cursor.fetchone()
    conn.close()
    
    if item:
        return jsonify(dict(item))
    else:
        return jsonify({'error': 'Ürün bulunamadı'}), 404

@app.route('/api/calisanlar/validate/<string:calisan_adi>', methods=['GET'])
def validate_calisan(calisan_adi):
    """Validate if employee name exists (case-insensitive)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM calisanlar WHERE LOWER(ad) = LOWER(?)', (calisan_adi,))
    calisan = cursor.fetchone()
    conn.close()
    
    if calisan:
        return jsonify({'valid': True, 'calisan': dict(calisan)})
    else:
        return jsonify({'valid': False, 'error': 'Çalışan bulunamadı'}), 404

@app.route('/api/urun-satis', methods=['POST'])
def urun_satis():
    """Process product sale - updates inventory and records transaction with payment plan"""
    data = request.json
    
    # Validate required fields
    required_fields = ['urun_kodu', 'miktar', 'birim_fiyat', 'satici_ismi']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} alanı gerekli'}), 400
    
    urun_kodu = data['urun_kodu'].upper()
    miktar = float(data['miktar'])
    birim_fiyat = float(data['birim_fiyat'])
    toplam_tutar = miktar * birim_fiyat
    musteri = data.get('musteri', '')
    odeme_tipi = data.get('odeme_tipi', 'nakit')
    aciklama = data.get('aciklama', '')
    satici_ismi = data['satici_ismi'].strip()
    
    # Payment plan fields
    pesin_miktar = float(data.get('pesin_miktar', 0))
    taksit_miktar = float(data.get('taksit_miktar', 0))
    taksit_sayisi = int(data.get('taksit_sayisi', 0))
    
    # Specific payment type information
    taksit_odeme_tipi = data.get('taksit_odeme_tipi', 'nakit')
    pesin_odeme_tipi = data.get('pesin_odeme_tipi', 'nakit')
    
    # Mail order flag
    is_mail_order = data.get('is_mail_order', False)
    
    if miktar <= 0:
        return jsonify({'error': 'Miktar 0\'dan büyük olmalı'}), 400
    
    if not satici_ismi:
        return jsonify({'error': 'Satıcı ismi gerekli'}), 400
    
    # Validate payment plan
    if pesin_miktar + taksit_miktar > 0:
        if abs((pesin_miktar + taksit_miktar) - toplam_tutar) > 0.01:
            return jsonify({'error': 'Peşin + Taksit toplamı, genel toplam ile eşleşmiyor'}), 400
    else:
        # Default: all amount is peşin
        pesin_miktar = toplam_tutar
        taksit_miktar = 0
        taksit_sayisi = 0
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Validate employee exists (case-insensitive)
        cursor.execute('SELECT * FROM calisanlar WHERE LOWER(ad) = LOWER(?)', (satici_ismi,))
        calisan = cursor.fetchone()
        
        if not calisan:
            return jsonify({'error': f'Çalışan bulunamadı: {satici_ismi}. Lütfen önce Yönetici → Çalışanlar sekmesinden çalışanları ekleyin.'}), 400
        
        calisan_id = calisan['id']
        
        # Get current inventory item
        cursor.execute('SELECT * FROM envanter WHERE urun_kodu = ? COLLATE NOCASE', (urun_kodu,))
        item = cursor.fetchone()
        
        if not item:
            return jsonify({'error': 'Ürün bulunamadı'}), 404
        
        current_metre = item['metre']
        if current_metre < miktar:
            return jsonify({'error': f'Yetersiz stok. Mevcut: {current_metre} m, İstenen: {miktar} m'}), 400
        
        # Update inventory
        new_metre = current_metre - miktar
        new_date = datetime.now().strftime('%Y-%m-%d %H:%M')
        new_transaction_count = item['son_30_gun_islem'] + 1
        
        cursor.execute('''
            UPDATE envanter 
            SET metre = ?, son_islem_tarihi = ?, son_30_gun_islem = ?, updated_at = CURRENT_TIMESTAMP
            WHERE urun_kodu = ? COLLATE NOCASE
        ''', (new_metre, new_date, new_transaction_count, urun_kodu))
        
        # Get current month and year
        current_date = datetime.now()
        current_month = current_date.month
        current_year = current_date.year
        
        # Create payment plan if needed
        odeme_plani_id = None
        if taksit_miktar > 0 and taksit_sayisi > 0:
            cursor.execute('''
                INSERT INTO odeme_plani (islem_id, musteri, toplam_tutar, pesin_miktar, 
                                       taksit_miktar, taksit_sayisi, ay, yil)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (0, musteri, toplam_tutar, pesin_miktar, taksit_miktar, taksit_sayisi, current_month, current_year))
            
            odeme_plani_id = cursor.lastrowid
            
            # Create installment details
            taksit_miktari = taksit_miktar / taksit_sayisi
            installment_month = current_month
            installment_year = current_year
            
            for i in range(taksit_sayisi):
                cursor.execute('''
                    INSERT INTO taksit_detaylari (odeme_plani_id, taksit_no, miktar, vade_ay, vade_yil)
                    VALUES (?, ?, ?, ?, ?)
                ''', (odeme_plani_id, i + 1, taksit_miktari, installment_month, installment_year))
                
                # Move to next month
                installment_month += 1
                if installment_month > 12:
                    installment_month = 1
                    installment_year += 1
        
        # Determine the correct payment type based on actual payment amounts
        if pesin_miktar > 0 and taksit_miktar > 0:
            final_odeme_tipi = 'pesin+taksit'
        elif taksit_miktar > 0:
            final_odeme_tipi = 'taksit'
        else:
            final_odeme_tipi = odeme_tipi  # Use the original payment type (nakit, kart, etc.)
        
        # Store the payment type information separately in the description for filtering
        # This is a workaround to track payment types for geniş ciro and beklenen ödemeler
        if taksit_miktar > 0:
            # Use the specific taksit payment type from frontend instead of inferring from overall payment type
            aciklama = f"{aciklama}, Taksit_Odeme_Tipi: {taksit_odeme_tipi}"
        
        if pesin_miktar > 0:
            # Store the peşin payment type for geniş ciro calculations
            aciklama = f"{aciklama}, Pesin_Odeme_Tipi: {pesin_odeme_tipi}"
        
        # Add employee name to description for undo functionality
        aciklama = f"{aciklama}, Satıcı: {satici_ismi}"
        
        # Add mail order flag to description for tracking
        if is_mail_order:
            aciklama = f"{aciklama}, Mail_Order: true"
        
        # Calculate profit margin
        cost_per_unit = item['metre_maliyet']
        profit_per_unit = birim_fiyat - cost_per_unit
        profit_margin = (profit_per_unit / cost_per_unit) * 100 if cost_per_unit > 0 else 0
        
        # Record transaction in işlemler
        cursor.execute('''
            INSERT INTO islemler (islem_tipi, urun_kodu, miktar, birim_fiyat, toplam_tutar, musteri, 
                                odeme_tipi, aciklama, pesin_miktar, taksit_miktar, taksit_sayisi, kar, odeme_plani_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('satis', urun_kodu, miktar, birim_fiyat, toplam_tutar, musteri, final_odeme_tipi, aciklama,
              pesin_miktar, taksit_miktar, taksit_sayisi, profit_margin, odeme_plani_id))
        
        transaction_id = cursor.lastrowid
        
        # Update payment plan with transaction ID
        if odeme_plani_id:
            cursor.execute('''
                UPDATE odeme_plani SET islem_id = ? WHERE id = ?
            ''', (transaction_id, odeme_plani_id))
        
        # Add peşin amount to current month's cash flow (exclude mail orders)
        if pesin_miktar > 0 and not is_mail_order:
            cursor.execute('''
                INSERT OR REPLACE INTO nakit_akisi (ay, yil, giris, cikis, aciklama, updated_at)
                VALUES (?, ?, 
                        COALESCE((SELECT giris FROM nakit_akisi WHERE ay = ? AND yil = ?), 0) + ?,
                        COALESCE((SELECT cikis FROM nakit_akisi WHERE ay = ? AND yil = ?), 0),
                        ?, CURRENT_TIMESTAMP)
            ''', (current_month, current_year, current_month, current_year, pesin_miktar, 
                  current_month, current_year, f"Peşin satış - {musteri}"))
        
        # Distribute installment amounts across future months (exclude mail orders)
        if taksit_miktar > 0 and taksit_sayisi > 0 and not is_mail_order:
            monthly_installment = taksit_miktar / taksit_sayisi
            
            for i in range(taksit_sayisi):
                # Calculate the month and year for this installment
                installment_month = current_month + i + 1  # Start from next month
                installment_year = current_year
                
                # Handle year rollover
                while installment_month > 12:
                    installment_month -= 12
                    installment_year += 1
                
                # Add installment to the respective month's cash flow
                cursor.execute('''
                    INSERT OR REPLACE INTO nakit_akisi (ay, yil, giris, cikis, aciklama, updated_at)
                    VALUES (?, ?, 
                            COALESCE((SELECT giris FROM nakit_akisi WHERE ay = ? AND yil = ?), 0) + ?,
                            COALESCE((SELECT cikis FROM nakit_akisi WHERE ay = ? AND yil = ?), 0),
                            ?, CURRENT_TIMESTAMP)
                ''', (installment_month, installment_year, installment_month, installment_year, monthly_installment, 
                      installment_month, installment_year, f"Taksit {i+1}/{taksit_sayisi} - {musteri}"))
        
        # Update employee performance (add to son_ay, son_3_ay, son_6_ay, son_12_ay)
        cursor.execute('''
            UPDATE calisanlar 
            SET son_ay = son_ay + ?, 
                son_3_ay = son_3_ay + ?, 
                son_6_ay = son_6_ay + ?, 
                son_12_ay = son_12_ay + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (toplam_tutar, toplam_tutar, toplam_tutar, toplam_tutar, calisan_id))
        
        conn.commit()
        
        return jsonify({
            'message': 'Satış başarıyla kaydedildi',
            'transaction_id': transaction_id,
            'odeme_plani_id': odeme_plani_id,
            'urun_kodu': urun_kodu,
            'eski_stok': current_metre,
            'yeni_stok': new_metre,
            'satis_miktari': miktar,
            'toplam_tutar': toplam_tutar,
            'pesin_miktar': pesin_miktar,
            'taksit_miktar': taksit_miktar,
            'taksit_sayisi': taksit_sayisi,
            'satici_ismi': satici_ismi
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Satış kaydedilemedi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/urun-alis', methods=['POST'])
def urun_alis():
    """Process product purchase - updates inventory and records transaction with debt tracking"""
    data = request.json
    
    # Validate required fields
    required_fields = ['urun_kodu', 'miktar', 'birim_fiyat', 'alici_ismi', 'tedarikci_bilgileri']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} alanı gerekli'}), 400
    
    urun_kodu = data['urun_kodu'].upper()
    miktar = float(data['miktar'])
    birim_fiyat = float(data['birim_fiyat'])
    toplam_tutar = miktar * birim_fiyat
    alici_ismi = data['alici_ismi'].strip()
    tedarikci_bilgileri = data['tedarikci_bilgileri'].strip()
    notlar = data.get('notlar', '')
    
    # Payment plan fields
    pesin_miktar = float(data.get('pesin_miktar', 0))
    borc_miktar = float(data.get('borc_miktar', 0))
    
    if miktar <= 0:
        return jsonify({'error': 'Miktar 0\'dan büyük olmalı'}), 400
    
    if not alici_ismi:
        return jsonify({'error': 'Alıcı ismi gerekli'}), 400
        
    if not tedarikci_bilgileri:
        return jsonify({'error': 'Tedarikçi bilgileri gerekli'}), 400
    
    # Validate payment plan
    if abs((pesin_miktar + borc_miktar) - toplam_tutar) > 0.01:
        return jsonify({'error': 'Peşin + Borç toplamı, genel toplam ile eşleşmiyor'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if product exists in inventory, if not create it
        cursor.execute('SELECT * FROM envanter WHERE urun_kodu = ? COLLATE NOCASE', (urun_kodu,))
        item = cursor.fetchone()
        
        if item:
            # Update existing inventory
            current_metre = item['metre']
            new_metre = current_metre + miktar
            new_date = datetime.now().strftime('%Y-%m-%d %H:%M')
            new_transaction_count = item['son_30_gun_islem'] + 1
            
            # Update cost basis to use last purchase price (instead of weighted average)
            new_cost_per_meter = birim_fiyat
            
            cursor.execute('''
                UPDATE envanter 
                SET metre = ?, metre_maliyet = ?, son_islem_tarihi = ?, son_30_gun_islem = ?, updated_at = CURRENT_TIMESTAMP
                WHERE urun_kodu = ? COLLATE NOCASE
            ''', (new_metre, new_cost_per_meter, new_date, new_transaction_count, urun_kodu))
        else:
            # Create new inventory item
            new_date = datetime.now().strftime('%Y-%m-%d %H:%M')
            cursor.execute('''
                INSERT INTO envanter (urun_kodu, metre, metre_maliyet, fiyat, son_islem_tarihi, son_30_gun_islem)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (urun_kodu, miktar, birim_fiyat, 0, new_date, 1))
        
        # Get current date for transaction and cash flow
        current_date = datetime.now()
        
        # Use provided transaction ID or generate one
        transaction_id = data.get('transaction_id')
        if not transaction_id:
            year = current_date.year % 100  # Last 2 digits
            month = current_date.month
            day = current_date.day
            hour = current_date.hour
            minute = current_date.minute
            second = current_date.second
            transaction_id = f"ALIS-{year:02d}{month:02d}{day:02d}-{hour:02d}{minute:02d}{second:02d}"
        
        # Create description with transaction ID and notes
        aciklama = f"Alış ID: {transaction_id}, Alıcı: {alici_ismi}"
        if notlar:
            aciklama += f", Not: {notlar}"
        
        # Record transaction in işlemler
        cursor.execute('''
            INSERT INTO islemler (islem_tipi, urun_kodu, miktar, birim_fiyat, toplam_tutar, musteri, 
                                odeme_tipi, aciklama, pesin_miktar, taksit_miktar, taksit_sayisi, kar)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('alis', urun_kodu, miktar, birim_fiyat, toplam_tutar, tedarikci_bilgileri, 'nakit', aciklama,
              pesin_miktar, borc_miktar, 0, 0))
        
        # Get current month and year
        current_month = current_date.month
        current_year = current_date.year
        
        # Add peşin amount to current month's cash flow as expense (giderler)
        if pesin_miktar > 0:
            cursor.execute('''
                INSERT OR REPLACE INTO nakit_akisi (ay, yil, giris, cikis, aciklama, updated_at)
                VALUES (?, ?, 
                        COALESCE((SELECT giris FROM nakit_akisi WHERE ay = ? AND yil = ?), 0),
                        COALESCE((SELECT cikis FROM nakit_akisi WHERE ay = ? AND yil = ?), 0) + ?,
                        ?, CURRENT_TIMESTAMP)
            ''', (current_month, current_year, current_month, current_year, 
                  current_month, current_year, pesin_miktar, f"Alış ödemesi - {tedarikci_bilgileri}"))
        
        # Add debt to açık borçlar if there's a debt amount
        if borc_miktar > 0:
            cursor.execute('''
                INSERT INTO acik_borclar (borc_sahibi, islem_kodu, acik_borc, nagd_odeme, original_borc, payment_made)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (tedarikci_bilgileri, transaction_id, borc_miktar, 0, borc_miktar, False))
        
        conn.commit()
        
        return jsonify({
            'message': 'Alış başarıyla kaydedildi',
            'transaction_id': transaction_id,
            'urun_kodu': urun_kodu,
            'eski_stok': item['metre'] if item else 0,
            'yeni_stok': (item['metre'] if item else 0) + miktar,
            'alis_miktari': miktar,
            'toplam_tutar': toplam_tutar,
            'pesin_miktar': pesin_miktar,
            'borc_miktar': borc_miktar,
            'alici_ismi': alici_ismi,
            'tedarikci_bilgileri': tedarikci_bilgileri
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Alış kaydedilemedi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/islemler', methods=['GET'])
def get_islemler():
    """Get all transactions"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM islemler ORDER BY created_at DESC')
    islemler = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(islemler)

@app.route('/api/islemler/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    """Delete a transaction and reverse its effects on cash flow"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get transaction details before deletion
        cursor.execute('SELECT * FROM islemler WHERE id = ?', (transaction_id,))
        transaction = cursor.fetchone()
        
        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404
        
        transaction_dict = dict(transaction)
        
        # Parse transaction date
        transaction_date = datetime.fromisoformat(transaction_dict['created_at'])
        transaction_month = transaction_date.month
        transaction_year = transaction_date.year
        
        # Reverse cash flow effects (exclude mail orders)
        if transaction_dict['islem_tipi'] == 'satis':
            # Check if this is a mail order transaction
            is_mail_order = transaction_dict.get('aciklama', '').find('Mail_Order: true') != -1
            
            # Reverse peşin amount from cash flow (exclude mail orders)
            if transaction_dict['pesin_miktar'] > 0 and not is_mail_order:
                cursor.execute('''
                    UPDATE nakit_akisi 
                    SET giris = MAX(0, giris - ?), updated_at = CURRENT_TIMESTAMP
                    WHERE ay = ? AND yil = ?
                ''', (transaction_dict['pesin_miktar'], transaction_month, transaction_year))
            
            # Reverse installment amounts from future months (exclude mail orders)
            if transaction_dict['taksit_miktar'] > 0 and transaction_dict['taksit_sayisi'] > 0 and not is_mail_order:
                monthly_installment = transaction_dict['taksit_miktar'] / transaction_dict['taksit_sayisi']
                
                for i in range(transaction_dict['taksit_sayisi']):
                    installment_month = transaction_month + i + 1
                    installment_year = transaction_year
                    
                    # Handle year rollover
                    while installment_month > 12:
                        installment_month -= 12
                        installment_year += 1
                    
                    cursor.execute('''
                        UPDATE nakit_akisi 
                        SET giris = MAX(0, giris - ?), updated_at = CURRENT_TIMESTAMP
                        WHERE ay = ? AND yil = ?
                    ''', (monthly_installment, installment_month, installment_year))
        
        # Restore inventory if it's a sale
        if transaction_dict['islem_tipi'] == 'satis':
            cursor.execute('''
                UPDATE envanter 
                SET metre = metre + ?, updated_at = CURRENT_TIMESTAMP
                WHERE urun_kodu = ?
            ''', (transaction_dict['miktar'], transaction_dict['urun_kodu']))
        
        # Reverse employee stats if it's a sale
        if transaction_dict['islem_tipi'] == 'satis':
            # Extract employee name from aciklama field
            aciklama = transaction_dict.get('aciklama', '')
            if 'Satıcı: ' in aciklama:
                # Find the employee name after "Satıcı: "
                start_pos = aciklama.find('Satıcı: ') + len('Satıcı: ')
                end_pos = aciklama.find(',', start_pos)
                if end_pos == -1:
                    employee_name = aciklama[start_pos:].strip()
                else:
                    employee_name = aciklama[start_pos:end_pos].strip()
                
                # Find the employee and reverse their stats
                cursor.execute('SELECT * FROM calisanlar WHERE LOWER(ad) = LOWER(?)', (employee_name,))
                employee = cursor.fetchone()
                
                if employee:
                    # Subtract the transaction amount from employee performance
                    cursor.execute('''
                        UPDATE calisanlar 
                        SET son_ay = MAX(0, son_ay - ?), 
                            son_3_ay = MAX(0, son_3_ay - ?), 
                            son_6_ay = MAX(0, son_6_ay - ?), 
                            son_12_ay = MAX(0, son_12_ay - ?),
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    ''', (transaction_dict['toplam_tutar'], transaction_dict['toplam_tutar'], 
                          transaction_dict['toplam_tutar'], transaction_dict['toplam_tutar'], employee['id']))
        
        # Delete the transaction
        cursor.execute('DELETE FROM islemler WHERE id = ?', (transaction_id,))
        
        # Delete related payment plan if exists
        if transaction_dict['odeme_plani_id']:
            cursor.execute('DELETE FROM taksit_detaylari WHERE odeme_plani_id = ?', (transaction_dict['odeme_plani_id'],))
            cursor.execute('DELETE FROM odeme_plani WHERE id = ?', (transaction_dict['odeme_plani_id'],))
        
        conn.commit()
        return jsonify({'message': 'Transaction deleted and cash flow updated'})
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/islemler/<int:islem_id>', methods=['DELETE'])
def delete_islem(islem_id):
    """Delete a transaction"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM islemler WHERE id = ?', (islem_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'İşlem silindi'})

@app.route('/api/envanter/restore', methods=['POST'])
def restore_envanter():
    """Restore inventory quantity after deleting a sale"""
    data = request.json
    urun_kodu = data['urun_kodu']
    miktar = float(data['miktar'])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get current inventory item
        cursor.execute('SELECT * FROM envanter WHERE urun_kodu = ? COLLATE NOCASE', (urun_kodu,))
        item = cursor.fetchone()
        
        if not item:
            return jsonify({'error': 'Ürün bulunamadı'}), 404
        
        # Add the quantity back to inventory
        new_metre = item['metre'] + miktar
        new_date = datetime.now().strftime('%Y-%m-%d %H:%M')
        
        cursor.execute('''
            UPDATE envanter 
            SET metre = ?, son_islem_tarihi = ?, updated_at = CURRENT_TIMESTAMP
            WHERE urun_kodu = ? COLLATE NOCASE
        ''', (new_metre, new_date, urun_kodu))
        
        conn.commit()
        
        return jsonify({
            'message': 'Envanter başarıyla güncellendi',
            'urun_kodu': urun_kodu,
            'eski_miktar': item['metre'],
            'yeni_miktar': new_metre,
            'eklenen_miktar': miktar
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Envanter güncellenemedi: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/envanter/reset', methods=['POST'])
def reset_envanter():
    """Reset envanter to original sample data and clear all financial data"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Clear all existing data - inventory and transactions
        cursor.execute('DELETE FROM envanter')
        cursor.execute('DELETE FROM islemler')
        
        # Clear all financial data
        cursor.execute('DELETE FROM nakit_akisi')  # Cash flow data
        cursor.execute('DELETE FROM taksit_detaylari')  # Installment details
        cursor.execute('DELETE FROM odeme_plani')  # Payment plans
        cursor.execute('DELETE FROM acik_borclar')  # Outstanding debts
        cursor.execute('DELETE FROM beklenen_odemeler')  # Expected payments
        cursor.execute('DELETE FROM planlanan_odemeler')  # Planned payments
        cursor.execute('DELETE FROM gundem_posts')  # News posts
        
        # Insert original sample data for envanter
        sample_envanter = [
            ('ZAMBAK', 52.34, 120.50, 435.00, '2025-07-08 14:22', 5),
            ('GÜL', 75.20, 98.30, 520.75, '2025-07-05 09:10', 8),
            ('LALE', 40.10, 210.00, 350.00, '2025-07-03 18:45', 3),
            ('MENEKŞE', 62.80, 150.75, 600.20, '2025-07-09 11:05', 7),
            ('NERGİS', 30.55, 175.40, 275.60, '2025-06-30 16:30', 2),
            ('SÜMBÜL', 85.00, 250.00, 725.10, '2025-07-06 12:55', 10),
            ('KARANFİL', 58.90, 140.20, 490.45, '2025-07-01 08:20', 6),
            ('YASEMİN', 70.25, 190.80, 580.00, '2025-07-04 20:10', 4),
            ('BEGONYA', 45.60, 160.90, 410.30, '2025-07-02 13:15', 1),
            ('AÇELYA', 55.75, 130.60, 465.90, '2025-07-07 17:40', 9)
        ]
        
        cursor.executemany('''
            INSERT INTO envanter (urun_kodu, metre, metre_maliyet, fiyat, son_islem_tarihi, son_30_gun_islem)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', sample_envanter)
        
        # Insert sample financial data - removed dummy debtors
        
        sample_beklenen_odemeler = [
            ('Mehmet Yılmaz', 'ISL004', 1200, 'nakit', 0, 1200, False, (datetime.now() - timedelta(days=6)).isoformat(), None),
            ('Ayşe Özkan', 'ISL005', 950, 'kart', 950, 950, False, None, None),
            ('Hasan Çelik', 'ISL006', 1750, 'nakit', 0, 1750, False, (datetime.now() - timedelta(days=13)).isoformat(), None),
            ('Fatma Demir', 'ISL007', 2300, 'nakit', 0, 2300, False, (datetime.now() - timedelta(days=35)).isoformat(), None),
            ('Ali Kaya', 'ISL008', 1850, 'kart', 1850, 1850, False, None, None)
        ]
        cursor.executemany('''
            INSERT INTO beklenen_odemeler (musteri, islem_kodu, acik_odeme, odeme_tipi, odeme_miktari, original_odeme, payment_made, last_payment_date, previous_last_payment_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', sample_beklenen_odemeler)
        
        conn.commit()
        
        return jsonify({
            'message': 'Envanter ve tüm finansal veriler başarıyla sıfırlandı',
            'cleared_tables': [
                'envanter', 'islemler', 'nakit_akisi', 'taksit_detaylari', 
                'odeme_plani', 'acik_borclar', 'beklenen_odemeler', 
                'planlanan_odemeler', 'gundem_posts'
            ]
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Sıfırlama işlemi başarısız: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/calisanlar/reset', methods=['POST'])
def reset_calisanlar():
    """Reset çalışanlar table - remove all employees"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Clear all existing employee data
    cursor.execute('DELETE FROM calisanlar')
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Çalışanlar tablosu sıfırlandı'})

@app.route('/api/nakit-akisi', methods=['GET'])
def get_nakit_akisi():
    """Get monthly cash flow data"""
    year = request.args.get('year', datetime.now().year)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM nakit_akisi WHERE yil = ? ORDER BY ay', (year,))
    akis = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(akis)

@app.route('/api/nakit-akisi', methods=['POST'])
def update_nakit_akisi():
    """Update monthly cash flow"""
    data = request.json
    ay = data['ay']
    yil = data['yil']
    giris = data.get('giris', 0)
    cikis = data.get('cikis', 0)
    aciklama = data.get('aciklama', '')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Insert or update
    cursor.execute('''
        INSERT OR REPLACE INTO nakit_akisi (ay, yil, giris, cikis, aciklama, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ''', (ay, yil, giris, cikis, aciklama))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Nakit akışı güncellendi'})

@app.route('/api/nakit-akisi/add-income', methods=['POST'])
def add_income_to_cash_flow():
    """Add income to specific month's cash flow"""
    data = request.json
    ay = data['ay']
    yil = data['yil']
    miktar = data['miktar']
    aciklama = data.get('aciklama', '')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get current cash flow for this month
    cursor.execute('SELECT * FROM nakit_akisi WHERE ay = ? AND yil = ?', (ay, yil))
    existing = cursor.fetchone()
    
    if existing:
        # Update existing record
        new_giris = existing['giris'] + miktar
        cursor.execute('''
            UPDATE nakit_akisi 
            SET giris = ?, aciklama = ?, updated_at = CURRENT_TIMESTAMP
            WHERE ay = ? AND yil = ?
        ''', (new_giris, aciklama, ay, yil))
    else:
        # Create new record
        cursor.execute('''
            INSERT INTO nakit_akisi (ay, yil, giris, cikis, aciklama)
            VALUES (?, ?, ?, 0, ?)
        ''', (ay, yil, miktar, aciklama))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Gelir eklendi'})

@app.route('/api/odeme-plani', methods=['GET'])
def get_odeme_plani():
    """Get all payment plans"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT op.*, td.taksit_no, td.miktar as taksit_miktar, 
               td.vade_ay, td.vade_yil, td.odendi, td.odeme_tarihi
        FROM odeme_plani op
        LEFT JOIN taksit_detaylari td ON op.id = td.odeme_plani_id
        ORDER BY op.created_at DESC, td.taksit_no ASC
    ''')
    
    plans = {}
    for row in cursor.fetchall():
        row_dict = dict(row)
        plan_id = row_dict['id']
        
        if plan_id not in plans:
            plans[plan_id] = {
                'id': row_dict['id'],
                'islem_id': row_dict['islem_id'],
                'musteri': row_dict['musteri'],
                'toplam_tutar': row_dict['toplam_tutar'],
                'pesin_miktar': row_dict['pesin_miktar'],
                'taksit_miktar': row_dict['taksit_miktar'],
                'taksit_sayisi': row_dict['taksit_sayisi'],
                'ay': row_dict['ay'],
                'yil': row_dict['yil'],
                'durum': row_dict['durum'],
                'created_at': row_dict['created_at'],
                'taksitler': []
            }
        
        if row_dict['taksit_no']:
            plans[plan_id]['taksitler'].append({
                'taksit_no': row_dict['taksit_no'],
                'miktar': row_dict['taksit_miktar'],
                'vade_ay': row_dict['vade_ay'],
                'vade_yil': row_dict['vade_yil'],
                'odendi': row_dict['odendi'],
                'odeme_tarihi': row_dict['odeme_tarihi']
            })
    
    conn.close()
    return jsonify(list(plans.values()))

@app.route('/api/odeme-plani', methods=['POST'])
def create_odeme_plani():
    """Create new payment plan"""
    data = request.json
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Create payment plan
        cursor.execute('''
            INSERT INTO odeme_plani (islem_id, musteri, toplam_tutar, pesin_miktar, 
                                   taksit_miktar, taksit_sayisi, ay, yil)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (data['islem_id'], data['musteri'], data['toplam_tutar'], 
              data['pesin_miktar'], data['taksit_miktar'], data['taksit_sayisi'],
              data['ay'], data['yil']))
        
        plan_id = cursor.lastrowid
        
        # Create installment details
        if data['taksit_sayisi'] > 0:
            taksit_miktari = data['taksit_miktar'] / data['taksit_sayisi']
            current_month = data['ay']
            current_year = data['yil']
            
            for i in range(data['taksit_sayisi']):
                cursor.execute('''
                    INSERT INTO taksit_detaylari (odeme_plani_id, taksit_no, miktar, vade_ay, vade_yil)
                    VALUES (?, ?, ?, ?, ?)
                ''', (plan_id, i + 1, taksit_miktari, current_month, current_year))
                
                # Move to next month
                current_month += 1
                if current_month > 12:
                    current_month = 1
                    current_year += 1
        
        conn.commit()
        return jsonify({'id': plan_id, 'message': 'Ödeme planı oluşturuldu'})
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/taksit-ode/<int:taksit_id>', methods=['POST'])
def pay_installment(taksit_id):
    """Mark installment as paid and update cash flow"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get installment details
        cursor.execute('''
            SELECT td.*, op.musteri 
            FROM taksit_detaylari td
            JOIN odeme_plani op ON td.odeme_plani_id = op.id
            WHERE td.id = ?
        ''', (taksit_id,))
        
        taksit = cursor.fetchone()
        if not taksit:
            return jsonify({'error': 'Taksit bulunamadı'}), 404
        
        # Mark as paid
        cursor.execute('''
            UPDATE taksit_detaylari 
            SET odendi = TRUE, odeme_tarihi = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (taksit_id,))
        
        # Add to cash flow (exclude mail orders)
        # Get the related transaction to check if it's a mail order
        cursor.execute('''
            SELECT i.aciklama FROM islemler i
            JOIN odeme_plani op ON i.id = op.islem_id
            WHERE op.id = ?
        ''', (taksit['odeme_plani_id'],))
        
        transaction_info = cursor.fetchone()
        is_mail_order = transaction_info and transaction_info['aciklama'].find('Mail_Order: true') != -1
        
        if not is_mail_order:
            cursor.execute('''
                INSERT OR REPLACE INTO nakit_akisi (ay, yil, giris, cikis, aciklama, updated_at)
                VALUES (?, ?, 
                        COALESCE((SELECT giris FROM nakit_akisi WHERE ay = ? AND yil = ?), 0) + ?,
                        COALESCE((SELECT cikis FROM nakit_akisi WHERE ay = ? AND yil = ?), 0),
                        ?, CURRENT_TIMESTAMP)
            ''', (taksit['vade_ay'], taksit['vade_yil'], taksit['vade_ay'], taksit['vade_yil'], 
                  taksit['miktar'], taksit['vade_ay'], taksit['vade_yil'], 
                  f"Taksit ödemesi - {taksit['musteri']}"))
        
        conn.commit()
        return jsonify({'message': 'Taksit ödemesi kaydedildi'})
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/finansal-ozet', methods=['GET'])
def get_finansal_ozet():
    """Get comprehensive financial summary"""
    year = request.args.get('year', datetime.now().year)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get cash flow data
    cursor.execute('SELECT * FROM nakit_akisi WHERE yil = ? ORDER BY ay', (year,))
    nakit_akisi = [dict(row) for row in cursor.fetchall()]
    
    # Get sales data
    cursor.execute('''
        SELECT COUNT(*) as satis_sayisi, SUM(toplam_tutar) as toplam_satis,
               SUM(pesin_miktar) as toplam_pesin, SUM(taksit_miktar) as toplam_taksit
        FROM islemler 
        WHERE islem_tipi = 'satis' AND strftime('%Y', created_at) = ?
    ''', (str(year),))
    satis_data = dict(cursor.fetchone())
    
    # Get purchase data
    cursor.execute('''
        SELECT COUNT(*) as alis_sayisi, SUM(toplam_tutar) as toplam_alis
        FROM islemler 
        WHERE islem_tipi = 'alis' AND strftime('%Y', created_at) = ?
    ''', (str(year),))
    alis_data = dict(cursor.fetchone())
    
    # Get profit data
    cursor.execute('''
        SELECT 
            SUM((i.birim_fiyat - e.metre_maliyet) * i.miktar) as toplam_kar,
            AVG(i.kar) as ortalama_kar_marji
        FROM islemler i
        JOIN envanter e ON i.urun_kodu = e.urun_kodu
        WHERE i.islem_tipi = 'satis' AND strftime('%Y', i.created_at) = ?
    ''', (str(year),))
    kar_data = dict(cursor.fetchone())
    
    # Get active payment plans
    cursor.execute('''
        SELECT COUNT(*) as aktif_plan_sayisi, SUM(taksit_miktar) as bekleyen_taksit_tutari
        FROM odeme_plani 
        WHERE durum = 'aktif' AND yil = ?
    ''', (year,))
    plan_data = dict(cursor.fetchone())
    
    conn.close()
    
    return jsonify({
        'nakit_akisi': nakit_akisi,
        'satis_data': satis_data,
        'alis_data': alis_data,
        'kar_data': kar_data,
        'plan_data': plan_data,
        'year': year
    })

# User Management Endpoints
@app.route('/api/users/register', methods=['POST'])
def register_user():
    """Register a new user"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        role = data.get('role')
        
        # Validation
        if not username or not password or not role:
            return jsonify({'error': 'Username, password and role are required'}), 400
            
        if len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters'}), 400
            
        if not username.isalpha():
            return jsonify({'error': 'Username must contain only English letters'}), 400
            
        if len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400
            
        if role not in ['yönetici', 'çalışan']:
            return jsonify({'error': 'Role must be either "yönetici" or "çalışan"'}), 400
        
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Check if username already exists
        cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Username already exists'}), 400
        
        # Create user
        cursor.execute('''
            INSERT INTO users (username, password, role) 
            VALUES (?, ?, ?)
        ''', (username, password, role))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'User created successfully', 'username': username, 'role': role}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/login', methods=['POST'])
def login_user():
    """Login user and return user info"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, role FROM users 
            WHERE username = ? AND password = ?
        ''', (username, password))
        
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return jsonify({
                'success': True,
                'user': {
                    'id': user[0],
                    'username': user[1],
                    'role': user[2]
                }
            }), 200
        else:
            return jsonify({'error': 'Invalid username or password'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users', methods=['GET'])
def get_users():
    """Get all users (admin only)"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, role, created_at FROM users 
            ORDER BY created_at DESC
        ''')
        
        users = []
        for row in cursor.fetchall():
            users.append({
                'id': row[0],
                'username': row[1],
                'role': row[2],
                'created_at': row[3]
            })
        
        conn.close()
        return jsonify(users), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

# Serve React App
@app.route('/')
def serve_react_app():
    """Serve the React app's index.html"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static_files(path):
    """Serve static files or return React app for client-side routing"""
    file_path = os.path.join(app.static_folder, path)
    if os.path.exists(file_path):
        return send_from_directory(app.static_folder, path)
    else:
        # For client-side routing, return index.html
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port) 
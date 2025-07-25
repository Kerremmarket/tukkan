import sqlite3

conn = sqlite3.connect('tukkan.db')
cursor = conn.cursor()

print('=== ALL TRANSACTIONS ===')
cursor.execute("SELECT * FROM islemler ORDER BY id")
for row in cursor.fetchall():
    print(f'ID: {row[0]}, Musteri: {row[5]}, Odeme_Tipi: {row[6]}, Aciklama: {row[7]}, Taksit_Miktar: {row[9]}, Taksit_Sayisi: {row[10]}, Odeme_Plani_ID: {row[12]}')

print('\n=== ODEME_PLANI TABLE ===')
cursor.execute('SELECT * FROM odeme_plani')
for row in cursor.fetchall():
    print(f'ID: {row[0]}, Islem_ID: {row[1]}, Musteri: {row[2]}, Toplam: {row[3]}, Pesin: {row[4]}, Taksit: {row[5]}, Taksit_Sayisi: {row[6]}')

print('\n=== TAKSIT_DETAYLARI TABLE ===')
cursor.execute('SELECT * FROM taksit_detaylari ORDER BY odeme_plani_id, taksit_no')
for row in cursor.fetchall():
    print(f'ID: {row[0]}, Odeme_Plani_ID: {row[1]}, Taksit_No: {row[2]}, Miktar: {row[3]}, Vade_Ay: {row[4]}, Vade_Yil: {row[5]}, Odendi: {row[6]}, Odeme_Tarihi: {row[7]}')

conn.close() 
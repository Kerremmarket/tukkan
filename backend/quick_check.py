import sqlite3
from datetime import datetime

conn = sqlite3.connect('tukkan.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("=== DATASET STRUCTURE ANALYSIS ===\n")

# Check nakit_akisi years
cursor.execute("SELECT DISTINCT yil FROM nakit_akisi ORDER BY yil")
years = [row[0] for row in cursor.fetchall()]
print(f"💰 Cash Flow Years: {years}")
for year in years:
    cursor.execute("SELECT COUNT(*) FROM nakit_akisi WHERE yil = ?", (year,))
    count = cursor.fetchone()[0]
    print(f"  - {year}: {count} months")

# Check transactions
cursor.execute("SELECT MIN(date(created_at)), MAX(date(created_at)), COUNT(*) FROM islemler")
result = cursor.fetchone()
print(f"\n📈 Transactions: {result[2]} total")
if result[0]:
    print(f"  Date range: {result[0]} to {result[1]}")

# Check planned payments
cursor.execute("SELECT DISTINCT yil FROM planlanan_odemeler ORDER BY yil")
payment_years = [row[0] for row in cursor.fetchall()]
print(f"\n💳 Planned payment years: {payment_years}")

# Check installments
cursor.execute("SELECT DISTINCT vade_yil FROM taksit_detaylari ORDER BY vade_yil")
installment_years = [row[0] for row in cursor.fetchall()]
print(f"\n📅 Installment years: {installment_years}")

# Current year analysis
current_year = datetime.now().year
print(f"\n🗓️  Current year: {current_year}")

# Future year analysis
all_years = set(years + payment_years + installment_years)
future_years = [y for y in all_years if y > current_year]
if future_years:
    print(f"🔮 Future years in database: {future_years}")
    print("⚠️  The system already has data for future years!")
else:
    print("✅ No future year data found")

# Sample cash flow data
print(f"\n💰 Sample Cash Flow Data:")
cursor.execute("SELECT * FROM nakit_akisi ORDER BY yil, ay LIMIT 5")
for row in cursor.fetchall():
    print(f"  {row['yil']}-{row['ay']:02d}: Income={row['giris']}, Expense={row['cikis']}")

conn.close() 
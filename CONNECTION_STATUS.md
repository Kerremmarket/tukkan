# Tukkan Application - Connection Status

## ✅ Services Running

### Backend (Flask API)
- **URL**: http://localhost:5000
- **Status**: ✅ Running
- **Health Check**: http://localhost:5000/api/health
- **Database**: SQLite (tukkan.db)
- **CORS**: Enabled for frontend connection

### Frontend (React + Vite)
- **URL**: http://localhost:5174
- **Status**: ✅ Running
- **Development Server**: Vite
- **Hot Reload**: Enabled

## 🔗 API Endpoints Available

### Core Endpoints
- `GET /api/health` - Health check
- `GET /api/envanter` - Inventory items
- `GET /api/calisanlar` - Employees
- `GET /api/islemler` - Transactions
- `GET /api/acik-borclar` - Open debts
- `GET /api/beklenen-odemeler` - Expected payments
- `GET /api/nakit-akisi` - Cash flow
- `GET /api/gundem-posts` - Agenda posts

### Manager Features (Yonetici)
- Employee management (CRUD operations)
- Debt management and payment tracking
- Financial reporting and cash flow
- Agenda/announcement system

## 🚀 How to Access

1. **Main Application**: Open http://localhost:5174 in your browser
2. **Connection Test**: Open `test-connection.html` in your browser
3. **API Direct Access**: Use http://localhost:5000/api/[endpoint]

## 📱 Application Features

### Available Pages
- **Login**: Authentication system
- **Home Screen**: Main dashboard
- **Product Sales**: Sales transactions
- **Product Purchase**: Purchase transactions
- **Inventory**: Stock management
- **Transactions**: Transaction history
- **Manager Panel**: Administrative features

### Manager Panel Features
- **Open Debts**: Debt tracking and payment management
- **Expected Payments**: Payment tracking with reminders
- **Employees**: Staff management and statistics
- **Financials**: Cash flow and business metrics
- **Agenda**: Company announcements and posts

## 🛠️ Technical Details

### Backend Dependencies
- Flask 2.3.3
- Flask-CORS 4.0.0
- python-dotenv 1.0.0
- SQLite3 (built-in)

### Frontend Dependencies
- React 19.1.0
- Vite 6.3.5
- i18next (internationalization)
- React Router (navigation)

### Database
- **Type**: SQLite
- **File**: backend/tukkan.db
- **Tables**: envanter, calisanlar, islemler, acik_borclar, beklenen_odemeler, nakit_akisi, gundem_posts

## 🔧 Development Commands

### Backend
```bash
cd backend
python app.py
```

### Frontend
```bash
npm run dev
```

### Testing
- Open `test-connection.html` for API testing
- Use browser dev tools to monitor network requests
- Check backend terminal for API logs

## 🎯 Next Steps

1. **Test the Application**: Open http://localhost:5174
2. **Login**: Use the login system to access features
3. **Explore Manager Panel**: Test all administrative features
4. **API Testing**: Use the connection test page
5. **Data Management**: Add/edit inventory, employees, transactions

## 📊 Current Data

The application already has some sample data:
- Employee records with sales statistics
- Inventory items with stock levels
- Transaction history
- Financial data and cash flow records

Both frontend and backend are fully connected and ready to use! 
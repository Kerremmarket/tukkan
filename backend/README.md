# Tukkan Backend API

A Flask-based REST API for the Tukkan business management application.

## Features

- **Açık Borçlar Management**: Create, update, and track outstanding debts
- **Beklenen Ödemeler Management**: Handle expected payments with payment tracking
- **Çalışanlar Management**: Employee management system
- **Planlanan Ödemeler**: Payment planning and scheduling
- **Gündem Posts**: News and announcement system
- **SQLite Database**: Lightweight, file-based database that can be easily shared

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Run the Application

```bash
python app.py
```

The API will be available at `http://localhost:5000`

### 3. Test the API

```bash
curl http://localhost:5000/api/health
```

## API Endpoints

### Açık Borçlar (Outstanding Debts)
- `GET /api/acik-borclar` - Get all outstanding debts
- `POST /api/acik-borclar` - Create new debt
- `POST /api/acik-borclar/{id}/odeme` - Make payment
- `POST /api/acik-borclar/{id}/undo` - Undo payment

### Beklenen Ödemeler (Expected Payments)
- `GET /api/beklenen-odemeler` - Get all expected payments
- `POST /api/beklenen-odemeler` - Create new expected payment
- `POST /api/beklenen-odemeler/{id}/odeme` - Make payment
- `POST /api/beklenen-odemeler/{id}/undo` - Undo payment

### Çalışanlar (Employees)
- `GET /api/calisanlar` - Get all employees
- `POST /api/calisanlar` - Create new employee
- `PUT /api/calisanlar/{id}` - Update employee
- `DELETE /api/calisanlar/{id}` - Delete employee

### Planlanan Ödemeler (Planned Payments)
- `GET /api/planlanan-odemeler` - Get all planned payments
- `POST /api/planlanan-odemeler` - Create new planned payment
- `POST /api/planlanan-odemeler/{id}/confirm` - Confirm payment

### Gündem Posts
- `GET /api/gundem-posts` - Get all posts
- `POST /api/gundem-posts` - Create new post
- `DELETE /api/gundem-posts/{id}` - Delete post

### Utilities
- `GET /api/overdue-payments` - Get overdue payments (>30 days)
- `GET /api/health` - Health check

## Database

The application uses SQLite with the following tables:

- `acik_borclar` - Outstanding debts
- `beklenen_odemeler` - Expected payments
- `calisanlar` - Employees
- `planlanan_odemeler` - Planned payments
- `gundem_posts` - News posts

### Database File Location

The SQLite database file (`tukkan.db`) is created in the `backend` directory. This file can be:

1. **Shared via cloud storage** (Google Drive, Dropbox, etc.)
2. **Hosted on a remote server** and accessed via network path
3. **Backed up regularly** for data safety

### External Database Hosting Options

For external hosting, you can:

1. **Use a cloud SQLite service** like Turso or LiteFS
2. **Mount the database file** from a network drive
3. **Use environment variables** to point to external database location:

```bash
export DATABASE_URL="sqlite:///path/to/shared/tukkan.db"
```

## Configuration

Environment variables:

- `SECRET_KEY` - Flask secret key for production
- `DATABASE_URL` - Database connection string
- `CORS_ORIGINS` - Allowed CORS origins (comma-separated)
- `FLASK_ENV` - Environment (development/production)

## CORS Configuration

The API is configured to accept requests from any origin during development. For production, set the `CORS_ORIGINS` environment variable.

## Sample Data

The application automatically creates sample data on first run:

- 3 sample outstanding debts
- 5 sample expected payments
- 3 sample employees
- 2 sample gündem posts

## Production Deployment

For production deployment:

1. Set environment variables
2. Use a proper WSGI server like Gunicorn
3. Set up proper database backup
4. Configure CORS for your frontend domain

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
``` 
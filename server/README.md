# Shorty URL Server v2.0

A modern, secure, and optimized URL shortener backend built with Express.js.

## Features

- 🔒 **Security First**: Helmet, rate limiting, input validation, CORS
- ⚡ **Optimized Queries**: No MAX(id) anti-pattern, proper indexing
- 📊 **Analytics**: Visit tracking, QR code tracking, daily/weekly stats
- 🏗️ **Modern Architecture**: Controllers, routes, middlewares separation
- 📝 **Logging**: Winston-based structured logging
- 🛡️ **Error Handling**: Global error handler with proper HTTP status codes

## Project Structure

```
server/
├── src/
│   ├── app.js              # Main application entry
│   ├── config/
│   │   ├── index.js        # Config exports
│   │   ├── database.js     # MySQL pool with promises
│   │   └── constants.js    # App constants
│   ├── controllers/
│   │   ├── index.js
│   │   ├── urlController.js      # URL generation & redirect
│   │   ├── statsController.js    # Statistics endpoints
│   │   ├── contactController.js  # Contact form
│   │   └── reportController.js   # URL reporting
│   ├── middlewares/
│   │   ├── index.js
│   │   ├── errorHandler.js       # Global error handling
│   │   ├── rateLimiter.js        # Rate limiting configs
│   │   ├── security.js           # Helmet config
│   │   └── validators.js         # Request validation
│   ├── models/
│   │   ├── index.js
│   │   ├── UrlModel.js           # URL database operations
│   │   ├── VisitModel.js         # Visit tracking
│   │   ├── ContactModel.js       # Contact submissions
│   │   ├── ReportModel.js        # URL reports
│   │   └── AnalyticsModel.js     # Analytics events
│   ├── routes/
│   │   ├── index.js
│   │   ├── generateRoutes.js
│   │   ├── redirectRoutes.js
│   │   ├── statsRoutes.js
│   │   ├── perLinkStatsRoutes.js
│   │   ├── contactRoutes.js
│   │   └── reportRoutes.js
│   └── utils/
│       ├── index.js
│       ├── helpers.js      # Utility functions
│       ├── logger.js       # Winston logger
│       └── validators.js   # Validation functions
├── scripts/
│   └── init-db.js          # Database initialization script
├── .env.example
├── .gitignore
├── package.json
├── vercel.json
└── README.md
```

## API Endpoints

### URL Management
- `POST /api/shorty-url/generate` - Generate short URL
- `GET /co/:params` - Redirect to original URL

### Statistics
- `GET /api/shorty-url/stats` - Overall statistics
- `GET /api/shorty-url/stats/dashboard` - Dashboard data
- `POST /api/shorty-url/stats/track-qr` - Track QR generation
- `POST /api/shorty-url/perlinkstats` - Per-link statistics

### Contact & Reports
- `POST /api/shorty-url/contact` - Submit contact form
- `POST /api/shorty-url/report` - Report a URL
- `GET /api/shorty-url/report/status/:id` - Check report status

### Health Check
- `GET /health` - Server health status

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Initialize database**
   ```bash
   npm run db:init
   ```
   This will create the database and all required tables automatically.

4. **Start server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with hot reload |
| `npm run db:init` | Initialize database and create tables |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment (development/production) | development |
| PORT | Server port | 8080 |
| DBHOST | Database host | - |
| DBPORT | Database port | 3306 |
| DBUSERNAME | Database username | - |
| DBPASS | Database password | - |
| DBNAME | Database name | - |
| SHORTURLDEF | Base URL for short links | https://short.msyb.dev/ |
| PARAMLEN | Length of short URL code | 5 |
| DOMAINS | Allowed CORS origins | http://localhost:3000 |
| METHODS | Allowed HTTP methods | GET,POST,OPTIONS |

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| General API | 100 requests / 15 min |
| URL Generation | 20 requests / 15 min |
| Reports | 5 requests / 15 min |
| Contact | 3 requests / 15 min |
| Redirects | 60 requests / 1 min |

## Security Features

- **Helmet.js**: Sets security HTTP headers
- **Rate Limiting**: Prevents abuse
- **Input Validation**: Validates all user inputs
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization
- **CORS**: Configurable origin whitelist

## Database Schema

The `npm run db:init` command creates the following tables:

| Table | Description |
|-------|-------------|
| `shorty_url` | Main URL storage with click tracking |
| `shorty_visits` | Individual visit tracking with IP/user agent |
| `shorty_contact` | Contact form submissions |
| `shorty_report` | URL abuse reports |
| `shorty_analytics` | Event analytics (QR scans, etc.) |

## License

ISC

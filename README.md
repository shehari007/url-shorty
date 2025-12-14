<div align="center">
  <img src="frontend/public/logo.png" height="120px" width="120px" alt="Shorty URL Logo">
  <h1>Shorty URL</h1>
  <p><strong>A modern, fast, and secure URL shortening service</strong></p>
  
  <a href="https://choosealicense.com/licenses/mit/">
    <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT License">
  </a>
  <img src="https://img.shields.io/badge/Build-Passing-green?style=flat-square" alt="Build Passing">
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/Ant%20Design-6-0170fe?style=flat-square&logo=antdesign" alt="Ant Design 6">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express" alt="Express">
</div>

---

## ✨ Features

- 🔗 **URL Shortening** — Create short, memorable links instantly
- 📱 **QR Code Generation** — Download QR codes for any shortened link
- 📊 **Link Analytics** — Track clicks, unique visitors, and performance
- 🌙 **Dark Mode** — Beautiful light and dark themes
- 🔒 **Secure** — HTTPS-only validation, rate limiting, and input sanitization
- 📝 **Link History** — Local storage-based history of your created links
- 🚨 **Report System** — Report suspicious or malicious links
- 📧 **Contact Form** — Built-in contact functionality
- 📱 **Responsive** — Works perfectly on desktop and mobile

## 🌐 Live Demo

- **Frontend**: [https://shorty.msyb.dev](https://shorty.msyb.dev)
- **API Server**: [https://short.msyb.dev](https://short.msyb.dev/health)

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, React Router 7, Ant Design 6, CSS3 |
| **Backend** | Node.js 18+, Express 4, MySQL |
| **Security** | Helmet.js, Rate Limiting, CORS, Input Validation |
| **Deployment** | Vercel (Serverless Ready) |

## 📁 Project Structure

```
url-shorty/
├── frontend/                 # React frontend application
│   ├── public/              # Static assets (logo, manifest, etc.)
│   └── src/
│       ├── pages/           # Page components (Home, Contact, Report, etc.)
│       ├── Components/      # Reusable components
│       ├── context/         # React context (Theme)
│       ├── services/        # API service layer
│       ├── App.js           # Main app with routing
│       └── App.css          # Global styles
│
├── server/                   # Express backend API
│   ├── scripts/             # Database initialization scripts
│   └── src/
│       ├── config/          # Database & app configuration
│       ├── controllers/     # Request handlers
│       ├── middlewares/     # Security, validation, rate limiting
│       ├── models/          # Database models
│       ├── routes/          # API route definitions
│       └── utils/           # Helper functions & logger
│
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- MySQL 8.0+ (or compatible: MariaDB, PlanetScale, etc.)
- npm or yarn

### 1. Clone the Repository

```bash
git clone https://github.com/shehari007/url-shorty.git
cd url-shorty
```

### 2. Setup Backend

```bash
cd server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Initialize database (creates all tables)
npm run db:init

# Start development server
npm run dev
```

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend will be available at `http://localhost:3000` and the API at `http://localhost:8080`.

## ⚙️ Environment Variables

### Server (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `8080` |
| `DBHOST` | MySQL host | - |
| `DBPORT` | MySQL port | `3306` |
| `DBUSERNAME` | Database username | - |
| `DBPASS` | Database password | - |
| `DBNAME` | Database name | - |
| `SHORTURLDEF` | Base URL for short links | `https://short.msyb.dev/` |
| `PARAMLEN` | Length of short URL code | `5` |
| `DOMAINS` | Allowed CORS origins | `http://localhost:3000` |

### Frontend (.env)

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | Backend API URL |

## 📡 API Endpoints

### URL Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/shorty-url/generate` | Create a short URL |
| `GET` | `/co/:shortCode` | Redirect to original URL |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/shorty-url/stats` | Get overall statistics |
| `POST` | `/api/shorty-url/perlinkstats` | Get stats for a specific link |
| `POST` | `/api/shorty-url/stats/track-qr` | Track QR code generation |

### Contact & Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/shorty-url/contact` | Submit contact form |
| `POST` | `/api/shorty-url/report` | Report a malicious URL |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server health check |

## 🔒 Security Features

- **Helmet.js** — Secure HTTP headers
- **Rate Limiting** — Prevent API abuse
- **Input Validation** — Sanitize all user inputs
- **SQL Injection Protection** — Parameterized queries
- **XSS Protection** — Content sanitization
- **CORS** — Configurable origin whitelist
- **HTTPS Validation** — Only secure URLs accepted

## 🗄️ Database Schema

| Table | Description |
|-------|-------------|
| `shorty_url` | Main URL storage with click tracking |
| `shorty_visits` | Individual visit tracking |
| `shorty_contact` | Contact form submissions |
| `shorty_report` | URL abuse reports |
| `shorty_analytics` | Event analytics (QR scans, etc.) |

Run `npm run db:init` in the server directory to create all tables automatically.

## 📜 Available Scripts

### Server

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with hot reload |
| `npm run db:init` | Initialize database tables |
| `npm run lint` | Run ESLint |

### Frontend

| Script | Description |
|--------|-------------|
| `npm start` | Start development server |
| `npm run build` | Create production build |
| `npm test` | Run tests |

## 🚢 Deployment

### Vercel (Recommended)

Both frontend and server are configured for Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy!

### Manual Deployment

```bash
# Frontend
cd frontend
npm run build
# Deploy the 'build' folder to your hosting

# Server
cd server
npm start
```

## 📸 Screenshots

<details>
<summary>Click to view screenshots</summary>

### Home Page
![Home Page](screenshots/home.png)

### Link Analytics
![Analytics](screenshots/analytics.png)

### Dark Mode
![Dark Mode](screenshots/dark-mode.png)

</details>

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**shehari007**

- GitHub: [@shehari007](https://github.com/shehari007)

---

<div align="center">
  <p>Made with ❤️ by shehari007</p>
  <p>⭐ Star this repo if you find it useful!</p>
</div>

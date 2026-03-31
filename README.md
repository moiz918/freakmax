# 🎬 FreakMax — Cinema Booking System

A full-stack web application for managing cinema bookings, movies, shows, and user administration. Built with a React.js frontend and a Node.js/Express.js backend connected to a Microsoft SQL Server database.

---

## 📖 About the Project

FreakMax is a complete cinema booking platform developed as a group project. It supports two types of users — regular customers who can browse movies and book seats, and admins who manage the entire cinema operation through a dedicated dashboard. The system handles everything from movie listings and seat selection to payment processing and complaint management.

---

## ✨ Features

### 👤 User Features
- 🔐 **Authentication** — Secure registration and login with JWT tokens
- 🎥 **Movie Browsing** — View all available movies with details, ratings, and genres
- 🪑 **Seat Booking** — Book movie shows with real-time seat selection
- 💳 **Payment Integration** — Secure payment processing for bookings
- 📋 **Booking History** — View and manage past and upcoming bookings
- 👤 **Profile Management** — Update personal info and preferences
- 📱 **Responsive Design** — Fully mobile-friendly interface

### 🛠️ Admin Features
- 📊 **Admin Dashboard** — Analytics and overview of the entire platform
- 🎬 **Movie Management** — Add, edit, and delete movies
- 🏟️ **Cinema Management** — Manage cinema locations and screens
- 🕐 **Show Management** — Create and manage show timings
- 🎟️ **Booking Management** — View and manage all user bookings
- 👥 **User Management** — Administer user accounts
- 💰 **Payment Tracking** — Monitor all payment transactions
- 📝 **Complaint Handling** — Manage user complaints and feedback
- 💺 **Seat Management** — Configure seat types and pricing

---

## ⚙️ Tech Stack

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React.js | 19.1.0 | UI framework |
| React Router DOM | 7.5.0 | Client-side routing |
| Axios | 1.8.4 | API communication |
| Tailwind CSS | 4.1.4 | Styling |
| React Toastify | 11.0.5 | Toast notifications |
| React Icons | 5.5.0 | Icon library |
| Date-fns | 4.1.0 | Date manipulation |

### Backend
| Package | Version | Purpose |
|---|---|---|
| Node.js + Express.js | 4.21.2 | Server & API framework |
| mssql | 11.0.1 | SQL Server database driver |
| jsonwebtoken | 9.0.2 | JWT authentication |
| bcrypt | 5.1.1 | Password hashing |
| cors | 2.8.5 | Cross-origin requests |
| dotenv | 16.4.7 | Environment variables |

### Database
- **Microsoft SQL Server** — Relational database for all app data

---

## 📁 Project Structure

```
freakmax/
├── backend/
│   ├── mainserver.js      # Main server entry point & route registration
│   ├── db.js              # SQL Server connection configuration
│   ├── authMidware.js     # JWT authentication middleware
│   ├── admin.js           # Admin API endpoints
│   ├── user.js            # User API endpoints
│   ├── movie.js           # Movie management endpoints
│   ├── booking.js         # Booking management endpoints
│   ├── payment.js         # Payment processing endpoints
│   ├── cinema.js          # Cinema management endpoints
│   ├── showtiming.js      # Show timing management
│   ├── screen.js          # Screen management
│   ├── seat.js            # Seat management
│   ├── complaint.js       # Complaint handling
│   └── package.json
├── frontend/
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── pages/
│       │   ├── HomePage.js
│       │   ├── UserLogin.js
│       │   ├── AdminLogin.js
│       │   ├── AdminDashboard.js
│       │   ├── BookingPage.js
│       │   └── ...
│       ├── App.js         # Root component with routing
│       └── index.js       # Entry point
└── README.md
```

---

## 📡 API Endpoints

### Auth & Users
- `POST /api/users/register` — Register a new user
- `POST /api/users/login` — User login
- `GET /api/users/profile` — Get user profile
- `PUT /api/users/profile` — Update user profile

### Movies
- `GET /api/movies` — Get all movies
- `GET /api/movies/top5` — Get top 5 movies
- `GET /api/movies/children-friendly` — Get children-friendly movies
- `POST /api/movies` — Add movie *(admin only)*
- `PUT /api/movies/:id` — Update movie *(admin only)*
- `DELETE /api/movies/:id` — Delete movie *(admin only)*

### Bookings
- `GET /api/bookings` — Get user bookings
- `POST /api/bookings` — Create a new booking
- `GET /api/bookings/:id` — Get booking details
- `PUT /api/bookings/:id` — Update booking

### Admin
- `POST /api/admins/login` — Admin login
- `GET /api/admins/me` — Get admin profile
- `PUT /api/admins/:id` — Update admin profile

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js v14+
- Microsoft SQL Server
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder:

```env
DB_SERVER=your_sql_server_host
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_PORT=1433
JWT_SECRET=your_jwt_secret_key
```

```bash
npm start
# Runs on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000
```

### Access the App
- **User Interface:** `http://localhost:3000`
- **Admin Panel:** `http://localhost:3000/admin/login`

---

## 🔐 Security
- JWT tokens for stateless authentication
- Passwords hashed with bcrypt
- Role-based access control (User vs Admin)
- CORS configured for secure cross-origin requests

---

## 👥 Group Project

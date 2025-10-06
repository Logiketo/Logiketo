# Logiketo - Logistics Management Platform

A comprehensive logistics management system for fleet operations, dispatch management, and real-time tracking.

## 🚀 Features

### Current Features (Based on Screenshots)
- **Dashboard**: Main overview with key metrics
- **Fleet Management**: Vehicle tracking and management
- **Employee Management**: Staff and driver management
- **Customer Management**: Client database and relationships
- **Unit Management**: Cargo and shipment tracking
- **Mapping**: Interactive maps for route planning
- **Active Orders**: Real-time order management
- **Delivery Management**: Completed deliveries tracking
- **Summary Reports**: Business analytics and reporting
- **Dispatch Management**: Order assignment and routing

### Future Features
- **Live Tracking**: Real-time GPS tracking with WebSocket connections
- **Ultra Accounting**: Advanced financial management and invoicing
- **Mobile App**: iOS and Android applications
- **Advanced Analytics**: Business intelligence dashboard
- **API Integration**: Third-party logistics services

## 🏗️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Query** for state management
- **Socket.io Client** for real-time features

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** database
- **Prisma** ORM
- **Socket.io** for real-time communication
- **JWT** for authentication
- **Bcrypt** for password hashing

### Future Mobile
- **React Native** for cross-platform mobile app

## 📁 Project Structure

```
logiketo/
├── frontend/                 # React.js web application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── package.json
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript types
│   ├── prisma/             # Database schema and migrations
│   └── package.json
├── mobile/                  # Future React Native app
├── docs/                   # Documentation
├── deployment/             # Docker and deployment configs
└── package.json           # Root package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/logiketo.git
   cd logiketo
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   # Copy example environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

4. **Set up the database**
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 🌐 Domain Setup

Domain: **logiketo.com**

### Recommended Hosting
- **Frontend**: Vercel or Netlify
- **Backend**: Railway, Heroku, or DigitalOcean
- **Database**: Railway PostgreSQL or Supabase
- **CDN**: Cloudflare

## 📱 Future Mobile App

The mobile app will be built using React Native and will include:
- Driver mobile app for delivery tracking
- Customer app for order tracking
- Admin mobile dashboard
- Push notifications for real-time updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support, email support@logiketo.com or create an issue in the repository.

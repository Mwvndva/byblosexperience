# Byblos Atelier Vogue

A modern e-commerce platform for discovering and selling unique fashion items with an emphasis on aesthetic categories. Built with a modern tech stack for optimal performance and developer experience.

## 🌟 Features

- 📭 Browse products by aesthetic categories
- 🏪 Seller dashboard for product management
- 힖 Responsive design with modern UI components
- 🔍 Advanced product filtering and search functionality
- 🛒 Shopping cart and checkout process
- 🔐 Secure JWT-based authentication system
-  Mobile-first responsive design
- 💎 Product management with image uploads
- 📋 Order tracking and management
- 📤 Real-time inventory updates
- 🛍️ Browse products by aesthetic categories
- 🏪 Seller dashboard for product management
- 🖼️ Responsive design with modern UI components
- 🔍 Advanced product filtering and search
- 🛒 Shopping cart functionality
- 🔐 Secure authentication system
- 📱 Mobile-friendly interface

## 🚀 Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with CSS Modules
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: React Query for server state
- **Forms**: React Hook Form with Zod validation
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Testing**: Playwright for E2E testing

### Backend
- **Runtime**: Node.js 18+ with Express
- **Database**: PostgreSQL 13+
- **ORM**: Knex.js for query building
- **Authentication**: JWT with refresh tokens
- **Validation**: Express Validator
- **Logging**: Winston
- **API**: RESTful API design

## 🛠️ Prerequisites

- **Node.js** 18+ (LTS version recommended)
- **npm** 9+ or **yarn** 1.22+
- **PostgreSQL** 13+ (with pgAdmin for database management)
- **Git** for version control
- **Modern web browser** (Chrome, Firefox, Safari, or Edge)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/byblos-atelier-vogue.git
cd byblos-atelier-vogue
```

### 2. Install dependencies

```bash
# Install frontend dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 3. Set up environment variables

#### Frontend (root `.env`)
```env
# API Configuration
VITE_API_URL=http://localhost:3002/api

# Optional: Set to 'production' when deploying
NODE_ENV=development

# Optional: Google Analytics (if used)
# VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

#### Backend (server/.env)
```env
# Server Configuration
PORT=3002
NODE_ENV=development

# Database Configuration
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=byblos_atelier
DB_HOST=localhost
DB_PORT=5432

# JWT Configuration
JWT_SECRET=generate_a_strong_secret_here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Optional: Email configuration (if implemented)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=your_email@example.com
# SMTP_PASS=your_email_password
```

### 4. Set up the database

1. **Create a new PostgreSQL database**
   ```sql
   CREATE DATABASE byblos_atelier;
   CREATE USER your_db_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE byblos_atelier TO your_db_user;
   ```

2. **Run database migrations**
   ```bash
   # Navigate to server directory
   cd server
   
   # Install Knex CLI globally (if not already installed)
   npm install -g knex
   
   # Run migrations
   npx knex migrate:latest
   
   # Seed the database with sample data (optional)
   npx knex seed:run
   ```

3. **Verify the database**
   - Connect to your database using pgAdmin or psql
   - Verify that all tables were created successfully

### 5. Start the development servers

#### Terminal 1: Frontend
```bash
# From the project root
npm run dev
```

#### Terminal 2: Backend
```bash
# From the server directory
cd server
npm run dev
```

Once both servers are running:
- Frontend will be available at: `http://localhost:5173`
- Backend API will be available at: `http://localhost:3002/api`

### 6. Access the application

- **Customer View**: `http://localhost:5173`
- **Seller Dashboard**: `http://localhost:5173/seller/dashboard`
- **API Documentation**: `http://localhost:3002/api-docs` (if Swagger/OpenAPI is set up)

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run tests in UI mode
npm run test:ui
```

## 🏗️ Build for Production

```bash
# Build the frontend
npm run build

# Start the production server (from server directory)
cd server
npm start
```

## 📂 Project Structure

```
├── public/               # Static files
├── server/               # Backend server code
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/      # API routes
│   │   └── utils/       # Utility functions
│   └── knexfile.js      # Knex configuration
├── src/
│   ├── api/            # API service functions
│   ├── assets/          # Static assets
│   ├── components/      # Reusable UI components
│   ├── contexts/        # React contexts
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   ├── routes/          # Application routes
│   ├── styles/          # Global styles
│   └── types/           # TypeScript type definitions
├── .gitignore
├── package.json
├── README.md
└── tsconfig.json
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Tailwind CSS](https://tailwindcss.com/) for utility-first CSS
- [Vite](https://vitejs.dev/) for the amazing developer experience
- [React Query](https://tanstack.com/query) for server state management

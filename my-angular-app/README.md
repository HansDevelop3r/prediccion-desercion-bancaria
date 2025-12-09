# My Angular App - CHURN PREDICTION

This project is a full-stack Angular application with Node.js backend and MySQL database that includes user authentication, file upload functionality, and data visualization.

## 🚀 Features

- ✅ **User Authentication** with JWT tokens
- ✅ **File Upload** with MySQL storage
- ✅ **Data Visualization** with Chart.js
- ✅ **MySQL Database** integration
- ✅ **Responsive Design**
- ✅ **Real-time Statistics**

## 🏗️ Project Structure

```
my-angular-app
├── src/                          # Frontend Angular
│   ├── app/
│   │   ├── login/               # Login component
│   │   ├── upload/              # Upload component
│   │   ├── auth.service.ts      # Authentication service
│   │   ├── api.service.ts       # API service
│   │   └── auth.guard.ts        # Route guard
│   └── assets/                  # Static assets
├── backend/                     # Backend Node.js
│   ├── server.js               # Express server
│   ├── database.js             # MySQL connection
│   ├── package.json            # Backend dependencies
│   └── .env                    # Environment variables
├── CONFIGURACION_DB.md         # Database setup guide
└── iniciar-proyecto.ps1        # PowerShell startup script
```

## 📋 Prerequisites

- Node.js (v14 or higher)
- Angular CLI (`npm install -g @angular/cli`)
- MySQL Server (v8.0 or higher)
- PowerShell (for Windows startup script)

## 🛠️ Installation & Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd my-angular-app
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Install Backend Dependencies
```bash
cd backend
npm install
```

### 4. Setup MySQL Database
1. Install and start MySQL Server
2. Create database: `CREATE DATABASE my_angular_app_db;`
3. Configure environment variables in `backend/.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=my_angular_app_db
DB_PORT=3306
PORT=3000
JWT_SECRET=your_very_secure_jwt_secret_here
```

### 5. Start the Application

#### Option A: Use PowerShell Script (Windows)
```powershell
.\iniciar-proyecto.ps1
```

#### Option B: Manual Start
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd ..
ng serve
```

## 🌐 Access Points

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api

## 🗄️ Database Schema

### usuarios table
- `id` - INT, PRIMARY KEY, AUTO_INCREMENT
- `username` - VARCHAR(50), UNIQUE
- `password` - VARCHAR(255), hashed
- `email` - VARCHAR(100)
- `fecha_creacion` - TIMESTAMP

### archivos_cargados table
- `id` - INT, PRIMARY KEY, AUTO_INCREMENT
- `nombre` - VARCHAR(255)
- `descripcion` - TEXT
- `usuario_id` - INT, FOREIGN KEY
- `username` - VARCHAR(50)
- `fecha_carga` - TIMESTAMP
- `tamaño` - INT
- `tipo_archivo` - VARCHAR(100)
- `ruta_archivo` - VARCHAR(500)

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Files
- `POST /api/files/upload` - Upload file (requires auth)
- `GET /api/files` - Get user files (requires auth)
- `DELETE /api/files/:id` - Delete file (requires auth)

### Statistics
- `GET /api/stats/uploads-by-date` - Get upload statistics (requires auth)

## 🧪 Testing

### Create Test User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","email":"admin@test.com"}'
```

### Login Test
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 🛡️ Security Features

- **JWT Authentication** with secure tokens
- **Password Hashing** with bcryptjs
- **CORS Protection** configured
- **Route Guards** for protected pages
- **SQL Injection Protection** with prepared statements

## 🎨 Technologies Used

### Frontend
- Angular (v14)
- TypeScript
- Chart.js / ng2-charts
- RxJS
- HTML/CSS

### Backend
- Node.js
- Express.js
- MySQL2
- JWT (jsonwebtoken)
- Multer (file uploads)
- bcryptjs (password hashing)

## 📝 Usage

1. **Register/Login**: Create account or login with existing credentials
2. **Upload Files**: Select and upload files with descriptions
3. **View Files**: See uploaded files in organized table
4. **Statistics**: View upload statistics in interactive charts
5. **Logout**: Secure logout with token cleanup

## 🐛 Troubleshooting

### Common Issues

1. **MySQL Connection Error**
   - Verify MySQL is running
   - Check credentials in `.env` file
   - Ensure database exists

2. **CORS Errors**
   - Backend should be running on port 3000
   - Frontend should be running on port 4200

3. **Authentication Issues**
   - Check JWT_SECRET in `.env`
   - Clear browser local storage

## 📄 License

This project is licensed under the MIT License.

## 👥 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request
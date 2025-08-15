import dotenv from 'dotenv';
dotenv.config(); // Carga .env del directorio actual del proceso

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inventory_app',
  jwtSecret: process.env.JWT_SECRET || 'change_this_secret',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@empresa.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin12345'
};



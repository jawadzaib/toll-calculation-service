import express from 'express';
import cookieParser from 'cookie-parser';
import { interchanges } from './config';
import { connectDB, getPool } from './db';
import { tollRoutes } from './tollRoutes';
import { authRoutes } from './authRoutes';

const app = express();
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 3000;

// Connect to DB then start the server
connectDB().then(() => {
  const pool = getPool();
  app.use('/api/auth', authRoutes(pool));
  app.use('/api', tollRoutes(pool));

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Available Interchanges:', Object.keys(interchanges).join(', '));
  });
});

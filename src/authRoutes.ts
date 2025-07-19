import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { interchanges } from './config';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export const authRoutes = (pool: Pool): Router => {
  const router = Router();

  // User registration
  router.post('/register', async (req: Request, res: Response) => {
    const { username, password, interchange } = req.body;
    if (!username || !password || !interchange) {
      return res.status(400).json({ message: 'Username, password and interchange are required.' });
    }
    if (!Object.keys(interchanges).includes(interchange)) {
      return res.status(400).json({ message: `Invalid interchange: ${interchange}` });
    }
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.query(
        'INSERT INTO users (username, password, interchange) VALUES ($1, $2, $3)',
        [username, passwordHash, interchange]
      );
      return res.status(201).json({ message: 'User registered successfully.' });
    } catch (err: any) {
      if (err.code === '23505') {
        return res.status(409).json({ message: 'Username already exists.' });
      }
      return res.status(500).json({ message: 'Internal server error: ' + err.message });
    }
  });

  // User login
  router.post('/login', async (req: Request, res: Response) => {
    const { username, password, interchange } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }
    if (interchange) {
      if (!Object.keys(interchanges).includes(interchange)) {
        return res.status(400).json({ message: `Invalid interchange: ${interchange}` });
      }
    }
    try {
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid username or password.' });
      }
      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: 'Invalid username or password.' });
      }
      const finalInterchange = interchange || user.interchange;
      const token = jwt.sign(
        { username: user.username, interchange: finalInterchange },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });
      return res.json({ message: 'Login successful', interchange: finalInterchange });
    } catch (err: any) {
      return res.status(500).json({ message: 'Internal server error: ' + err.message });
    }
  });

  return router;
};
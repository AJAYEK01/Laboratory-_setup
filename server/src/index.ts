import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middlewares
app.use(cors({
  origin: '*', // In production, restrict to allowed domain(s)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Branch-Id'],
}));

// Generous payload limit for high volume offline batch sync (200+ records)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Mount Central API
app.use('/api', apiRoutes);

// Root greeting
app.get('/', (req, res) => {
  res.json({
    message: 'Village LabPulse Central Multi-Branch API Gateway',
    version: '2.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(`  LabPulse Central Server Live on port ${PORT}`);
  console.log(`  Security: JWT Auth + Bcrypt + RBAC Active`);
  console.log(`  Multi-Branch: Branch Isolation & Consolidated Analytics`);
  console.log(`========================================================`);
});

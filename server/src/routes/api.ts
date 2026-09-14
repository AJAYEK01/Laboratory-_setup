import { Router } from 'express';
import { login, getMe } from '../controllers/authController';
import { getAllBranches, createBranch } from '../controllers/branchController';
import { pushSync, pullSync } from '../controllers/syncController';
import { getAnalyticsOverview, getAuditLogs } from '../controllers/analyticsController';
import { authenticateToken, requireRoles } from '../middleware/auth';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), server: 'LabPulse Central HQ' });
});

// Authentication Routes
router.post('/auth/login', login);
router.get('/auth/me', authenticateToken, getMe);

// Branch Management Routes
router.get('/branches', getAllBranches);
router.post('/branches', authenticateToken, requireRoles('owner'), createBranch);

// Multi-Branch Synchronization Routes
router.post('/sync/push', pushSync); // Can be called by authenticated branch sync agent
router.get('/sync/pull', pullSync);

// Consolidated Analytics & Audit Trail
router.get('/analytics/overview', authenticateToken, getAnalyticsOverview);
router.get('/analytics/audit-logs', authenticateToken, requireRoles('owner'), getAuditLogs);

export default router;

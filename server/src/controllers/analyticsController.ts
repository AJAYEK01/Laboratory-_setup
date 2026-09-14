import { Response } from 'express';
import { centralDB } from '../db/centralDb';
import { AuthenticatedRequest } from '../middleware/auth';

export const getAnalyticsOverview = (req: AuthenticatedRequest, res: Response): void => {
  // If user is a branch technician, restrict view to their branch only
  let branchId = req.query.branchId as string | undefined;
  if (req.user && req.user.role !== 'owner' && req.user.branchId) {
    branchId = req.user.branchId;
  }

  const date = req.query.date as string | undefined;
  const analytics = centralDB.getAnalytics(branchId, date);

  res.json({
    success: true,
    analytics,
  });
};

export const getAuditLogs = (req: AuthenticatedRequest, res: Response): void => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const logs = centralDB.getAuditLogs(limit);
  res.json({
    success: true,
    logs,
  });
};

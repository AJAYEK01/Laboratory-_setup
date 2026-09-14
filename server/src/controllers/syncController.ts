import { Request, Response } from 'express';
import { centralDB } from '../db/centralDb';
import { AuthenticatedRequest } from '../middleware/auth';

export const pushSync = (req: AuthenticatedRequest, res: Response): void => {
  const { branchId, branchCode, patients = [], orders = [] } = req.body;

  if (!branchId) {
    res.status(400).json({ success: false, message: 'Branch ID is required for synchronization.' });
    return;
  }

  const branch = centralDB.getBranchById(branchId);
  const effectiveCode = branch ? branch.code : (branchCode || 'BR00');

  // Verify branch permissions if authenticated
  if (req.user && req.user.role !== 'owner' && req.user.branchId && req.user.branchId !== branchId) {
    res.status(403).json({ success: false, message: 'Forbidden: You cannot sync records for a different branch.' });
    return;
  }

  try {
    centralDB.batchUpsertRecords(branchId, effectiveCode, patients, orders);

    const totalSynced = patients.length + orders.length;

    if (totalSynced > 0) {
      centralDB.logAudit({
        userId: req.user?.userId || 'branch_sync_agent',
        username: req.user?.username || `sync_${effectiveCode}`,
        branchId,
        action: 'OFFLINE_SYNC_PUSH',
        details: `Synchronized ${patients.length} patient(s) and ${orders.length} order(s) from branch ${effectiveCode}.`,
      });
    }

    res.json({
      success: true,
      message: `Successfully synchronized ${totalSynced} record(s) to central cloud.`,
      syncedPatients: patients.length,
      syncedOrders: orders.length,
      serverTimestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Push sync error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during sync processing.' });
  }
};

export const pullSync = (req: AuthenticatedRequest, res: Response): void => {
  const branchId = (req.query.branchId as string) || (req.user?.branchId || undefined);
  const date = req.query.date as string | undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 100;

  const orders = centralDB.getOrders({ branchId, date, limit });
  res.json({
    success: true,
    orders,
    branches: centralDB.getBranches(),
  });
};

import { Request, Response } from 'express';
import { centralDB } from '../db/centralDb';
import { AuthenticatedRequest } from '../middleware/auth';

export const getAllBranches = (req: Request, res: Response): void => {
  const branches = centralDB.getBranches();
  res.json({ success: true, branches });
};

export const createBranch = (req: AuthenticatedRequest, res: Response): void => {
  const { code, name, address, phone } = req.body;

  if (!code || !name) {
    res.status(400).json({ success: false, message: 'Branch code and name are required.' });
    return;
  }

  const existing = centralDB.getBranchByCode(code);
  if (existing) {
    res.status(409).json({ success: false, message: `Branch with code '${code}' already exists.` });
    return;
  }

  const newBranch = centralDB.createBranch({
    id: `branch-${Date.now()}`,
    code,
    name,
    address: address || '',
    phone: phone || '',
    isActive: true,
  });

  if (req.user) {
    centralDB.logAudit({
      userId: req.user.userId,
      username: req.user.username,
      branchId: newBranch.id,
      action: 'CREATE_BRANCH',
      details: `Created new lab branch: ${newBranch.name} (${newBranch.code}).`,
    });
  }

  res.status(201).json({ success: true, branch: newBranch });
};

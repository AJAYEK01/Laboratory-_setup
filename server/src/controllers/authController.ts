import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { centralDB } from '../db/centralDb';
import { JWT_SECRET, AuthPayload, AuthenticatedRequest } from '../middleware/auth';

export const login = (req: Request, res: Response): void => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ success: false, message: 'Username and password are required.' });
    return;
  }

  const user = centralDB.getUserByUsername(username);
  if (!user || !user.isActive) {
    res.status(401).json({ success: false, message: 'Invalid credentials or inactive account.' });
    return;
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    res.status(401).json({ success: false, message: 'Invalid credentials.' });
    return;
  }

  const branch = user.branchId ? centralDB.getBranchById(user.branchId) : null;

  const payload: AuthPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    branchId: user.branchId,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  // Audit log
  centralDB.logAudit({
    userId: user.id,
    username: user.username,
    branchId: user.branchId,
    action: 'USER_LOGIN',
    details: `User logged in successfully from ${branch ? branch.name : 'Central HQ'}.`,
  });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      branchId: user.branchId,
      branch: branch || null,
    },
  });
};

export const getMe = (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const user = centralDB.getUserById(req.user.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const branch = user.branchId ? centralDB.getBranchById(user.branchId) : null;

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      branchId: user.branchId,
      branch: branch || null,
    },
  });
};

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  branchId: string | null; // null = Global Owner / Central HQ
  username: string;
  passwordHash: string;
  fullName: string;
  role: 'owner' | 'branch_manager' | 'technician' | 'pathologist';
  isActive: boolean;
  createdAt: string;
}

export interface CentralPatient {
  id: string;
  branchId: string;
  branchCode: string;
  name: string;
  age: number;
  ageUnit: string;
  gender: string;
  phone: string;
  address?: string;
  referralDoctor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CentralOrder {
  id: string;
  branchId: string;
  branchCode: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientAgeUnit: string;
  patientGender: string;
  patientPhone: string;
  referralDoctor: string;
  orderDate: string;
  orderTime: string;
  tests: any[];
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  paymentMode: string;
  overallStatus: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  branchId: string | null;
  action: string;
  details: string;
}

interface CentralDatabaseSchema {
  branches: Branch[];
  users: User[];
  patients: CentralPatient[];
  orders: CentralOrder[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'central_lab_data.json');

class CentralDBManager {
  private data: CentralDatabaseSchema = {
    branches: [],
    users: [],
    patients: [],
    orders: [],
    auditLogs: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error('Error loading central database, initializing fresh:', err);
        this.seedInitialData();
      }
    } else {
      this.seedInitialData();
    }
  }

  private persist() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write to central database:', err);
    }
  }

  private seedInitialData() {
    const now = new Date().toISOString();

    // 1. Seed Pre-Configured Branches
    const branches: Branch[] = [
      {
        id: 'branch-01',
        code: 'BR01',
        name: 'Divine Laboratory - Koottummugham, Sreekandapuram',
        address: 'Koottummugham, Sreekandapuram, Kannur, Kerala',
        phone: '+91 94470 12345',
        isActive: true,
        createdAt: now,
      },
      {
        id: 'branch-02',
        code: 'BR02',
        name: 'Divine Laboratory - Chandanakkampara, Payyavoor',
        address: 'Chandanakkampara, Payyavoor, Kannur, Kerala',
        phone: '+91 94470 67890',
        isActive: true,
        createdAt: now,
      },
    ];

    // 2. Seed Default Accounts
    // Owner password: 'Owner@2026!'
    // Tech password:  'Tech@123!'
    const ownerHash = bcrypt.hashSync('Owner@2026!', 10);
    const techHash = bcrypt.hashSync('Tech@123!', 10);

    const users: User[] = [
      {
        id: 'user-owner',
        branchId: null, // Global access to all branches
        username: 'owner',
        passwordHash: ownerHash,
        fullName: 'Lab Owner / Director (Divine Laboratory)',
        role: 'owner',
        isActive: true,
        createdAt: now,
      },
      {
        id: 'user-tech-koottummugham',
        branchId: 'branch-01',
        username: 'tech_koottummugham',
        passwordHash: techHash,
        fullName: 'Medical Lab Technician (Koottummugham Branch)',
        role: 'technician',
        isActive: true,
        createdAt: now,
      },
      {
        id: 'user-tech-chandanakkampara',
        branchId: 'branch-02',
        username: 'tech_chandanakkampara',
        passwordHash: techHash,
        fullName: 'Medical Lab Technician (Chandanakkampara Branch)',
        role: 'technician',
        isActive: true,
        createdAt: now,
      },
    ];

    this.data = {
      branches,
      users,
      patients: [],
      orders: [],
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: now,
          userId: 'system',
          username: 'system',
          branchId: null,
          action: 'INIT_SYSTEM',
          details: 'Central multi-branch laboratory database initialized.',
        },
      ],
    };

    this.persist();
  }

  // Branch Getters & Setters
  public getBranches(): Branch[] {
    return this.data.branches;
  }

  public getBranchById(id: string): Branch | undefined {
    return this.data.branches.find(b => b.id === id);
  }

  public getBranchByCode(code: string): Branch | undefined {
    return this.data.branches.find(b => b.code.toUpperCase() === code.toUpperCase());
  }

  public createBranch(branch: Omit<Branch, 'createdAt'>): Branch {
    const newBranch: Branch = {
      ...branch,
      code: branch.code.toUpperCase().trim(),
      createdAt: new Date().toISOString(),
    };
    this.data.branches.push(newBranch);
    this.persist();
    return newBranch;
  }

  // User Getters
  public getUserByUsername(username: string): User | undefined {
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  // Multi-Branch Batch Sync Push
  public batchUpsertRecords(branchId: string, branchCode: string, patients: CentralPatient[], orders: CentralOrder[]) {
    // 1. Upsert patients
    patients.forEach(patient => {
      const existingIdx = this.data.patients.findIndex(p => p.id === patient.id);
      const safePatient: CentralPatient = {
        ...patient,
        branchId,
        branchCode,
      };
      if (existingIdx >= 0) {
        this.data.patients[existingIdx] = safePatient;
      } else {
        this.data.patients.push(safePatient);
      }
    });

    // 2. Upsert orders
    orders.forEach(order => {
      const existingIdx = this.data.orders.findIndex(o => o.id === order.id);
      const safeOrder: CentralOrder = {
        ...order,
        branchId,
        branchCode,
      };
      if (existingIdx >= 0) {
        this.data.orders[existingIdx] = safeOrder;
      } else {
        this.data.orders.push(safeOrder);
      }
    });

    this.persist();
  }

  // Querying Orders with multi-branch filters
  public getOrders(filters: { branchId?: string; date?: string; searchQuery?: string; limit?: number }) {
    let result = [...this.data.orders];

    if (filters.branchId && filters.branchId !== 'all') {
      result = result.filter(o => o.branchId === filters.branchId);
    }

    if (filters.date) {
      result = result.filter(o => o.orderDate === filters.date);
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(o =>
        o.patientName.toLowerCase().includes(q) ||
        o.patientPhone.includes(q) ||
        o.id.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filters.limit) {
      result = result.slice(0, filters.limit);
    }

    return result;
  }

  // Consolidated Analytics
  public getAnalytics(branchId?: string, targetDate?: string) {
    const todayStr = targetDate || new Date().toISOString().split('T')[0];
    const isFiltered = branchId && branchId !== 'all';

    const scopedOrders = isFiltered
      ? this.data.orders.filter(o => o.branchId === branchId)
      : this.data.orders;

    const todayOrders = scopedOrders.filter(o => o.orderDate === todayStr);

    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    const todayCash = todayOrders.filter(o => o.paymentMode === 'Cash').reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    const todayUpi = todayOrders.filter(o => o.paymentMode === 'UPI / Online').reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    const todayDue = todayOrders.reduce((sum, o) => sum + (o.balanceAmount || 0), 0);
    const lifetimeRevenue = scopedOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);

    // Branch-by-Branch breakdown
    const branchBreakdown = this.data.branches.map(b => {
      const bOrders = this.data.orders.filter(o => o.branchId === b.id);
      const bTodayOrders = bOrders.filter(o => o.orderDate === todayStr);
      const bTodayRevenue = bTodayOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
      const bLifetimeRevenue = bOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);

      return {
        branchId: b.id,
        branchCode: b.code,
        branchName: b.name,
        todayPatients: bTodayOrders.length,
        todayRevenue: bTodayRevenue,
        lifetimePatients: bOrders.length,
        lifetimeRevenue: bLifetimeRevenue,
      };
    });

    return {
      todayDate: todayStr,
      activeBranchFilter: branchId || 'all',
      todayPatients: todayOrders.length,
      todayRevenue,
      todayCash,
      todayUpi,
      todayDue,
      lifetimePatients: scopedOrders.length,
      lifetimeRevenue,
      branchBreakdown,
      totalBranches: this.data.branches.length,
    };
  }

  public logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    this.data.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...log,
    });
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.persist();
  }

  public getAuditLogs(limit: number = 50): AuditLog[] {
    return this.data.auditLogs.slice(0, limit);
  }
}

export const centralDB = new CentralDBManager();

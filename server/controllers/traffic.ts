import { Request, Response } from 'express';
import { getDatabase } from '../database';
import { performance } from 'perf_hooks';

export interface TelemetryLog {
  id: string;
  tenantId: string | number;
  tenantSubdomain: string;
  pagePath: string;
  pageTitle: string;
  responseTimeMs: number;
  statusCode: number;
  deviceType: string;
  userAgent?: string;
  timestamp: string;
}

// In-Memory Volatile Telemetry Buffer (Zero DB Storage, max 100 entries)
const transientLogs: TelemetryLog[] = [];
const MAX_TRANSIENT_LOGS = 100;

/**
 * Record transient user page visit telemetry (In-Memory Only)
 */
export const recordTelemetry = async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      tenantSubdomain,
      pagePath,
      pageTitle,
      responseTimeMs,
      statusCode = 200,
      deviceType = 'Desktop'
    } = req.body;

    if (!pagePath) {
      return res.status(400).json({ error: 'pagePath is required' });
    }

    const logEntry: TelemetryLog = {
      id: Math.random().toString(36).substring(2, 9),
      tenantId: tenantId || (req.headers['x-tenant-id'] as string) || '1',
      tenantSubdomain: tenantSubdomain || 'demo',
      pagePath,
      pageTitle: pageTitle || pagePath,
      responseTimeMs: Number(responseTimeMs) || 0,
      statusCode: Number(statusCode) || 200,
      deviceType,
      userAgent: (req.headers['user-agent'] || '').substring(0, 150),
      timestamp: new Date().toISOString()
    };

    transientLogs.unshift(logEntry);
    if (transientLogs.length > MAX_TRANSIENT_LOGS) {
      transientLogs.length = MAX_TRANSIENT_LOGS;
    }

    return res.json({ success: true, message: 'Telemetry recorded in memory.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get live transient metrics & active traffic feed for SuperAdmin (In-Memory Only)
 */
export const getLiveMetrics = async (req: Request, res: Response) => {
  try {
    const tenantFilter = req.query.tenantId ? String(req.query.tenantId) : null;
    const filteredLogs = tenantFilter
      ? transientLogs.filter(log => String(log.tenantId) === tenantFilter || log.tenantSubdomain === tenantFilter)
      : transientLogs;

    const totalViews = filteredLogs.length;
    const avgResponseTimeMs = totalViews > 0
      ? Math.round(filteredLogs.reduce((acc, log) => acc + log.responseTimeMs, 0) / totalViews)
      : 0;

    const fastCount = filteredLogs.filter(l => l.responseTimeMs < 150).length;
    const goodCount = filteredLogs.filter(l => l.responseTimeMs >= 150 && l.responseTimeMs < 300).length;
    const moderateCount = filteredLogs.filter(l => l.responseTimeMs >= 300 && l.responseTimeMs < 600).length;
    const slowCount = filteredLogs.filter(l => l.responseTimeMs >= 600).length;

    return res.json({
      totalViews,
      avgResponseTimeMs,
      healthDistribution: {
        fast: fastCount,
        good: goodCount,
        moderate: moderateCount,
        slow: slowCount
      },
      recentLogs: filteredLogs
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Clear in-memory telemetry logs
 */
export const clearTransientLogs = async (req: Request, res: Response) => {
  transientLogs.length = 0;
  return res.json({ success: true, message: 'In-memory telemetry logs cleared.' });
};

/**
 * Page Definition for Performance Probing
 */
interface CustomerPageSpec {
  id: string;
  name: string;
  path: string;
  category: string;
  queryExecutor: (db: any, tenantIdNum: number) => Promise<any>;
}

const CUSTOMER_PAGES: CustomerPageSpec[] = [
  {
    id: 'dashboard',
    name: 'Dashboard Overview',
    path: '/dashboard',
    category: 'Core Navigation',
    queryExecutor: async (db, tenantIdNum) => {
      const [loans, collections, usersCount] = await Promise.all([
        db.get("SELECT COUNT(*) as count, SUM(l.Amount) as total FROM Loan l JOIN LoanMember lm ON lm.LoanId = l.Id JOIN users u ON u.id = lm.UserId WHERE u.tenantId = ?", [tenantIdNum]),
        db.get("SELECT COALESCE(SUM(mc.Amount), 0) as total FROM MemberCollection mc JOIN users u ON mc.UserId = u.id WHERE u.tenantId = ?", [tenantIdNum]),
        db.get("SELECT COUNT(*) as count FROM users WHERE tenantId = ?", [tenantIdNum])
      ]);
      return { loans, collections, usersCount };
    }
  },
  {
    id: 'fund-collection',
    name: 'Fund Collection Register',
    path: '/fund-collection',
    category: 'Collections',
    queryExecutor: async (db, tenantIdNum) => {
      const [types, collections] = await Promise.all([
        db.all("SELECT * FROM CollectionType WHERE tenantId = ?", [tenantIdNum]),
        db.all("SELECT mc.*, u.fullName as userName, ct.TypeName FROM MemberCollection mc JOIN users u ON mc.UserId = u.id JOIN FundCollectionGroup fcg ON mc.CollectionGroupId = fcg.Id JOIN CollectionType ct ON fcg.CollectionTypeId = ct.Id WHERE u.tenantId = ? ORDER BY mc.Id DESC LIMIT 50", [tenantIdNum])
      ]);
      return { types, collections };
    }
  },
  {
    id: 'loan-list',
    name: 'Loans Registry & Status',
    path: '/loan-list',
    category: 'Loan Portfolio',
    queryExecutor: async (db, tenantIdNum) => {
      const loans = await db.all(
        "SELECT l.*, u.fullName as memberName FROM Loan l JOIN LoanMember lm ON lm.LoanId = l.Id JOIN users u ON u.id = lm.UserId WHERE u.tenantId = ? ORDER BY l.Id DESC LIMIT 50",
        [tenantIdNum]
      );
      return { loans };
    }
  },
  {
    id: 'loan-entry',
    name: 'Loan Request & Issuance Entry',
    path: '/loan-entry',
    category: 'Loan Portfolio',
    queryExecutor: async (db, tenantIdNum) => {
      const [members, slabs] = await Promise.all([
        db.all("SELECT id, fullName, phoneNumber FROM users WHERE tenantId = ?", [tenantIdNum]),
        db.all("SELECT * FROM LoanInterestSlab LIMIT 50")
      ]);
      return { members, slabs };
    }
  },
  {
    id: 'loan-repayments',
    name: 'Loan Repayments Audit',
    path: '/loan-repayments',
    category: 'Loan Portfolio',
    queryExecutor: async (db, tenantIdNum) => {
      const payments = await db.all(
        "SELECT p.*, l.LoanNo as loanNo, u.fullName as memberName FROM LoanPayment p JOIN LoanMember lm ON p.LoanMemberId = lm.Id JOIN Loan l ON lm.LoanId = l.Id JOIN users u ON lm.UserId = u.id WHERE u.tenantId = ? ORDER BY p.Id DESC LIMIT 50",
        [tenantIdNum]
      );
      return { payments };
    }
  },
  {
    id: 'expenses',
    name: 'Expense Ledger & Approvals',
    path: '/expenses',
    category: 'Finance & Expenses',
    queryExecutor: async (db, tenantIdNum) => {
      const expenses = await db.all("SELECT e.*, u.fullName as createdByName FROM expenses e JOIN users u ON e.CreatedBy = u.id WHERE e.TenantId = ? ORDER BY e.Id DESC LIMIT 50", [tenantIdNum]);
      return { expenses };
    }
  },
  {
    id: 'transactions-report',
    name: 'Transactions Audit Report',
    path: '/reports/transactions',
    category: 'Reports & Analytics',
    queryExecutor: async (db, tenantIdNum) => {
      const [payments, collections, expenses] = await Promise.all([
        db.all("SELECT 'repayment' as type, lp.Amount as amount, lp.PaymentDate as date FROM LoanPayment lp JOIN LoanMember lm ON lp.LoanMemberId = lm.Id JOIN users u ON lm.UserId = u.id WHERE u.tenantId = ? LIMIT 25", [tenantIdNum]),
        db.all("SELECT 'collection' as type, mc.Amount as amount, fcg.CollectionDate as date FROM MemberCollection mc JOIN FundCollectionGroup fcg ON mc.CollectionGroupId = fcg.Id JOIN users u ON mc.UserId = u.id WHERE u.tenantId = ? LIMIT 25", [tenantIdNum]),
        db.all("SELECT 'expense' as type, Amount as amount, ExpenseDate as date FROM expenses WHERE TenantId = ? LIMIT 25", [tenantIdNum])
      ]);
      return { payments, collections, expenses };
    }
  },
  {
    id: 'due-report',
    name: 'Due & Overdue Balances Report',
    path: '/reports/due-report',
    category: 'Reports & Analytics',
    queryExecutor: async (db, tenantIdNum) => {
      const dues = await db.all(
        "SELECT d.*, u.fullName as memberName, l.LoanNo as loanNo FROM LoanDue d JOIN LoanMember lm ON d.LoanMemberId = lm.Id JOIN Loan l ON lm.LoanId = l.Id JOIN users u ON lm.UserId = u.id WHERE u.tenantId = ? AND d.Status != 'Paid' LIMIT 50",
        [tenantIdNum]
      );
      return { dues };
    }
  },
  {
    id: 'member-ledger',
    name: 'Member Individual Ledger',
    path: '/reports/member-ledger',
    category: 'Reports & Analytics',
    queryExecutor: async (db, tenantIdNum) => {
      const members = await db.all("SELECT id, fullName, phoneNumber FROM users WHERE tenantId = ? LIMIT 50", [tenantIdNum]);
      return { members };
    }
  },
  {
    id: 'settings',
    name: 'Organization Workspace Settings',
    path: '/settings',
    category: 'Administration',
    queryExecutor: async (db, tenantIdNum) => {
      const tenant = await db.get("SELECT * FROM tenants WHERE id = ?", [tenantIdNum]);
      return { tenant };
    }
  }
];

/**
 * Execute Live Concurrent Request Probe for Customer Pages (Zero DB Storage)
 */
export const runConcurrentProbe = async (req: Request, res: Response) => {
  try {
    const { tenantId = 1, subdomain, concurrency = 10 } = req.body;
    const reqConcurrency = Math.max(1, Math.min(1000, Number(concurrency) || 10));

    const db = getDatabase();

    // Resolve tenant ID integer
    let tenantIdNum = Number(tenantId);
    let tenantName = 'Default / Demo Workspace';
    let tenantSubdomainStr = subdomain || 'demo';

    if (isNaN(tenantIdNum) || tenantIdNum <= 0) {
      if (subdomain) {
        const found = await db.get("SELECT id, name, subdomain FROM tenants WHERE LOWER(subdomain) = ?", [String(subdomain).toLowerCase().trim()]);
        if (found) {
          tenantIdNum = found.id;
          tenantName = found.name;
          tenantSubdomainStr = found.subdomain;
        } else {
          tenantIdNum = 1;
        }
      } else {
        tenantIdNum = 1;
      }
    } else {
      const found = await db.get("SELECT id, name, subdomain FROM tenants WHERE id = ?", [tenantIdNum]);
      if (found) {
        tenantName = found.name;
        tenantSubdomainStr = found.subdomain;
      }
    }

    const overallStartTime = performance.now();

    // Run performance probe across all specs concurrently with specified request concurrency
    const pageResults = await Promise.all(
      CUSTOMER_PAGES.map(async (pageSpec) => {
        const latencies: number[] = [];
        const errorMessagesSet = new Set<string>();
        let successCount = 0;
        let errorCount = 0;
        let payloadBytesApprox = 0;

        const pageStartTime = performance.now();

        // Create concurrency batch promises
        const reqPromises = Array.from({ length: reqConcurrency }).map(async () => {
          const singleStart = performance.now();
          try {
            const data = await pageSpec.queryExecutor(db, tenantIdNum);
            const singleEnd = performance.now();
            latencies.push(singleEnd - singleStart);
            successCount++;
            payloadBytesApprox += JSON.stringify(data || {}).length;
          } catch (err: any) {
            const singleEnd = performance.now();
            latencies.push(singleEnd - singleStart);
            errorCount++;
            const errMsg = err?.message || err?.code || String(err);
            errorMessagesSet.add(errMsg);
          }
        });

        await Promise.all(reqPromises);
        const pageEndTime = performance.now();

        const totalDurationMs = Math.max(1, pageEndTime - pageStartTime);
        const avgLatencyMs = latencies.length > 0
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : 0;
        const minLatencyMs = latencies.length > 0 ? Math.round(Math.min(...latencies)) : 0;
        const maxLatencyMs = latencies.length > 0 ? Math.round(Math.max(...latencies)) : 0;

        // Throughput in req/sec
        const throughputReqSec = Math.round((reqConcurrency / (totalDurationMs / 1000)) * 10) / 10;
        const avgPayloadKb = Math.round((payloadBytesApprox / (successCount || 1) / 1024) * 10) / 10;

        // Determine Performance Rating
        let grade: 'Fast' | 'Good' | 'Moderate' | 'Slow' = 'Fast';
        if (avgLatencyMs > 600 || errorCount > 0) {
          grade = 'Slow';
        } else if (avgLatencyMs > 300) {
          grade = 'Moderate';
        } else if (avgLatencyMs > 150) {
          grade = 'Good';
        }

        return {
          id: pageSpec.id,
          name: pageSpec.name,
          path: pageSpec.path,
          category: pageSpec.category,
          concurrency: reqConcurrency,
          avgLatencyMs,
          minLatencyMs,
          maxLatencyMs,
          successCount,
          errorCount,
          errorRatePercent: Math.round((errorCount / reqConcurrency) * 100),
          throughputReqSec,
          avgPayloadKb,
          grade,
          errors: Array.from(errorMessagesSet),
          testedAt: new Date().toLocaleTimeString()
        };
      })
    );

    const overallEndTime = performance.now();
    const totalExecutionTimeMs = Math.round(overallEndTime - overallStartTime);

    // Summary calculation
    const overallAvgLatencyMs = Math.round(
      pageResults.reduce((acc, p) => acc + p.avgLatencyMs, 0) / pageResults.length
    );
    const overallTotalRequests = pageResults.length * reqConcurrency;
    const overallErrorCount = pageResults.reduce((acc, p) => acc + p.errorCount, 0);

    return res.json({
      probeMeta: {
        tenantId: tenantIdNum,
        tenantName,
        tenantSubdomain: tenantSubdomainStr,
        concurrency: reqConcurrency,
        totalRequestsExecuted: overallTotalRequests,
        totalPagesTested: pageResults.length,
        totalExecutionTimeMs,
        overallAvgLatencyMs,
        overallErrorCount,
        testedAt: new Date().toISOString()
      },
      pageResults
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

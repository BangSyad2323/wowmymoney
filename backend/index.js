const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { parseTransactionText, DEFAULT_INCOME_KEYWORDS, DEFAULT_EXPENSE_KEYWORDS } = require('./utils/parser');
require('dotenv').config();

const app = express();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const port = process.env.PORT || 3000;

// const RENDER_URL = "https://wowmymoney.onrender.com/api/ping";

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to FinText API' });
});

// ─── KEYWORDS API ─────────────────────────────────────────────────────────────

// GET all keywords
app.get('/api/keywords', async (req, res) => {
  try {
    const keywords = await prisma.transaction_keywords.findMany({
      orderBy: [{ type: 'asc' }, { keyword: 'asc' }]
    });
    res.status(200).json({ data: keywords });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST a new keyword
app.post('/api/keywords', async (req, res) => {
  try {
    const { keyword, type } = req.body;

    if (!keyword || !keyword.trim()) {
      return res.status(400).json({ error: 'Keyword is required' });
    }
    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({ error: 'Type must be INCOME or EXPENSE' });
    }

    const newKeyword = await prisma.transaction_keywords.create({
      data: { keyword: keyword.trim().toLowerCase(), type }
    });

    res.status(201).json({ message: 'Keyword added successfully', data: newKeyword });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Keyword already exists' });
    }
    console.error('Error adding keyword:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE a keyword
app.delete('/api/keywords/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.transaction_keywords.delete({ where: { id } });
    res.status(200).json({ message: 'Keyword deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Keyword not found' });
    }
    console.error('Error deleting keyword:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── TRANSACTIONS API ─────────────────────────────────────────────────────────

// Create Transaction (POST)
app.post('/api/transactions', async (req, res) => {
  try {
    const { text, userId } = req.body;

    if (!text) return res.status(400).json({ error: 'Text input is required' });
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    // Fetch active DB keywords for smart parsing
    const dbKeywords = await prisma.transaction_keywords.findMany();

    const parsedData = parseTransactionText(text, dbKeywords);

    const transaction = await prisma.transactions.create({
      data: {
        user_id: userId,
        type: parsedData.type,
        amount: parsedData.amount,
        category: parsedData.category,
        description: parsedData.description,
        raw_text: parsedData.raw_text
      }
    });

    res.status(201).json({ message: 'Transaction saved successfully', data: transaction });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Asset-rotation categories are EXCLUDED from the public transaction list and income/expense metrics
const ASSET_ROTATION_CATEGORIES = ['Tabungan', 'Pencairan Tabungan', 'Piutang (Pinjaman Keluar)', 'Pelunasan Piutang', 'Utang Diterima', 'Pelunasan Utang'];

// Get Transactions with pagination (GET) — excludes asset-rotation categories
app.get('/api/transactions', async (req, res) => {
  try {
    const { userId, limit = '10', page = '1' } = req.query;

    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;
    const filter = userId
      ? { user_id: userId, category: { notIn: ASSET_ROTATION_CATEGORIES } }
      : { category: { notIn: ASSET_ROTATION_CATEGORIES } };

    const [transactions, total] = await Promise.all([
      prisma.transactions.findMany({
        where: filter,
        orderBy: { created_at: 'desc' },
        take,
        skip
      }),
      prisma.transactions.count({ where: filter })
    ]);

    res.status(200).json({
      data: transactions,
      meta: {
        total,
        page: parseInt(page, 10),
        limit: take,
        hasMore: skip + transactions.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Transaction (DELETE)
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.transactions.delete({ where: { id } });
    res.status(200).json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE ALL transactions, debts, and savings for a user (Reset Data)
app.delete('/api/transactions', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    
    await prisma.$transaction([
      prisma.transactions.deleteMany({ where: { user_id: userId } }),
      prisma.debt.deleteMany({ where: { userId: userId } }),
      prisma.savingsGoal.deleteMany({ where: { userId: userId } })
    ]);

    res.status(200).json({ message: 'All transactions and rotasi aset data reset successfully' });
  } catch (error) {
    console.error('Error resetting all transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── CHART DATA API ───────────────────────────────────────────────────────────
// GET /api/chart-data
// Query: userId (required), year (optional), month (optional, 0-indexed)
// If year+month provided → filter to that WIB month; otherwise → all-time.
// Returns grouped category totals for INCOME and EXPENSE, excluding asset-rotation entries.
app.get('/api/chart-data', async (req, res) => {
  try {
    const { userId, year, month } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    // Build optional date filter (WIB-aware)
    let dateFilter = undefined;
    if (year !== undefined && month !== undefined) {
      const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      const startUTC = new Date(new Date(y, m, 1, 0, 0, 0, 0).getTime() - WIB_OFFSET_MS);
      const endUTC   = new Date(new Date(y, m + 1, 1, 0, 0, 0, 0).getTime() - WIB_OFFSET_MS);
      dateFilter = { gte: startUTC, lt: endUTC };
    }

    const baseWhere = {
      user_id: userId,
      category: { notIn: ASSET_ROTATION_CATEGORIES },
      ...(dateFilter ? { created_at: dateFilter } : {})
    };

    // Use Prisma groupBy — runs a single SQL GROUP BY at DB level, no limit
    const [expenseGroups, incomeGroups] = await Promise.all([
      prisma.transactions.groupBy({
        by: ['category'],
        where: { ...baseWhere, type: 'EXPENSE' },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } }
      }),
      prisma.transactions.groupBy({
        by: ['category'],
        where: { ...baseWhere, type: 'INCOME' },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } }
      })
    ]);

    // Shape into { name, value } for recharts
    const toChartArray = (groups) =>
      groups
        .filter(g => (g._sum.amount || 0) > 0)
        .map(g => ({ name: g.category, value: g._sum.amount || 0 }));

    res.status(200).json({
      data: {
        expenseData: toChartArray(expenseGroups),
        incomeData:  toChartArray(incomeGroups)
      }
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/metrics/monthly — per-month income/expense with WIB-aware date range
// Query params: userId, year, month (0-indexed, e.g. month=6 for July)
app.get('/api/metrics/monthly', async (req, res) => {
  try {
    const { userId, year, month } = req.query;
    if (!userId || year === undefined || month === undefined) {
      return res.status(400).json({ error: 'userId, year, and month are required' });
    }

    const y = parseInt(year, 10);
    const m = parseInt(month, 10); // 0-indexed: 0=Jan ... 11=Dec

    // WIB is UTC+7. To get WIB month boundaries as UTC timestamps:
    // WIB start of month = 1st of month 00:00:00 WIB = 1st of month - 7h UTC
    // WIB end of month   = 1st of next month 00:00:00 WIB = 1st of next month - 7h UTC
    const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

    // Start: 00:00:00 WIB on the 1st of the month  => in UTC: subtract 7 hours
    const startWIB = new Date(y, m, 1, 0, 0, 0, 0);       // local Date object (treated as local)
    const startUTC = new Date(startWIB.getTime() - WIB_OFFSET_MS);

    // End: 00:00:00 WIB on the 1st of the NEXT month => in UTC
    const endWIB   = new Date(y, m + 1, 1, 0, 0, 0, 0);
    const endUTC   = new Date(endWIB.getTime() - WIB_OFFSET_MS);

    const dateFilter = { gte: startUTC, lt: endUTC };

    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.transactions.aggregate({
        where: {
          user_id: userId,
          type: 'INCOME',
          category: { notIn: ASSET_ROTATION_CATEGORIES },
          created_at: dateFilter
        },
        _sum: { amount: true }
      }),
      prisma.transactions.aggregate({
        where: {
          user_id: userId,
          type: 'EXPENSE',
          category: { notIn: ASSET_ROTATION_CATEGORIES },
          created_at: dateFilter
        },
        _sum: { amount: true }
      })
    ]);

    res.status(200).json({
      data: {
        totalIncome:  incomeAgg._sum.amount  || 0,
        totalExpense: expenseAgg._sum.amount || 0,
        year: y,
        month: m
      }
    });
  } catch (error) {
    console.error('Error fetching monthly metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/metrics — excludes asset-rotation categories for clean income/expense reporting

app.get('/api/metrics', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    // Pure income/expense — excludes asset-rotation transactions
    const incomeAgg = await prisma.transactions.aggregate({
      where: { user_id: userId, type: 'INCOME', category: { notIn: ASSET_ROTATION_CATEGORIES } },
      _sum: { amount: true }
    });
    const totalIncome = incomeAgg._sum.amount || 0;

    const expenseAgg = await prisma.transactions.aggregate({
      where: { user_id: userId, type: 'EXPENSE', category: { notIn: ASSET_ROTATION_CATEGORIES } },
      _sum: { amount: true }
    });
    const totalExpense = expenseAgg._sum.amount || 0;

    // Balance uses ALL transactions (including asset-rotation)
    const allIncomeAgg = await prisma.transactions.aggregate({
      where: { user_id: userId, type: 'INCOME' },
      _sum: { amount: true }
    });
    const allExpenseAgg = await prisma.transactions.aggregate({
      where: { user_id: userId, type: 'EXPENSE' },
      _sum: { amount: true }
    });
    const currentBalance = (allIncomeAgg._sum.amount || 0) - (allExpenseAgg._sum.amount || 0);

    res.status(200).json({ data: { totalIncome, totalExpense, currentBalance } });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DEBT API ─────────────────────────────────────────────────────────────────

// GET all debts for a user
app.get('/api/debts', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const debts = await prisma.debt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ data: debts });
  } catch (error) {
    console.error('Error fetching debts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create new debt
app.post('/api/debts', async (req, res) => {
  try {
    const { userId, personName, amount, type, dueDate, note } = req.body;
    if (!userId || !personName || !amount || !type) {
      return res.status(400).json({ error: 'userId, personName, amount, and type are required' });
    }
    if (!['RECEIVABLE', 'PAYABLE'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const debt = await tx.debt.create({
        data: {
          userId,
          personName,
          amount: parseFloat(amount),
          type,
          dueDate: dueDate ? new Date(dueDate) : null,
          note
        }
      });

      // RECEIVABLE (memberi pinjaman) → kurangi saldo (EXPENSE)
      // PAYABLE (menerima pinjaman)   → tambah saldo (INCOME)
      await tx.transactions.create({
        data: {
          user_id: userId,
          type: type === 'RECEIVABLE' ? 'EXPENSE' : 'INCOME',
          amount: parseFloat(amount),
          category: type === 'RECEIVABLE' ? 'Piutang (Pinjaman Keluar)' : 'Utang Diterima',
          description: `${type === 'RECEIVABLE' ? 'Piutang ke' : 'Utang dari'} ${personName}${note ? ` - ${note}` : ''}`,
          raw_text: `${type === 'RECEIVABLE' ? 'Piutang' : 'Utang'} ${personName}`
        }
      });

      return debt;
    });

    res.status(201).json({ message: 'Debt recorded', data: result });
  } catch (error) {
    console.error('Error creating debt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST pay/settle a debt (mark as PAID)
// POST full settle a debt (mark as PAID, use remaining balance)
app.post('/api/debts/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const result = await prisma.$transaction(async (tx) => {
      const debt = await tx.debt.findUnique({ where: { id } });
      if (!debt) throw new Error('Debt not found');
      if (debt.status === 'PAID') throw new Error('Already paid');

      const remaining = debt.amount - debt.paidAmount;

      const updated = await tx.debt.update({
        where: { id },
        data: { status: 'PAID', paidAmount: debt.amount }
      });

      await tx.transactions.create({
        data: {
          user_id: userId,
          type: debt.type === 'RECEIVABLE' ? 'INCOME' : 'EXPENSE',
          amount: remaining,
          category: debt.type === 'RECEIVABLE' ? 'Pelunasan Piutang' : 'Pelunasan Utang',
          description: `Pelunasan ${debt.type === 'RECEIVABLE' ? 'piutang dari' : 'utang ke'} ${debt.personName}`,
          raw_text: `Lunas ${debt.personName}`
        }
      });

      return updated;
    });

    res.status(200).json({ message: 'Debt settled', data: result });
  } catch (error) {
    if (error.message === 'Already paid') return res.status(400).json({ error: 'Debt is already paid' });
    if (error.message === 'Debt not found') return res.status(404).json({ error: 'Debt not found' });
    console.error('Error settling debt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST partial payment on a debt
app.post('/api/debts/:id/partial-pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, amount } = req.body;
    if (!userId || !amount || amount <= 0) return res.status(400).json({ error: 'userId and valid amount are required' });

    const result = await prisma.$transaction(async (tx) => {
      const debt = await tx.debt.findUnique({ where: { id } });
      if (!debt) throw new Error('Debt not found');
      if (debt.status === 'PAID') throw new Error('Already paid');

      const payAmount = parseFloat(amount);
      const remaining = debt.amount - debt.paidAmount;
      if (payAmount > remaining) throw new Error('Amount exceeds remaining balance');

      const newPaidAmount = debt.paidAmount + payAmount;
      const isNowPaid = newPaidAmount >= debt.amount;

      const updated = await tx.debt.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          status: isNowPaid ? 'PAID' : 'UNPAID'
        }
      });

      await tx.transactions.create({
        data: {
          user_id: userId,
          type: debt.type === 'RECEIVABLE' ? 'INCOME' : 'EXPENSE',
          amount: payAmount,
          category: debt.type === 'RECEIVABLE' ? 'Pelunasan Piutang' : 'Pelunasan Utang',
          description: `Cicilan ${debt.type === 'RECEIVABLE' ? 'piutang dari' : 'utang ke'} ${debt.personName}`,
          raw_text: `Cicilan ${debt.personName}`
        }
      });

      return updated;
    });

    res.status(200).json({ message: 'Partial payment recorded', data: result });
  } catch (error) {
    if (error.message === 'Already paid') return res.status(400).json({ error: 'Debt is already paid' });
    if (error.message === 'Debt not found') return res.status(404).json({ error: 'Debt not found' });
    if (error.message === 'Amount exceeds remaining balance') return res.status(400).json({ error: 'Amount exceeds remaining balance' });
    console.error('Error processing partial payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE a debt record
app.delete('/api/debts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.debt.delete({ where: { id } });
    res.status(200).json({ message: 'Debt deleted' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Debt not found' });
    console.error('Error deleting debt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ─── SAVINGS API ─────────────────────────────────────────────────────────

// GET Savings Goals with Logs
app.get('/api/savings', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const savings = await prisma.savingsGoal.findMany({
      where: { userId },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ data: savings });
  } catch (error) {
    console.error('Error fetching savings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST new Saving Goal
app.post('/api/savings', async (req, res) => {
  try {
    const { userId, title, targetAmount, icon } = req.body;
    if (!userId || !title || !targetAmount) {
      return res.status(400).json({ error: 'userId, title, and targetAmount are required' });
    }

    const goal = await prisma.savingsGoal.create({
      data: {
        userId,
        title,
        targetAmount: parseFloat(targetAmount),
        icon
      }
    });

    res.status(201).json({ message: 'Savings goal created', data: goal });
  } catch (error) {
    console.error('Error creating savings goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST Deposit to Saving Goal
app.post('/api/savings/:id/deposit', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, userId } = req.body;
    
    if (!amount || amount <= 0 || !userId) {
      return res.status(400).json({ error: 'Valid amount and userId are required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.findUnique({ where: { id } });
      if (!goal) throw new Error('Goal not found');

      const newLog = await tx.savingsLog.create({
        data: {
          savingsGoalId: id,
          amount: parseFloat(amount),
          type: 'DEPOSIT'
        }
      });

      const updatedGoal = await tx.savingsGoal.update({
        where: { id },
        data: { currentAmount: goal.currentAmount + parseFloat(amount) }
      });

      await tx.transactions.create({
        data: {
          user_id: userId,
          type: 'EXPENSE',
          amount: parseFloat(amount),
          category: 'Tabungan',
          description: `Setor Tabungan: ${goal.title}`,
          raw_text: `Setor Tabungan: ${goal.title}`
        }
      });

      return { updatedGoal, newLog };
    });

    res.status(200).json({ message: 'Deposit successful', data: result });
  } catch (error) {
    if (error.message === 'Goal not found') {
      return res.status(404).json({ error: 'Savings goal not found' });
    }
    console.error('Error processing deposit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST Withdraw from Saving Goal
app.post('/api/savings/:id/withdraw', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason, userId } = req.body;
    
    if (!amount || amount <= 0 || !userId) {
      return res.status(400).json({ error: 'Valid amount and userId are required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.findUnique({ where: { id } });
      if (!goal) throw new Error('Goal not found');
      
      const withdrawAmount = parseFloat(amount);
      if (goal.currentAmount < withdrawAmount) {
        throw new Error('Insufficient savings');
      }

      const newLog = await tx.savingsLog.create({
        data: {
          savingsGoalId: id,
          amount: withdrawAmount,
          type: 'WITHDRAW',
          reason: reason || 'Pencairan Tabungan'
        }
      });

      const updatedGoal = await tx.savingsGoal.update({
        where: { id },
        data: { currentAmount: goal.currentAmount - withdrawAmount }
      });

      await tx.transactions.create({
        data: {
          user_id: userId,
          type: 'INCOME',
          amount: withdrawAmount,
          category: 'Pencairan Tabungan',
          description: `Tarik Tabungan: ${goal.title}${reason ? ` (${reason})` : ''}`,
          raw_text: `Tarik Tabungan: ${goal.title}`
        }
      });

      return { updatedGoal, newLog };
    });

    res.status(200).json({ message: 'Withdraw successful', data: result });
  } catch (error) {
    if (error.message === 'Insufficient savings') {
      return res.status(400).json({ error: 'Insufficient savings' });
    }
    if (error.message === 'Goal not found') {
      return res.status(404).json({ error: 'Savings goal not found' });
    }
    console.error('Error processing withdrawal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// DELETE a savings log (Undo deposit or withdrawal)
app.delete('/api/savings/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Find the log
      const log = await tx.savingsLog.findUnique({
        where: { id },
        include: { savingsGoal: true }
      });
      if (!log) throw new Error('Log not found');

      const goal = log.savingsGoal;
      const amount = log.amount;

      // 2. Adjust currentAmount based on log type
      if (log.type === 'DEPOSIT') {
        const newAmount = goal.currentAmount - amount;
        await tx.savingsGoal.update({
          where: { id: goal.id },
          data: { currentAmount: newAmount < 0 ? 0 : newAmount }
        });
      } else if (log.type === 'WITHDRAW') {
        await tx.savingsGoal.update({
          where: { id: goal.id },
          data: { currentAmount: goal.currentAmount + amount }
        });
      }

      // 3. Find corresponding wallet transaction and delete it
      const txAmount = Math.round(amount);
      const matchedTx = await tx.transactions.findFirst({
        where: {
          user_id: goal.userId,
          amount: txAmount,
          category: log.type === 'DEPOSIT' ? 'Tabungan' : 'Pencairan Tabungan',
          created_at: {
            gte: new Date(log.createdAt.getTime() - 15000),
            lte: new Date(log.createdAt.getTime() + 15000)
          }
        }
      });
      if (matchedTx) {
        await tx.transactions.delete({ where: { id: matchedTx.id } });
      }

      // 4. Delete the log
      await tx.savingsLog.delete({ where: { id } });

      return { logId: id, matchedTxDeleted: !!matchedTx };
    });

    res.status(200).json({ message: 'Savings transaction deleted successfully', data: result });
  } catch (error) {
    if (error.message === 'Log not found') {
      return res.status(404).json({ error: 'Savings log not found' });
    }
    console.error('Error deleting savings log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all Savings Logs for a user
app.get('/api/savings/logs', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const userGoals = await prisma.savingsGoal.findMany({
      where: { userId },
      select: { id: true }
    });
    const goalIds = userGoals.map(g => g.id);

    const logs = await prisma.savingsLog.findMany({
      where: { savingsGoalId: { in: goalIds } },
      include: {
        savingsGoal: { select: { title: true, icon: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ data: logs });
  } catch (error) {
    console.error('Error fetching savings logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// // Endpoint ping agar setInterval tidak eror 404
// app.get('/api/ping', (req, res) => {
//   res.status(200).json({ status: 'success', message: 'Server is awake!' });
// });

// setInterval(async () => {
//   try {
//     // Menggunakan fetch bawaan Node.js (v25 sudah mendukung native fetch)
//     const response = await fetch(RENDER_URL);
//     const data = await response.json();
//     console.log(`[Self-Ping] Server auto-trigger success:`, data.message);
//   } catch (error) {
//     console.error("[Self-Ping] Gagal memicu server:", error.message);
//   }
// }, 12 * 60 * 1000);
// 
// ─── STARTUP ──────────────────────────────────────────────────────────────────

// ─── STARTUP ──────────────────────────────────────────────────────────────────

async function seedDefaults() {
  try {
    const dummyId = '11111111-1111-1111-1111-111111111111';

    // Ensure dummy user exists
    const user = await prisma.users.findUnique({ where: { id: dummyId } });
    if (!user) {
      await prisma.users.create({
        data: { id: dummyId, email: 'user@fintext.local', password: 'hashedpassword123' }
      });
      console.log('✓ Dummy user created.');
    }

    // Seed default keywords only if table is empty
    const count = await prisma.transaction_keywords.count();
    if (count === 0) {
      const seeds = [
        ...DEFAULT_INCOME_KEYWORDS.map(kw => ({ keyword: kw, type: 'INCOME' })),
        ...DEFAULT_EXPENSE_KEYWORDS.map(kw => ({ keyword: kw, type: 'EXPENSE' }))
      ];
      await prisma.transaction_keywords.createMany({ data: seeds, skipDuplicates: true });
      console.log(`✓ Seeded ${seeds.length} default keywords.`);
    }
  } catch (error) {
    console.error('⚠ Gagal menjalankan seedDefaults:', error.message);
  }
}

// Jalankan server Express secepat mungkin dan dengerin host '0.0.0.0'
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running beautifully on port ${port}`);
  
  // Jalankan seeding di latar belakang (background), tidak perlu di-await
  seedDefaults();
});


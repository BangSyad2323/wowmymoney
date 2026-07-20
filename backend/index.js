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

const RENDER_URL = "https://wowmymoney.onrender.com/api/ping";

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

// Get Transactions with pagination (GET)
app.get('/api/transactions', async (req, res) => {
  try {
    const { userId, limit = '10', page = '1' } = req.query;

    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;
    const filter = userId ? { user_id: userId } : {};

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
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Use Prisma transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.findUnique({ where: { id } });
      if (!goal) throw new Error('Goal not found');

      const newLog = await tx.savingsLog.create({
        data: {
          savingsGoalId: id,
          amount: parseFloat(amount)
        }
      });

      const updatedGoal = await tx.savingsGoal.update({
        where: { id },
        data: {
          currentAmount: goal.currentAmount + parseFloat(amount)
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

// Endpoint ping agar setInterval tidak eror 404
app.get('/api/ping', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Server is awake!' });
});

setInterval(async () => {
  try {
    // Menggunakan fetch bawaan Node.js (v25 sudah mendukung native fetch)
    const response = await fetch(RENDER_URL);
    const data = await response.json();
    console.log(`[Self-Ping] Server auto-trigger success:`, data.message);
  } catch (error) {
    console.error("[Self-Ping] Gagal memicu server:", error.message);
  }
}, 12 * 60 * 1000);

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


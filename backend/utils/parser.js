// Default fallback keywords (used only if DB is empty or query fails)
const DEFAULT_INCOME_KEYWORDS = ['dapat', 'gaji', 'nemu', 'dikasih', 'bonus', 'terima', 'masuk', 'thr', 'pendapatan', 'untung', 'cair'];
const DEFAULT_EXPENSE_KEYWORDS = ['beli', 'bayar', 'utang', 'jajan', 'ongkos', 'keluar', 'belanja', 'tarik', 'rugi', 'sodaqoh', 'sedekah'];

/**
 * Parse a natural language transaction text.
 * @param {string} text - Raw input text from user
 * @param {Array<{keyword: string, type: string}>} dbKeywords - Keywords from transaction_keywords table
 */
function parseTransactionText(text, dbKeywords = []) {
  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase();

  let type = 'EXPENSE';
  let category = 'Lainnya';
  let amount = 0;

  // 1. Build keyword lists (DB takes priority, defaults as fallback)
  let incomeKeywords = DEFAULT_INCOME_KEYWORDS;
  let expenseKeywords = DEFAULT_EXPENSE_KEYWORDS;

  if (dbKeywords.length > 0) {
    const dbIncome = dbKeywords
      .filter(k => k.type === 'INCOME')
      .map(k => k.keyword.toLowerCase());
    const dbExpense = dbKeywords
      .filter(k => k.type === 'EXPENSE')
      .map(k => k.keyword.toLowerCase());

    // Merge: DB keywords first, then fill with defaults not already present
    incomeKeywords = [
      ...dbIncome,
      ...DEFAULT_INCOME_KEYWORDS.filter(kw => !dbIncome.includes(kw))
    ];
    expenseKeywords = [
      ...dbExpense,
      ...DEFAULT_EXPENSE_KEYWORDS.filter(kw => !dbExpense.includes(kw))
    ];
  }

  const allActionVerbs = [...incomeKeywords, ...expenseKeywords];

  // 2. Detect type based on merged keywords
  const hasIncome = incomeKeywords.some(kw => lowerText.includes(kw));
  const hasExpense = expenseKeywords.some(kw => lowerText.includes(kw));

  if (hasIncome && !hasExpense) {
    type = 'INCOME';
  } else if (hasExpense && !hasIncome) {
    type = 'EXPENSE';
  } else if (hasIncome && hasExpense) {
    // Both found - pick the one whose keyword appears first
    let firstIncomeIndex = Infinity;
    let firstExpenseIndex = Infinity;
    for (const kw of incomeKeywords) {
      const idx = lowerText.indexOf(kw);
      if (idx !== -1 && idx < firstIncomeIndex) firstIncomeIndex = idx;
    }
    for (const kw of expenseKeywords) {
      const idx = lowerText.indexOf(kw);
      if (idx !== -1 && idx < firstExpenseIndex) firstExpenseIndex = idx;
    }
    type = firstIncomeIndex < firstExpenseIndex ? 'INCOME' : 'EXPENSE';
  } else {
    type = 'EXPENSE'; // Default
  }

  // 3. Extract amount (supports "12.000", "12000", "Rp12.000", "rp 12.000")
  const amountRegex = /(?:rp\.?\s*)?([\d\.,]+)/gi;
  let match;
  while ((match = amountRegex.exec(cleanText)) !== null) {
    const cleanedNumber = match[1].replace(/[^\d]/g, '');
    if (cleanedNumber) {
      const parsedAmount = parseInt(cleanedNumber, 10);
      if (parsedAmount > 0) {
        amount = parsedAmount;
        break;
      }
    }
  }

  // 4. Dynamic Category Extraction
  const helperWords = ['untuk', 'ke', 'di', 'dari', 'sama', 'dan', 'yg', 'yang', 'buat', 'sebesar', 'sebanyak', 'dengan', 'itu', 'ini'];

  const isNumericOrAmount = (word) => {
    const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
    return /^\d+$/.test(cleanWord) || cleanWord === 'rp';
  };

  const words = cleanText.split(/\s+/);

  // Find verb index
  let verbIndex = -1;
  for (let i = 0; i < words.length; i++) {
    const wordClean = words[i].toLowerCase().replace(/[^\w]/g, '');
    if (allActionVerbs.includes(wordClean)) {
      verbIndex = i;
      break;
    }
  }

  let extractedCategory = '';

  // Case A: Verb found – look for first non-helper, non-numeric word after verb
  if (verbIndex !== -1 && verbIndex + 1 < words.length) {
    let nextWordIndex = verbIndex + 1;
    while (nextWordIndex < words.length) {
      const word = words[nextWordIndex];
      const wordClean = word.toLowerCase().replace(/[^\w]/g, '');
      if (!isNumericOrAmount(word) && !helperWords.includes(wordClean) && wordClean.length > 0) {
        extractedCategory = wordClean;
        break;
      }
      nextWordIndex++;
    }
  }

  // Case B: No verb – scan for first meaningful word
  if (!extractedCategory) {
    for (const word of words) {
      const wordClean = word.toLowerCase().replace(/[^\w]/g, '');
      const isVerb = allActionVerbs.includes(wordClean);
      if (!isNumericOrAmount(word) && !helperWords.includes(wordClean) && !isVerb && wordClean.length > 1) {
        extractedCategory = wordClean;
        break;
      }
    }
  }

  if (extractedCategory) {
    category = extractedCategory.charAt(0).toUpperCase() + extractedCategory.slice(1).toLowerCase();
  } else {
    category = 'Lainnya';
  }

  // 5. Generate cleaned description
  let description = cleanText
    .replace(/(?:rp\.?\s*)?[\d\.,]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!description) {
    description = cleanText;
  }

  return {
    type,
    amount,
    category,
    description,
    raw_text: text
  };
}

module.exports = {
  parseTransactionText,
  DEFAULT_INCOME_KEYWORDS,
  DEFAULT_EXPENSE_KEYWORDS
};

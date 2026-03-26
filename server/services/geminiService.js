import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

const getClient = () => {
    if (!genAI) {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('XXXX')) {
            return null;
        }
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return genAI;
};

const callGemini = async (prompt) => {
    const client = getClient();
    if (!client) throw new Error('Gemini API key not configured');
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
};

// ── 1. Dashboard Financial Health Summary ────────────────────────────────────
export const getFinancialSummary = async (kpis) => {
    const prompt = `
You are a financial analyst for a business using an ERP system.
Analyze these KPIs and give a concise 2-3 sentence plain-English financial health summary.
Be specific about numbers. Use ₹ for currency. Be direct — no fluff.

KPIs:
- Revenue this month: ₹${kpis.revenueThisMonth?.toLocaleString('en-IN') || 0}
- Outstanding receivables: ₹${kpis.outstanding?.toLocaleString('en-IN') || 0}
- Overdue invoices: ${kpis.overdueCount || 0}
- Invoices created this month: ${kpis.invoicesThisMonth || 0}
- Total vendors: ${kpis.totalVendors || 0} (${kpis.verifiedVendors || 0} verified)

Respond with ONLY the summary text. No bullet points, no headers.
`;
    return await callGemini(prompt);
};

// ── 2. Vendor Risk Score ──────────────────────────────────────────────────────
export const getVendorRiskScore = async (vendorData) => {
    const prompt = `
Analyze this vendor's profile and assign a risk score from 0 (lowest risk) to 100 (highest risk).

Vendor: ${vendorData.name}
Status: ${vendorData.status}
Payment Terms: Net ${vendorData.paymentTerms} days
Category: ${vendorData.category}
Has Bank Details: ${vendorData.hasBankDetails ? 'Yes' : 'No'}
Has GSTIN: ${vendorData.hasGstin ? 'Yes' : 'No'}
Days Since Added: ${vendorData.daysSinceAdded || 0}

Respond ONLY with valid JSON in this exact format:
{"score": <0-100>, "reason": "<one sentence reason>", "recommendation": "<one sentence action>"}
`;
    const text = await callGemini(prompt);
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
};

// ── 3. Payment Timing Optimization ───────────────────────────────────────────
export const getPaymentTimingAdvice = async (invoices, cashBalance) => {
    const prompt = `
You are a cash flow advisor. Given these unpaid invoices and current cash balance, 
recommend the optimal payment schedule.

Cash Balance: ₹${cashBalance?.toLocaleString('en-IN') || 0}
Unpaid Invoices: ${JSON.stringify(invoices.slice(0, 10).map(i => ({
        id: i._id, vendor: i.vendor?.name, amount: i.total, dueDate: i.dueDate, daysOverdue: i.daysOverdue
    })))}

Respond ONLY with valid JSON:
{"recommendation": "<2 sentence advice>", "priorityInvoiceIds": ["id1","id2"], "estimatedSavings": "<string>"}
`;
    const text = await callGemini(prompt);
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
};

// ── 4. Invoice Description Draft ─────────────────────────────────────────────
export const draftInvoiceDescription = async (userPrompt) => {
    const prompt = `
Write a professional invoice line item description based on this input: "${userPrompt}"
Keep it under 15 words. Be specific and professional. Return ONLY the description text.
`;
    return await callGemini(prompt);
};

// ── 5. Journal Anomaly Detection ─────────────────────────────────────────────
export const detectJournalAnomalies = async (entries) => {
    const prompt = `
Review these journal entries and flag any that look unusual, incorrect, or potentially fraudulent.

Entries: ${JSON.stringify(entries.slice(0, 20).map(e => ({
        entryNo: e.entryNo, date: e.date, narration: e.narration,
        totalDebit: e.lines?.reduce((s, l) => s + (l.debit || 0), 0),
        totalCredit: e.lines?.reduce((s, l) => s + (l.credit || 0), 0),
        lineCount: e.lines?.length
    })))}

Respond ONLY with valid JSON:
{"flaggedEntries": [{"entryNo": "<no>", "reason": "<why flagged>"}], "summary": "<1 sentence overall assessment>"}
`;
    const text = await callGemini(prompt);
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
};
// ── 6. Late Payer Prediction ──────────────────────────────────────────────────
export const predictLatePayers = async (customers) => {
    const prompt = `
You are an accounts receivable analyst. Based on this customer data, predict the likelihood each customer will pay late.

Customers: ${JSON.stringify(customers.slice(0, 15).map(c => ({
        name: c.name,
        outstandingBalance: c.outstandingBalance,
        creditLimit: c.creditLimit,
        latePaymentCount: c.latePaymentCount || 0,
        paymentTerms: c.paymentTerms,
        status: c.status,
    })))}

Respond ONLY with valid JSON:
{"predictions": [{"customerName": "<name>", "likelihood": "high|medium|low", "reason": "<one sentence>"}], "summary": "<1 sentence overall AR health>"}
`;
    const text = await callGemini(prompt);
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
};

// ── 7. Natural Language Query → MongoDB Filter ────────────────────────────────
export const naturalLanguageQuery = async (query, availableFields) => {
    const prompt = `
You are a MongoDB query builder for an ERP system. Convert this natural language query into a MongoDB filter object.

Available fields: ${JSON.stringify(availableFields)}
User query: "${query}"

Rules:
- Return ONLY valid JSON — a MongoDB filter object
- Use $gte/$lte for date ranges, $in for arrays, $regex for text search
- For dates, use ISO string format
- If the query is ambiguous, return a reasonable interpretation
- Never include fields not in the available fields list

Example: "overdue invoices from last month" → {"status": "overdue", "dueDate": {"$lte": "<last month ISO date>"}}

Respond ONLY with valid JSON — the filter object, nothing else.
`;
    const text = await callGemini(prompt);
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
};
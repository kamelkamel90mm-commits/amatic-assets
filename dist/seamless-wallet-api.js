/**
 * ============================================================================
 * UNIFIED SEAMLESS WALLET API ENDPOINTS (FORZZA / SUPABASE INTEGRATION)
 * ============================================================================
 * This script serves as the backend logic to connect your Supabase Database
 * with a standard Casino Aggregator API (like MACCO XE, LuckyConnect, or EveryMatrix).
 * 
 * Once you purchase a Casino API (e.g. for Pragmatic Play, Evolution, Amatic),
 * the aggregator will ask for your "Wallet Webhooks". You will deploy these
 * functions as Supabase Edge Functions.
 */

const { createClient } = require('@supabase/supabase-js');

// These will be environment variables in Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ynsjeihnqixqvkyzzpsz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Endpoint 1: Get Balance
 * Called by the game provider when a game loads or between spins.
 */
async function getBalance(req, res) {
    const { userId, token, currency } = req.body;
    
    // 1. Validate session token
    // 2. Get user balance
    const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .single();
        
    if (error || !data) {
        return res.status(400).json({ error: "User not found" });
    }

    return res.status(200).json({
        balance: data.balance,
        currency: "EUR" // Make sure currency matches
    });
}

/**
 * Endpoint 2: Process Bet (Debit)
 * Called when a player clicks "Spin" or places a bet on Live Casino.
 */
async function processBet(req, res) {
    const { userId, amount, transactionId, gameId, roundId } = req.body;

    // 1. Verify idempotency (prevent double charge for the same transactionId)
    const { data: txCheck } = await supabase.from('transactions').select('id').eq('id', transactionId).single();
    if (txCheck) {
        return res.status(200).json({ message: "Transaction already processed" });
    }

    // 2. Fetch balance and check if enough funds
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
    
    if (profile.balance < amount) {
        return res.status(400).json({ error: "Insufficient funds" });
    }

    // 3. Deduct balance and log transaction (must be done via atomic RPC in production)
    const newBalance = profile.balance - amount;
    
    await supabase.from('profiles').update({ balance: newBalance }).eq('id', userId);
    
    await supabase.from('transactions').insert({
        id: transactionId,
        user_id: userId,
        type: 'bet',
        amount: amount,
        game_id: gameId
    });

    return res.status(200).json({
        status: "OK",
        balance: newBalance,
        transactionId: transactionId
    });
}

/**
 * Endpoint 3: Process Win (Credit)
 * Called when a player wins a spin or a live casino round.
 */
async function processWin(req, res) {
    const { userId, amount, transactionId, gameId, roundId } = req.body;

    // 1. Idempotency check
    const { data: txCheck } = await supabase.from('transactions').select('id').eq('id', transactionId).single();
    if (txCheck) return res.status(200).json({ message: "Transaction already processed" });

    // 2. Fetch current balance
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();

    // 3. Add winnings
    const newBalance = profile.balance + amount;
    
    await supabase.from('profiles').update({ balance: newBalance }).eq('id', userId);
    
    await supabase.from('transactions').insert({
        id: transactionId,
        user_id: userId,
        type: 'win',
        amount: amount,
        game_id: gameId
    });

    return res.status(200).json({
        status: "OK",
        balance: newBalance,
        transactionId: transactionId
    });
}

module.exports = { getBalance, processBet, processWin };

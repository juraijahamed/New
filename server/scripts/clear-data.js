const { pool } = require('../db');

async function clearData() {
    console.log('Starting data cleanup...');

    const tables = [
        'sales',
        'expenses',
        'supplier_payments',
        'salary_payments'
    ];

    try {
        for (const table of tables) {
            console.log(`Clearing table: ${table}...`);
            // TRUNCATE with RESTART IDENTITY to reset IDs to 1
            await pool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
            console.log(`Table ${table} cleared.`);
        }

        console.log('\nSUCCESS: All transaction data has been cleared and IDs have been reset to 1.');
        console.log('You can now start fresh with record ID 1.');

    } catch (error) {
        console.error('\nERROR: Failed to clear data:', error.message);
    } finally {
        await pool.end();
        process.exit();
    }
}

// Confirmation check (optional but good for safety)
if (process.argv.includes('--confirm')) {
    clearData();
} else {
    console.log('WARNING: This script will DELETE ALL transaction records (Sales, Expenses, etc.)');
    console.log('To proceed, run: node scripts/clear-data.js --confirm');
    process.exit();
}

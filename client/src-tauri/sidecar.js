const path = require('path');
const fs = require('fs');

// Path resolution for packaged binaries
const getAppPath = () => {
    return process.pkg ? path.dirname(process.execPath) : __dirname;
};

// Set environment variables for the server if needed
process.env.DATABASE_PATH = path.join(getAppPath(), 'finance.db');
process.env.UPLOADS_PATH = path.join(getAppPath(), 'uploads');

console.log('Sidecar starting...');
console.log('App Path:', getAppPath());
console.log('DB Path:', process.env.DATABASE_PATH);

// Start the actual server
// We require the server's index.js, but it might need path adjustments
require('../../server/index.js');

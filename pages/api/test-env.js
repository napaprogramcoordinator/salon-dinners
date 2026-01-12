// pages/api/test-env.js
// Detailed environment variable testing

export default function handler(req, res) {
  // Get the raw values
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SPREADSHEET_ID;
  
  // Check all environment variables
  const allEnvVars = Object.keys(process.env);
  const googleVars = allEnvVars.filter(key => key.includes('GOOGLE'));
  
  res.status(200).json({
    // Basic checks
    hasEmail: !!email,
    hasKey: !!privateKey,
    hasSheetId: !!sheetId,
    
    // Show first few characters (safe to expose)
    emailPreview: email ? email.substring(0, 30) + '...' : 'NOT SET',
    keyPreview: privateKey ? privateKey.substring(0, 50) + '...' : 'NOT SET',
    sheetIdPreview: sheetId ? sheetId.substring(0, 20) + '...' : 'NOT SET',
    
    // Length checks
    emailLength: email ? email.length : 0,
    keyLength: privateKey ? privateKey.length : 0,
    sheetIdLength: sheetId ? sheetId.length : 0,
    
    // Environment info
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    
    // All Google-related vars found
    googleVarsFound: googleVars,
    
    // Total env vars
    totalEnvVars: allEnvVars.length
  });
}

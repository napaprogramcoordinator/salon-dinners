// pages/api/webhook.js
// This API route receives webhooks and writes to Google Sheets
// Photos uploaded to Cloudinary

import { google } from 'googleapis';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Your Google Sheets configuration
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

// Google Service Account credentials
const GOOGLE_CREDENTIALS = {
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Webhook received:', req.body);

    const { type, action, data } = req.body;

    // Validate environment variables
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL not set');
    }
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY not set');
    }
    if (!process.env.GOOGLE_SPREADSHEET_ID) {
      throw new Error('GOOGLE_SPREADSHEET_ID not set');
    }

    console.log('Environment variables validated');
    console.log('Spreadsheet ID:', process.env.GOOGLE_SPREADSHEET_ID);

    // Authenticate with Google
    const auth = new google.auth.GoogleAuth({
      credentials: GOOGLE_CREDENTIALS,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    console.log('Google auth initialized');

    // Route to appropriate handler
    if (type === 'registrants') {
      await handleRegistrants(sheets, action, data);
    } else if (type === 'waitlist') {
      await handleWaitlist(sheets, action, data);
    } else if (type === 'invite') {
      await handleInvites(sheets, action, data);
    }

    console.log('Success!');
    return res.status(200).json({ 
      success: true, 
      message: `Processed ${data.length} items`,
      type,
      action
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Handle registrants
 */
async function handleRegistrants(sheets, action, items) {
  const sheetName = 'Registrations';

  if (action === 'new' || action === 'bulk_export') {
    // Add new registrations
    const rows = await Promise.all(items.map(async (item) => {
      const photoLink = await uploadPhotoToCloudinary(item.picture, item.name, item.email);
      
      return [
        item.name || '',
        item.email || '',
        item.phone || '',
        item.professionalTitle || '',
        item.bio || '',
        item.foodAllergies || '',
        item.date || '',
        item.location || '',
        item.group || '',
        formatDate(item.timestamp),
        photoLink
      ];
    }));

    await appendRows(sheets, sheetName, rows);
  } 
  else if (action === 'move_to_waitlist') {
    // Delete from registrations and add to waitlist
    for (const item of items) {
      await deleteRowByEmail(sheets, sheetName, item.email);
      
      const photoLink = await uploadPhotoToCloudinary(item.picture, item.name, item.email);
      const row = [
        item.name || '',
        item.email || '',
        item.phone || '',
        item.professionalTitle || '',
        item.bio || '',
        item.foodAllergies || '',
        item.classification || '',
        formatPreferredDates(item.preferredDates),
        formatDate(new Date()),
        photoLink
      ];
      
      await appendRows(sheets, 'Waitlist', [row]);
    }
  }
  else if (action === 'move_to_invite') {
    // Delete from registrations and add to invites
    for (const item of items) {
      await deleteRowByEmail(sheets, sheetName, item.email);
      
      const row = [
        item.name || '',
        item.email || '',
        formatDate(item.timestamp)
      ];
      
      await appendRows(sheets, 'Invites', [row]);
    }
  }
  else if (action === 'delete') {
    // Delete from registrations
    for (const item of items) {
      await deleteRowByEmail(sheets, sheetName, item.email);
    }
  }
}

/**
 * Handle waitlist
 */
async function handleWaitlist(sheets, action, items) {
  const sheetName = 'Waitlist';

  if (action === 'new' || action === 'bulk_export') {
    const rows = await Promise.all(items.map(async (item) => {
      const photoLink = await uploadPhotoToCloudinary(item.picture, item.name, item.email);
      
      return [
        item.name || '',
        item.email || '',
        item.phone || '',
        item.professionalTitle || '',
        item.bio || '',
        item.foodAllergies || '',
        item.classification || '',
        formatPreferredDates(item.preferredDates),
        formatDate(new Date()),
        photoLink
      ];
    }));

    await appendRows(sheets, sheetName, rows);
  }
  else if (action === 'move_to_registrant') {
    for (const item of items) {
      await deleteRowByEmail(sheets, sheetName, item.email);
      
      const photoLink = await uploadPhotoToCloudinary(item.picture, item.name, item.email);
      const row = [
        item.name || '',
        item.email || '',
        item.phone || '',
        item.professionalTitle || '',
        item.bio || '',
        item.foodAllergies || '',
        item.date || '',
        item.location || '',
        item.group || '',
        formatDate(item.timestamp),
        photoLink
      ];
      
      await appendRows(sheets, 'Registrations', [row]);
    }
  }
  else if (action === 'move_to_invite') {
    for (const item of items) {
      await deleteRowByEmail(sheets, sheetName, item.email);
      
      const row = [
        item.name || '',
        item.email || '',
        formatDate(item.timestamp)
      ];
      
      await appendRows(sheets, 'Invites', [row]);
    }
  }
  else if (action === 'delete') {
    for (const item of items) {
      await deleteRowByEmail(sheets, sheetName, item.email);
    }
  }
}

/**
 * Handle invites
 */
async function handleInvites(sheets, action, items) {
  const sheetName = 'Invites';

  if (action === 'new' || action === 'bulk_export') {
    const rows = items.map(item => [
      item.name || '',
      item.email || '',
      formatDate(item.timestamp)
    ]);

    await appendRows(sheets, sheetName, rows);
  }
  else if (action === 'delete') {
    for (const item of items) {
      await deleteRowByEmail(sheets, sheetName, item.email);
    }
  }
}

/**
 * Append rows to sheet
 */
async function appendRows(sheets, sheetName, rows) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'RAW',
    resource: {
      values: rows
    }
  });
  
  console.log(`Added ${rows.length} rows to ${sheetName}`);
}

/**
 * Delete row by email
 */
async function deleteRowByEmail(sheets, sheetName, email) {
  try {
    // Get all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:B`,
    });

    const rows = response.data.values || [];
    
    // Find row with matching email (column B)
    const rowIndex = rows.findIndex((row, index) => 
      index > 0 && row[1] === email // Skip header row (index 0)
    );

    if (rowIndex !== -1) {
      // Get sheet ID
      const sheetMetadata = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });
      
      const sheet = sheetMetadata.data.sheets.find(s => 
        s.properties.title === sheetName
      );
      
      if (sheet) {
        // Delete the row
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId: sheet.properties.sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1
                }
              }
            }]
          }
        });
        
        console.log(`Deleted row ${rowIndex + 1} from ${sheetName}`);
      }
    }
  } catch (error) {
    console.error(`Error deleting row from ${sheetName}:`, error);
  }
}

/**
 * Upload photo to Cloudinary
 */
async function uploadPhotoToCloudinary(base64Data, name, email) {
  if (!base64Data || base64Data === '') {
    return '';
  }
  
  if (base64Data.startsWith('http')) {
    return base64Data;
  }
  
  try {
    console.log(`Uploading photo for ${name}...`);
    
    // Cloudinary expects data:image format
    let imageData = base64Data;
    if (!imageData.startsWith('data:')) {
      // Add data URL prefix if missing
      imageData = `data:image/jpeg;base64,${base64Data}`;
    }
    
    // Create public_id (filename in Cloudinary)
    const publicId = `salon-dinners/${sanitizeFilename(name)}_${sanitizeFilename(email)}_${Date.now()}`;
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(imageData, {
      public_id: publicId,
      folder: 'salon-dinners',
      resource_type: 'image',
      overwrite: false
    });
    
    console.log(`Photo uploaded to Cloudinary: ${result.secure_url}`);
    
    return result.secure_url;
    
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return '';
  }
}

/**
 * Helper functions
 */
function sanitizeFilename(str) {
  if (!str) return 'unknown';
  return str.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
}

function formatDate(dateInput) {
  if (!dateInput) return '';
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${month}/${day}/${year}`;
}

function formatPreferredDates(preferredDates) {
  if (!preferredDates || !Array.isArray(preferredDates)) {
    return '';
  }
  
  const dateMap = {
    'date1': 'March 19, 2026 (NYC)',
    'date2': 'May 22, 2026 (NYC)',
    'date3': 'August 19, 2026 (Orange County)',
    'date4': 'October 23, 2026 (NYC)',
    'date5': 'December 8, 2026 (NYC)'
  };
  
  return preferredDates
    .map(dateId => dateMap[dateId] || dateId)
    .join(', ');
}

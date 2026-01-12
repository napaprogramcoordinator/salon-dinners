// pages/api/webhook.js
// Saves to Google Sheets + Supabase (via REST API)

import { google } from 'googleapis';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Supabase REST API configuration
const SUPABASE_URL = 'https://zqpawrdblhxllmfpygkk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxcGF3cmRibGh4bGxtZnB5Z2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4OTgyODQsImV4cCI6MjA4MzQ3NDI4NH0.qtekiX3TY-y6T5i1acSNwuXWwaiOL5OVtFbPEODKpvs';

// Helper: Save to Supabase using REST API
async function saveToSupabase(table, data) {
  try {
    console.log(`Attempting to save to Supabase ${table}:`, JSON.stringify(data));
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Supabase ${table} error (${response.status}):`, errorText);
    } else {
      console.log(`✅ Saved to Supabase ${table}`);
    }
  } catch (error) {
    console.error(`Supabase ${table} error:`, error);
  }
}

// Helper: Delete from Supabase using REST API
async function deleteFromSupabase(table, email) {
  try {
    console.log(`Attempting to delete from Supabase ${table} where email=${email}`);
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?email=eq.${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Supabase delete ${table} error (${response.status}):`, errorText);
    } else {
      console.log(`✅ Deleted from Supabase ${table}`);
    }
  } catch (error) {
    console.error(`Supabase delete ${table} error:`, error);
  }
}

// Google Sheets configuration
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const GOOGLE_CREDENTIALS = {
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

export default async function handler(req, res) {
  // Add CORS headers to allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, action, data } = req.body;

    // Validate Google environment variables
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || !process.env.GOOGLE_SPREADSHEET_ID) {
      throw new Error('Google credentials not set');
    }

    // Authenticate with Google
    const auth = new google.auth.GoogleAuth({
      credentials: GOOGLE_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Route to handlers
    if (type === 'registrants') {
      await handleRegistrants(sheets, action, data);
    } else if (type === 'waitlist') {
      await handleWaitlist(sheets, action, data);
    } else if (type === 'invite') {
      await handleInvites(sheets, action, data);
    }

    return res.status(200).json({ success: true, message: `Processed ${data.length} items` });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function handleRegistrants(sheets, action, items) {
  const sheetName = 'Registrations';

  if (action === 'new' || action === 'bulk_export') {
    const rows = await Promise.all(items.map(async (item) => {
      const photoLink = await uploadPhotoToCloudinary(item.picture, item.name, item.email);
      
      // Save to Supabase - FIXED column names to match your table
      await saveToSupabase('registrations', {
        name: item.name,
        email: item.email,
        phone: item.phone || null,
        professional_title: item.professionalTitle || null,
        bio: item.bio || null,
        food_allergies: item.foodAllergies || null,
        date_id: item.dateId || null,
        date_label: item.date || null,
        location: item.location || null,
        classification: item.group || null,
        timestamp: item.timestamp || new Date().toISOString(),
        picture: photoLink || null,
        moved_from_waitlist: item.movedFromWaitlist || false
      });
      
      return [
        item.name || '', item.email || '', item.phone || '', item.professionalTitle || '',
        item.bio || '', item.foodAllergies || '', item.date || '', item.location || '',
        item.group || '', formatDate(item.timestamp), photoLink
      ];
    }));

    await appendRows(sheets, sheetName, rows);
  } 
  else if (action === 'move_to_waitlist') {
    for (const item of items) {
      await deleteRowByEmail(sheets, sheetName, item.email);
      await deleteFromSupabase('registrations', item.email);
      
      const photoLink = await uploadPhotoToCloudinary(item.picture, item.name, item.email);
      const preferredDatesStr = Array.isArray(item.preferredDates) ? item.preferredDates.join(',') : item.preferredDates || '';
      
      await saveToSupabase('waitlist', {
        name: item.name,
        email: item.email,
        phone: item.phone || null,
        professional_title: item.professionalTitle || null,
        bio: item.bio || null,
        food_allergies: item.foodAllergies || null,
        classification: item.classification || null,
        preferred_dates: preferredDatesStr,
        added_to_waitlist: new Date().toISOString(),
        photo_link: photoLink || null
      });
      
      await appendRows(sheets, 'Waitlist', [[
        item.name || '', item.email || '', item.phone || '', item.professionalTitle || '',
        item.bio || '', item.foodAllergies || '', item.classification || '',
        formatPreferredDates(item.preferredDates), formatDate(new Date()), photoLink
      ]]);
    }
  }
  else if (action === 'move_to_invite') {
    for (const item of items) {
      await deleteRowByEmail(sheets, sheetName, item.email);
      await deleteFromSupabase('registrations', item.email);
      
      await saveToSupabase('invites', {
        name: item.name,
        email: item.email,
        request_date: item.timestamp || new Date().toISOString()
      });
      
      await appendRows(sheets, 'Invites', [[item.name || '', item.email || '', formatDate(item.timestamp)]]);
    }
  }
  else if (action === 'delete') {
    for (const item of items) {
      await deleteRowByEmail(sheets, sheetName, item.email);
      await deleteFromSupabase('registrations', item.email);
    }
  }
}

async function handleWaitlist(sheets, action, items) {
  const sheetName = 'Waitlist';

  if (action === 'new' || action === 'bulk_export') {
    const rows = await Promise.all(items.map(async (item) => {
      const photoLink = await uploadPhotoToCloudinary(item.picture, item.name, item.email);
      const preferredDatesStr = Array.isArray(item.preferredDates) ? item.preferredDates.join(',') : item.preferredDates || '';
      
      await saveToSupabase('waitlist', {
        name: item.name,
        email: item.email,
        phone: item.phone || null,
        professional_title: item.professionalTitle || null,
        bio: item.bio || null,
        food_allergies: item.foodAllergies || null,
        classification: item.classification || null,
        preferred_dates: preferredDatesStr,
        added_to_waitlist: new Date().toISOString(),
        photo_link: photoLink || null
      });
      
      return [
        item.name || '', item.email || '', item.phone || '', item.professionalTitle || '',
        item.bio || '', item.foodAllergies || '', item.classification || '',
        formatPreferredDates(item.preferredDates), formatDate(new Date()), photoLink
      ];
    }));

    await appendRows(sheets, sheetName, rows);
  }
  else if (action === 'move_to_registrant') {
    for (const item of items) {
      await deleteRowByEmail(sheets, sheetName, item.email);
      await deleteFromSupabase('waitlist', item.email);
      
      const photoLink = await uploadPhotoToCloudinary(item.picture, item.name, item.email);
      
      // Save to Supabase - FIXED column names
      await saveToSupabase('registrations', {
        name: item.name,
        email: item.email,
        phone: item.phone || null,
        professional_title: item.professionalTitle || null,
        bio: item.bio || null,
        food_allergies: item.foodAllergies || null,
        date_id: item.dateId || null,
        date_label: item.date || null,
        location: item.location || null,
        classification: item.group || null,
        timestamp: item.timestamp || new Date().toISOString(),
        picture: photoLink || null,
        moved_from_waitlist: true
      });
      
      await appendRows(sheets, 'Registrations', [[
        item.name || '', item.email || '', item.phone || '', item.professionalTitle || '',
        item.bio || '', item.foodAllergies || '', item.date || '', item.location || '',
        item.group || '', formatDate(item.timestamp), photoLink
      ]]);
    }
  }
  else if (action === 'move_to_invite') {
    for (const item of items) {
      await deleteRowByEmail(sheets, sheetName, item.email);
      await deleteFromSupabase('waitlist', item.email);
      
      await saveToSupabase('invites', {
        name: item.name,
        email: item.email,
        request_date: item.timestamp || new Date().toISOString()
      });
      
      await appendRows(sheets, 'Invites', [[item.name || '', item.email || '', formatDate(item.timestamp)]]);
    }
  }
  else if (action === 'delete') {
    for (const item of items) {
      await deleteRowByEmail(sheets, sheetName, item.email);
      await deleteFromSupabase('waitlist', item.email);
    }
  }
}

async function handleInvites(sheets, action, items) {
  const sheetName = 'Invites';

  if (action === 'new' || action === 'bulk_export') {
    const rows = items.map(item => {
      saveToSupabase('invites', {
        name: item.name,
        email: item.email,
        request_date: item.timestamp || new Date().toISOString()
      });
      
      return [item.name || '', item.email || '', formatDate(item.timestamp)];
    });

    await appendRows(sheets, sheetName, rows);
  }
}

async function appendRows(sheets, sheetName, rows) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });
  } catch (error) {
    console.error(`Error appending to ${sheetName}:`, error);
  }
}

async function deleteRowByEmail(sheets, sheetName, email) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === email) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId: await getSheetId(sheets, sheetName),
                  dimension: 'ROWS',
                  startIndex: i,
                  endIndex: i + 1,
                },
              },
            }],
          },
        });
        break;
      }
    }
  } catch (error) {
    console.error(`Error deleting row from ${sheetName}:`, error);
  }
}

async function getSheetId(sheets, sheetName) {
  const response = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
  return sheet ? sheet.properties.sheetId : 0;
}

async function uploadPhotoToCloudinary(base64Data, name, email) {
  if (!base64Data || base64Data === '' || base64Data.startsWith('http')) {
    return base64Data || '';
  }
  
  try {
    let imageData = base64Data;
    if (!imageData.startsWith('data:')) {
      imageData = `data:image/jpeg;base64,${base64Data}`;
    }
    
    const publicId = `salon-dinners/${sanitizeFilename(name)}_${sanitizeFilename(email)}_${Date.now()}`;
    const result = await cloudinary.uploader.upload(imageData, {
      public_id: publicId,
      folder: 'salon-dinners',
      resource_type: 'image',
      overwrite: false
    });
    
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return '';
  }
}

function sanitizeFilename(str) {
  return str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function formatPreferredDates(preferredDates) {
  if (!preferredDates) return '';
  
  const dateMap = {
    'date1': 'March 19, 2026',
    'date2': 'May 22, 2026',
    'date3': 'August 19, 2026',
    'date4': 'October 23, 2026',
    'date5': 'December 8, 2026'
  };
  
  if (Array.isArray(preferredDates)) {
    return preferredDates.map(id => dateMap[id] || id).join(', ');
  }
  
  return preferredDates;
}

// pages/api/webhook.js
// This API route receives webhooks and writes to Google Sheets + Supabase
// Photos uploaded to Cloudinary

import { google } from 'googleapis';
import { v2 as cloudinary } from 'cloudinary';
import { createClient } from '@supabase/supabase-js';

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zqpawrdblhxllmfpygkk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxcGF3cmRibGh4bGxtZnB5Z2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4OTgyODQsImV4cCI6MjA4MzQ3NDI4NH0.qtekiX3TY-y6T5i1acSNwuXWwaiOL5OVtFbPEODKpvs';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Validate environment variables for Google Sheets
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
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
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
      
      // Save to Supabase
      try {
        const { error } = await supabase
          .from('registrations')
          .insert([{
            name: item.name,
            email: item.email,
            phone: item.phone || null,
            professional_title: item.professionalTitle || null,
            bio: item.bio || null,
            food_allergies: item.foodAllergies || null,
            event_date: item.date || null,
            location: item.location || null,
            classification: item.group || null,
            registration_date: item.timestamp || new Date().toISOString(),
            photo_link: photoLink || null
          }]);
        
        if (error) {
          console.error('Supabase insert error:', error);
        } else {
          console.log('Saved to Supabase:', item.name);
        }
      } catch (supaError) {
        console.error('Supabase error:', supaError);
      }
      
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
      // Delete from Google Sheets
      await deleteRowByEmail(sheets, sheetName, item.email);
      
      // Delete from Supabase registrations
      try {
        const { error } = await supabase
          .from('registrations')
          .delete()
          .eq('email', item.email);
        
        if (error) console.error('Supabase delete error:', error);
      } catch (supaError) {
        console.error('Supabase error:', supaError);
      }
      
      const photoLink = await uploadPhotoToCloudinary(item.picture, item.name, item.email);
      
      // Add to Supabase waitlist
      try {
        const preferredDatesStr = Array.isArray(item.preferredDates) ? item.preferredDates.join(',') : item.preferredDates || '';
        
        const { error } = await supabase
          .from('waitlist')
          .insert([{
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
          }]);
        
        if (error) {
          console.error('Supabase waitlist insert error:', error);
        }
      } catch (supaError) {
        console.error('Supabase error:', supaError);
      }
      
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
      
      // Delete from Supabase registrations
      try {
        await supabase.from('registrations').delete().eq('email', item.email);
      } catch (supaError) {
        console.error('Supabase error:', supaError);
      }
      
      // Add to Supabase invites
      try {
        await supabase.from('invites').insert([{
          name: item.name,
          email: item.email,
          request_date: item.timestamp || new Date().toISOString()
        }]);
      } catch (supaError) {
        console.error('Supabase error:', supaError);
      }
      
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
      
      // Delete from Supabase
      try {
        await supabase.from('registrations').delete().eq('email', item.email);
      } catch (supaError) {
        console.error('Supabase error:', supaError);
      }
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
      
      // Save to Supabase
      try {
        const preferredDatesStr = Array.isArray(item.preferredDates) ? item.preferredDates.join(',') : item.preferredDates || '';
        
        await supabase.from('waitlist').insert([{
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
        }]);
        
        console.log('Saved to Supabase waitlist:', item.name);
      } catch (supaError) {
        console.error('Supabase error:', supaError);
      }
      
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
      
      // Delete from Supabase waitlist
      try {
        await supabase.from('waitlist').delete().eq('email', item.email);
      } catch (supaError) {
        console.error('Supabase error:', supaError);
      }
      
      const photoLink = await uploadPhotoToCloudinary(item.picture, item.name, item.email);
      
      // Add to Supabase registrations
      try {
        await supabase.from('registrations').insert([{
          name: item.name,
          email: item.email,
          phone: item.phone || null,
          professional_title: item.professionalTitle || null,
          bio: item.bio || null,
          food_allergies: item.foodAllergies || null,
          event_date: item.date || null,
          location: item.location || null,
          classification: item.group || null,
          registration_date: item.timestamp || new Date().toISOString(),
          photo_link: photoLink || null
        }]);
      } catch (supaError) {
        console.error('Supabase error:', supaError);
      }
      
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
      
      // Delete from Supabase waitlist
      try {
        await supabase.from('waitlist').delete().eq('email', item.email);
      } catch (supaError) {
        console.error('Supabase error:', supaError);
      }
      
      // Add to Supabase invites
      try {
        await supabase.from('invites').insert([{
          name: item.name,
          email: item.email,
          request_date: item.timestamp || new Date().toISOString()
        }]);
      } catch (supaError) {
        console.error('Supabase error:', supaError);
      }
      
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
      
      // Delete from Supabase
      try {
        await supabase.from('waitlist').delete().eq('email', item.email);
      } catch (supaError) {
        console.error('Supabase error:', supaError);
      }
    }
  }
}

/**
 * Handle invites
 */
async function handleInvites(sheets, action, items) {
  const sheetName = 'Invites';

  if (action === 'new' || action === 'bulk_export') {
    const rows = items.map(item => {
      // Save to Supabase
      try {
        supabase.from('invites').insert([{
          name: item.name,
          email: item.email,
          request_date: item.timestamp || new Date().toISOString()
        }]).then(({ error }) => {
          if (error) console.error('Supabase invite insert error:', error);
          else console.log('Saved to Supabase invites:', item.name);
        });
      } catch (supaError) {
        console.error('Supabase error:', supaError);
      }
      
      return [
        item.name || '',
        item.email || '',
        formatDate(item.timestamp)
      ];
    });

    await appendRows(sheets, sheetName, rows);
  }
}


/**
 * Append rows to Google Sheets
 */
async function appendRows(sheets, sheetName, rows) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: {
        values: rows,
      },
    });
    console.log(`Appended ${rows.length} rows to ${sheetName}`);
  } catch (error) {
    console.error(`Error appending to ${sheetName}:`, error);
    throw error;
  }
}

/**
 * Delete row by email
 */
async function deleteRowByEmail(sheets, sheetName, email) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return;

    // Find row with matching email (column B, index 1)
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
        console.log(`Deleted row ${i + 1} from ${sheetName}`);
        break;
      }
    }
  } catch (error) {
    console.error(`Error deleting row from ${sheetName}:`, error);
  }
}

/**
 * Get sheet ID by name
 */
async function getSheetId(sheets, sheetName) {
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
  return sheet ? sheet.properties.sheetId : 0;
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
 * Sanitize filename
 */
function sanitizeFilename(str) {
  return str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

/**
 * Format date as MM/DD/YYYY
 */
function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Format preferred dates
 */
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

// pages/api/test-photo.js
// Test Drive API photo upload

import { google } from 'googleapis';

const GOOGLE_DRIVE_FOLDER_ID = '1sfGf7XMBgmpvayoXHwc5-04igwwjVOdY';

const GOOGLE_CREDENTIALS = {
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

export default async function handler(req, res) {
  try {
    console.log('=== Testing Photo Upload ===');
    console.log('Folder ID:', GOOGLE_DRIVE_FOLDER_ID);
    console.log('Service Account:', GOOGLE_CREDENTIALS.client_email);
    
    // Authenticate with Google
    const auth = new google.auth.GoogleAuth({
      credentials: GOOGLE_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    console.log('Creating Drive client...');
    const drive = google.drive({ version: 'v3', auth });
    
    console.log('Auth successful, creating test file...');
    
    // Create a simple test file
    const testContent = 'This is a test file from Salon Dinners - ' + new Date().toISOString();
    const buffer = Buffer.from(testContent);
    
    // Convert buffer to stream
    const { Readable } = require('stream');
    const stream = Readable.from(buffer);
    
    const response = await drive.files.create({
      requestBody: {
        name: `salon_test_${Date.now()}.txt`,
        parents: [GOOGLE_DRIVE_FOLDER_ID],
        mimeType: 'text/plain'
      },
      media: {
        mimeType: 'text/plain',
        body: stream
      },
      supportsAllDrives: true
    });
    
    console.log('File created with ID:', response.data.id);
    
    // Make it public
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      },
      supportsAllDrives: true
    });
    
    console.log('Permissions set successfully');
    
    const downloadLink = `https://drive.google.com/uc?export=download&id=${response.data.id}`;
    
    return res.status(200).json({
      success: true,
      message: 'Test file uploaded successfully! Check your Drive folder.',
      fileId: response.data.id,
      fileName: `salon_test_${Date.now()}.txt`,
      downloadLink: downloadLink,
      folderId: GOOGLE_DRIVE_FOLDER_ID,
      serviceAccount: GOOGLE_CREDENTIALS.client_email
    });
    
  } catch (error) {
    console.error('=== ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      errorCode: error.code,
      errorDetails: error.toString(),
      helpfulTips: [
        '1. Make sure Google Drive API is enabled in Google Cloud Console',
        '2. Share the Drive folder with: ' + GOOGLE_CREDENTIALS.client_email,
        '3. Give the service account Editor permission',
        '4. Check that folder ID is correct: ' + GOOGLE_DRIVE_FOLDER_ID
      ]
    });
  }
}

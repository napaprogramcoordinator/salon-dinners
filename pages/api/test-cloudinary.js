// pages/api/test-cloudinary.js
// Test Cloudinary photo upload

import { v2 as cloudinary } from 'cloudinary';

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export default async function handler(req, res) {
  try {
    console.log('=== Testing Cloudinary Upload ===');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('API Key:', process.env.CLOUDINARY_API_KEY ? 'Set ✅' : 'Not set ❌');
    console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'Set ✅' : 'Not set ❌');
    
    // Check if credentials are set
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new Error('CLOUDINARY_CLOUD_NAME not set');
    }
    if (!process.env.CLOUDINARY_API_KEY) {
      throw new Error('CLOUDINARY_API_KEY not set');
    }
    if (!process.env.CLOUDINARY_API_SECRET) {
      throw new Error('CLOUDINARY_API_SECRET not set');
    }
    
    // Create a simple test image (1x1 red pixel)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const dataUri = `data:image/png;base64,${testImageBase64}`;
    
    console.log('Uploading test image to Cloudinary...');
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataUri, {
      public_id: `salon-dinners/test_${Date.now()}`,
      folder: 'salon-dinners',
      resource_type: 'image',
      overwrite: false
    });
    
    console.log('Upload successful!');
    console.log('URL:', result.secure_url);
    
    return res.status(200).json({
      success: true,
      message: 'Test image uploaded to Cloudinary successfully!',
      url: result.secure_url,
      publicId: result.public_id,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      format: result.format,
      width: result.width,
      height: result.height,
      instructions: 'Click the URL above to view the test image. If you see a small red pixel, Cloudinary is working!'
    });
    
  } catch (error) {
    console.error('=== ERROR ===');
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      errorDetails: error.toString(),
      helpfulTips: [
        '1. Make sure CLOUDINARY_CLOUD_NAME is set in Vercel',
        '2. Make sure CLOUDINARY_API_KEY is set in Vercel',
        '3. Make sure CLOUDINARY_API_SECRET is set in Vercel',
        '4. All three must be set for Production, Preview, AND Development',
        '5. Redeploy after adding environment variables'
      ]
    });
  }
}

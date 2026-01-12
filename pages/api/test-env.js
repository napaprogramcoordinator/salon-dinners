export default function handler(req, res) {
  res.status(200).json({
    hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    hasKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    hasSheetId: !!process.env.GOOGLE_SPREADSHEET_ID
  });
}

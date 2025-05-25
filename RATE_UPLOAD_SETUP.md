# Rate Upload Setup Guide

## Overview
The Rate Management system now supports AI-powered file uploads that can extract rate information from PDF, Word, and Excel files using OpenAI's GPT API.

## Required Environment Variables

Add these variables to your `.env` file:

```env
# Supabase Configuration (for API routes)
NEXT_PUBLIC_SUPABASE_URL=https://nlhcgalwrxopexwriumx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

## Getting API Keys

### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env` file

### Supabase Service Role Key
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the `service_role` key (not the `anon` key)
5. Add it to your `.env` file

## Features

### File Upload Support
- **PDF files**: Extracts text using pdf-parse
- **Word documents (.docx)**: Extracts text using mammoth
- **Excel files (.xlsx)**: Converts sheets to CSV format

### AI Processing
- Uses GPT-4 to intelligently extract rate information
- Maps data to database schema automatically
- Validates extracted data before insertion

### File Restrictions
- Maximum file size: 5MB
- Supported formats: .pdf, .docx, .xlsx
- Files are automatically deleted after processing

### Database Integration
- Automatically inserts validated rates into the `rates` table
- Tracks import metadata (source file, import date, method)
- Supports bulk imports with error handling

## Usage

1. Navigate to Settings → Rate Management
2. Click "Upload Rates" button
3. Select a file (PDF, Word, or Excel)
4. Wait for AI processing to complete
5. Review imported rates in the list

## Testing

Use the included `sample-rates.txt` file to test the functionality:
1. Copy the content to a Word document or PDF
2. Upload the file through the interface
3. Verify that rates are extracted and imported correctly

## Error Handling

The system handles various error scenarios:
- Invalid file types
- Files too large
- Extraction failures
- AI processing errors
- Database insertion errors
- Network timeouts

## Security

- Files are processed server-side only
- Uploaded files are automatically deleted after processing
- Service role key is used for secure database access
- File size limits prevent abuse

## Troubleshooting

### Common Issues

1. **"Upload failed" error**
   - Check that all environment variables are set
   - Verify OpenAI API key is valid and has credits
   - Ensure Supabase service role key is correct

2. **"No text could be extracted"**
   - File may be corrupted or password-protected
   - Try converting to a different format
   - Ensure file contains readable text

3. **"No valid rate data found"**
   - File may not contain clear pricing information
   - Try adding more context to your rate descriptions
   - Ensure dates and prices are clearly formatted

### Debug Mode

To enable detailed logging, check the browser console and server logs for specific error messages. 
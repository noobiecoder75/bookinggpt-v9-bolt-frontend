import express from 'express';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { authenticateUser } from '../lib/supabase.js';
import OpenAI from 'openai';
import mammoth from 'mammoth';
import xlsx from 'xlsx';

const router = express.Router();

// Function to create Supabase client (called when needed)
function getSupabaseClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  );
}

// Function to create OpenAI client (called when needed)
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.VITE_OPENAI_API_KEY,
  });
}

// File size limit (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.xlsx'];

async function extractTextFromFile(filePath, mimeType) {
  try {
    const buffer = fs.readFileSync(filePath);
    
    if (mimeType === 'application/pdf') {
      // Dynamically import pdf-parse only when we need it
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      return data.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      let text = '';
      
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const sheetText = xlsx.utils.sheet_to_csv(sheet);
        text += sheetText + '\n';
      });
      
      return text;
    } else {
      throw new Error('Unsupported file type');
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    throw new Error(`Failed to extract text from file: ${error.message}`);
  }
}

// Function to estimate token count (rough approximation: 1 token ≈ 4 characters)
function estimateTokenCount(text) {
  return Math.ceil(text.length / 4);
}

// Function to chunk text into smaller pieces
function chunkText(text, maxTokens = 6000) { // Leave room for prompt tokens
  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = '';
  
  for (const word of words) {
    const testChunk = currentChunk + (currentChunk ? ' ' : '') + word;
    
    if (estimateTokenCount(testChunk) > maxTokens && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = word;
    } else {
      currentChunk = testChunk;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

async function processTextWithAI(text) {
  const prompt = `
You are a data extraction specialist. Extract rate information from the following text and return it as a JSON array.

IMPORTANT: Your response must be ONLY a valid JSON array, nothing else. No explanations, no markdown formatting.

Each object in the array should have these exact keys:
- rate_type: string (one of: 'Flight', 'Hotel', 'Tour', 'Insurance', 'Transfer')
- description: string (descriptive name of the rate)
- cost: number (the price/cost value)
- currency: string (3-letter currency code, default to 'USD' if not specified)
- valid_start: string (date in YYYY-MM-DD format, use current date if not specified)
- valid_end: string (date in YYYY-MM-DD format, use one year from start date if not specified)

Rules:
1. Only extract actual rate/pricing information
2. Ensure all required fields are present
3. Convert any percentage discounts to decimal format
4. If dates are relative (e.g., "valid for 1 year"), calculate actual dates
5. Return only valid JSON array, no additional text
6. If no valid rates found, return empty array []
7. Limit to maximum 20 rates to keep response manageable

Text to process:
${text}
`;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Changed from 'gpt-4' to 'gpt-4o' for 128k context
      messages: [
        {
          role: 'system',
          content: 'You are a precise data extraction tool. Return only valid JSON arrays with no additional formatting, explanations, or markdown. Your entire response must be parseable JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 3000, // Reduced to ensure complete responses
    });

    let content = response.choices[0].message.content.trim();
    
    // Remove any markdown formatting if present
    content = content.replace(/```json\n?|\n?```/g, '').trim();
    
    // Remove any leading/trailing text that isn't JSON
    const jsonStart = content.indexOf('[');
    const jsonEnd = content.lastIndexOf(']');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      content = content.substring(jsonStart, jsonEnd + 1);
    }
    
    // Validate that we have proper JSON structure
    if (!content.startsWith('[') || !content.endsWith(']')) {
      console.error('Invalid JSON structure:', content.substring(0, 200) + '...');
      throw new Error('AI response is not a valid JSON array');
    }
    
    try {
      const parsed = JSON.parse(content);
      
      if (!Array.isArray(parsed)) {
        throw new Error('AI response is not an array');
      }
      
      return parsed;
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Content that failed to parse:', content.substring(0, 500) + '...');
      throw new Error(`Invalid JSON response from AI: ${parseError.message}`);
    }
    
  } catch (error) {
    console.error('Error processing with AI:', error);
    throw new Error(`AI processing failed: ${error.message}`);
  }
}

function validateRateData(rates) {
  const validRateTypes = ['Flight', 'Hotel', 'Tour', 'Insurance', 'Transfer'];
  const errors = [];
  
  if (!Array.isArray(rates)) {
    throw new Error('Expected an array of rate objects');
  }
  
  rates.forEach((rate, index) => {
    if (!rate.rate_type || !validRateTypes.includes(rate.rate_type)) {
      errors.push(`Rate ${index + 1}: Invalid or missing rate_type`);
    }
    
    if (!rate.description || typeof rate.description !== 'string') {
      errors.push(`Rate ${index + 1}: Missing or invalid description`);
    }
    
    if (typeof rate.cost !== 'number' || rate.cost < 0) {
      errors.push(`Rate ${index + 1}: Invalid cost value`);
    }
    
    if (!rate.currency || typeof rate.currency !== 'string' || rate.currency.length !== 3) {
      errors.push(`Rate ${index + 1}: Invalid currency code`);
    }
    
    // Validate dates
    if (!rate.valid_start || isNaN(Date.parse(rate.valid_start))) {
      errors.push(`Rate ${index + 1}: Invalid valid_start date`);
    }
    
    if (!rate.valid_end || isNaN(Date.parse(rate.valid_end))) {
      errors.push(`Rate ${index + 1}: Invalid valid_end date`);
    }
  });
  
  if (errors.length > 0) {
    throw new Error(`Validation errors: ${errors.join(', ')}`);
  }
  
  return true;
}

// Upload endpoint
router.post('/upload', authenticateUser, async (req, res) => {
  console.log('=== Upload request received ===');
  console.log('Authenticated user:', req.user.id);
  
  try {
    // Parse the form data
    console.log('Step 1: Parsing form data...');
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    console.log('Step 1 complete: Form parsed');
    console.log('Fields:', fields);
    console.log('Files:', Object.keys(files));
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      console.log('Error: No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File details:', {
      originalFilename: file.originalFilename,
      mimetype: file.mimetype,
      size: file.size,
      filepath: file.filepath
    });

    // Validate file extension
    console.log('Step 2: Validating file extension...');
    const fileExtension = path.extname(file.originalFilename || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      console.log('Error: Invalid file extension:', fileExtension);
      return res.status(400).json({ 
        error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}` 
      });
    }
    console.log('Step 2 complete: File extension valid:', fileExtension);

    // Validate file size
    console.log('Step 3: Validating file size...');
    if (file.size > MAX_FILE_SIZE) {
      console.log('Error: File too large:', file.size);
      return res.status(400).json({ 
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      });
    }
    console.log('Step 3 complete: File size valid:', file.size);

    // Extract text from file
    console.log('Step 4: Extracting text from file...');
    const extractedText = await extractTextFromFile(file.filepath, file.mimetype);
    console.log('Step 4 complete: Text extracted, length:', extractedText?.length || 0);
    
    if (!extractedText || extractedText.trim().length === 0) {
      console.log('Error: No text extracted from file');
      return res.status(400).json({ error: 'No text could be extracted from the file' });
    }

    // Process with AI
    console.log('Step 5: Processing text with AI...');
    const ratesData = await processTextWithAI(extractedText);
    console.log('Step 5 complete: AI processing done, rates found:', ratesData?.length || 0);
    
    if (!ratesData || ratesData.length === 0) {
      console.log('Error: No valid rate data extracted');
      return res.status(400).json({ 
        error: 'No valid rate data could be extracted from the file' 
      });
    }

    // Validate the extracted data
    console.log('Step 6: Validating extracted data...');
    validateRateData(ratesData);
    console.log('Step 6 complete: Data validation passed');

    // Use authenticated user's ID instead of form field
    const agentId = req.user.id;
    console.log('Using authenticated agent ID:', agentId);

    // Prepare data for insertion
    console.log('Step 7: Preparing data for database insertion...');
    const ratesToInsert = ratesData.map(rate => ({
      ...rate,
      agent_id: agentId, // Use authenticated user's ID
      details: {
        imported_from: file.originalFilename,
        imported_at: new Date().toISOString(),
        extraction_method: 'ai_powered',
        uploaded_by: req.user.email
      }
    }));
    console.log('Step 7 complete: Data prepared for insertion');

    // Insert into database
    console.log('Step 8: Inserting into database...');
    const supabase = getSupabaseClient();
    const { data: insertedRates, error: insertError } = await supabase
      .from('rates')
      .insert(ratesToInsert)
      .select();

    if (insertError) {
      console.error('Database insertion error:', insertError);
      return res.status(500).json({ 
        error: 'Failed to save rates to database',
        details: insertError.message 
      });
    }
    console.log('Step 8 complete: Database insertion successful');

    // Clean up uploaded file
    console.log('Step 9: Cleaning up uploaded file...');
    try {
      fs.unlinkSync(file.filepath);
      console.log('Step 9 complete: File cleanup successful');
    } catch (cleanupError) {
      console.warn('Failed to clean up uploaded file:', cleanupError);
    }

    console.log('=== Upload completed successfully ===');
    return res.status(200).json({
      success: true,
      message: `Successfully imported ${insertedRates.length} rates`,
      count: insertedRates.length,
      rates: insertedRates
    });

  } catch (error) {
    console.error('=== Upload processing error ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      error: 'Failed to process upload',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Rates API is working',
    timestamp: new Date().toISOString()
  });
});

export default router; 
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import xlsx from 'xlsx';

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// File size limit (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.xlsx'];

export const config = {
  api: {
    bodyParser: false,
  },
};

async function extractTextFromFile(filePath, mimeType) {
  try {
    const buffer = fs.readFileSync(filePath);
    
    if (mimeType === 'application/pdf') {
      const data = await pdf(buffer);
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

async function processTextWithAI(text) {
  const prompt = `
You are a data extraction specialist. Extract rate information from the following text and return it as a JSON array.

Each object in the array should have these exact keys that match the database schema:
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

Text to process:
${text}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a precise data extraction tool. Return only valid JSON arrays with no additional formatting or explanation.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content.trim();
    
    // Remove any markdown formatting if present
    const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
    
    return JSON.parse(jsonContent);
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the form data
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file extension
    const fileExtension = path.extname(file.originalFilename || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return res.status(400).json({ 
        error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}` 
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      });
    }

    // Extract text from file
    const extractedText = await extractTextFromFile(file.filepath, file.mimetype);
    
    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: 'No text could be extracted from the file' });
    }

    // Process with AI
    const ratesData = await processTextWithAI(extractedText);
    
    if (!ratesData || ratesData.length === 0) {
      return res.status(400).json({ 
        error: 'No valid rate data could be extracted from the file' 
      });
    }

    // Validate the extracted data
    validateRateData(ratesData);

    // Get the current user (you might need to implement proper auth here)
    const agentId = fields.agent_id?.[0] || 'd7bed82f-accb-4bb1-96da-1d59c8725e5c'; // Default for demo

    // Prepare data for insertion
    const ratesToInsert = ratesData.map(rate => ({
      ...rate,
      agent_id: agentId,
      details: {
        imported_from: file.originalFilename,
        imported_at: new Date().toISOString(),
        extraction_method: 'ai_powered'
      }
    }));

    // Insert into database
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

    // Clean up uploaded file
    try {
      fs.unlinkSync(file.filepath);
    } catch (cleanupError) {
      console.warn('Failed to clean up uploaded file:', cleanupError);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${insertedRates.length} rates`,
      count: insertedRates.length,
      rates: insertedRates
    });

  } catch (error) {
    console.error('Upload processing error:', error);
    
    // Clean up file if it exists
    try {
      if (req.file?.filepath) {
        fs.unlinkSync(req.file.filepath);
      }
    } catch (cleanupError) {
      console.warn('Failed to clean up file after error:', cleanupError);
    }

    return res.status(500).json({
      error: 'Failed to process upload',
      message: error.message
    });
  }
} 
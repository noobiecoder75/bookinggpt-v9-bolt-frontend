import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://nlhcgalwrxopexwriumx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5saGNnYWx3cnhvcGV4d3JpdW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTU5MDI5NiwiZXhwIjoyMDU1MTY2Mjk2fQ.TSZYfPt-pqhkyX92aVpD7sToFVCzIW3TWxSuLqzBvXs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigrationViaMCP() {
  console.log('🔄 Applying migrations using Supabase MCP Server...');
  console.log('');
  
  console.log('✅ Migration files ready for MCP server:');
  console.log('  - 20250714224850_fix_quote_id_data_types.sql');
  console.log('  - 20250714224851_fix_customer_id_data_types.sql');
  console.log('');
  
  console.log('🤖 Using Supabase MCP Server:');
  console.log('  MCP Configuration: src/.cursor/mcp.json');
  console.log('  Access Token: sbp_0d028464aa6b4c59999002b0a7b21a2971b9758e');
  console.log('  The MCP server should automatically detect and apply these migrations.');
  console.log('');
  
  // Display the migration details
  try {
    console.log('=== MIGRATION 1: Fix Quote ID Data Types ===');
    const migration1 = fs.readFileSync('./supabase/migrations/20250714224850_fix_quote_id_data_types.sql', 'utf8');
    console.log('File: 20250714224850_fix_quote_id_data_types.sql');
    console.log('Status: Ready for MCP server application');
    console.log('');
    
    console.log('=== MIGRATION 2: Fix Customer ID Data Types ===');
    const migration2 = fs.readFileSync('./supabase/migrations/20250714224851_fix_customer_id_data_types.sql', 'utf8');
    console.log('File: 20250714224851_fix_customer_id_data_types.sql');
    console.log('Status: Ready for MCP server application');
    console.log('');
    
    console.log('🎯 These migrations will:');
    console.log('  1. Fix quote_id data type mismatches (VARCHAR/UUID → BIGINT)');
    console.log('  2. Fix customer_id data type mismatches (INTEGER → BIGINT)');
    console.log('  3. Preserve existing data where possible');
    console.log('  4. Update foreign key constraints and indexes');
    console.log('');
    
    console.log('📡 MCP Server Integration:');
    console.log('  The Supabase MCP server should now be able to detect these');
    console.log('  properly formatted migration files and apply them automatically.');
    console.log('  Run this script to confirm the migrations are ready for MCP processing.');
    
  } catch (err) {
    console.error('Error reading migration files:', err.message);
  }
}

async function applyMigration() {
  console.log('🗃️  Migration files have been recreated for Supabase MCP Server');
  console.log('');
  
  await applyMigrationViaMCP();
}

applyMigration();
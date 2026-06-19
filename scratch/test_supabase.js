import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

let supabaseUrl = '';
let supabaseAnonKey = '';

for (const line of envLines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  }
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = line.split('=')[1].trim();
  }
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const testUuid = '613d905c-b452-4ad9-91c5-15badf360094';
  console.log('Fetching profile with ID:', testUuid);
  const { data, error } = await supabase.from('profiles').select('*').eq('id', testUuid).maybeSingle();
  if (error) {
    console.error('Fetch failed:', error);
  } else {
    console.log('Fetch success:', data);
  }
}



test();



import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tkkxhjfzgnnpgxluqkwx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRra3hoamZ6Z25ucGd4bHVxa3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjMwMzEsImV4cCI6MjA5NjEzOTAzMX0.uuIv5u1y_yAAqBSSbtQv5Ym0eApb19MXdLZrq9Mz7QY';

console.log('SUPABASE URL', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zcgnfelzcyzyzyfmwkhz.supabase.co'
const supabaseKey = 'sb_publishable_Z9U6WO2nt_0zDwelfhtLzg_NzhL_RPP'

export const supabase = createClient(supabaseUrl, supabaseKey)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://uakgadybphmqvlfeyabv.supabase.co";
const SUPABASE_KEY = "sb_publishable_aJF38Xlh7VFiyoYmKzH5HA_KDrskbMf";

export const db = createClient(SUPABASE_URL, SUPABASE_KEY);
// ПІДКЛЮЧЕННЯ ДО SUPABASE
// Встав свої дані: Supabase -> кнопка Connect (або Project Settings -> API Keys).
// Дозволено ТІЛЬКИ publishable (anon) ключ. Ключ service_role сюди класти заборонено!
const SUPABASE_URL = "https://hclwhidljihzyccmqeuv.supabase.co";
const SUPABASE_KEY = "sb_publishable_cWxuPKnqU2iHYCN7zxb24Q__V5hPqua";

// Сесія зберігається в браузері й автоматично відновлюється після перезавантаження
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
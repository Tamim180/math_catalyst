const SUPABASE_URL = 'https://yzyqbylfhnosuxprjajv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_08zlHP2WpoPEzNOwMVgepw_0L-cl6Ob';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* Cloudflare Turnstile PUBLIC site key (Cloudflare dashboard -> Turnstile -> your widget).
   Never put the secret key here. */
const TURNSTILE_SITE_KEY = '0x4AAAAAAGLfBZA20AVQQIKS';

/* shown on the login page under "Forgot password?" */
const SUPPORT_CONTACT = 'WhatsApp 01XXXXXXXXX';

const loginPanel = document.getElementById('p-login');
const regPanel = document.getElementById('p-register');

function showMsg(panel, text, ok) {
  let box = panel.querySelector('.auth-msg');
  if (!box) {
    box = document.createElement('div');
    box.className = 'auth-msg';
    box.style.cssText = 'margin-top:12px;font-size:13px;text-align:center';
    panel.querySelector('.btn').after(box);
  }
  box.style.color = ok ? '#34d399' : '#f87171';
  box.textContent = text;
}

/* ── security check (Cloudflare Turnstile) ──
   Only active when a real site key is set in supabase-config.js */
const captchaOn = typeof TURNSTILE_SITE_KEY === 'string'
  && TURNSTILE_SITE_KEY !== '' && !TURNSTILE_SITE_KEY.startsWith('PASTE');
const captcha = {};                         // 'login' / 'register' -> { id, token }

function loadTurnstile() {
  return new Promise(resolve => {
    if (window.turnstile) return resolve();
    window.onloadTurnstileCallback = resolve;
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit';
    s.async = true;
    document.head.appendChild(s);
  });
}

async function ensureCaptcha(key, panel) {
  if (!captchaOn || captcha[key]) return;
  captcha[key] = { id: null, token: '' };
  const box = document.createElement('div');
  box.style.cssText = 'display:flex;justify-content:center;margin:4px 0 14px;min-height:65px';
  panel.querySelector('.btn').before(box);
  await loadTurnstile();
  captcha[key].id = turnstile.render(box, {
    sitekey: TURNSTILE_SITE_KEY,
    theme: 'dark',
    callback: t => { captcha[key].token = t; },
    'expired-callback': () => { captcha[key].token = ''; },
    'error-callback': () => { captcha[key].token = ''; }
  });
}
const captchaToken = key => (captchaOn && captcha[key]) ? captcha[key].token : undefined;
function resetCaptcha(key) {                // a token works only once
  if (captchaOn && captcha[key] && captcha[key].id !== null) {
    turnstile.reset(captcha[key].id);
    captcha[key].token = '';
  }
}

ensureCaptcha('login', loginPanel);
// the register form is hidden at first: load its check when the tab is opened
new MutationObserver(() => {
  if (regPanel.classList.contains('active')) ensureCaptcha('register', regPanel);
}).observe(regPanel, { attributes: true, attributeFilter: ['class'] });

/* ── SIGN IN ── */
loginPanel.querySelector('.btn').addEventListener('click', async () => {
  const email = loginPanel.querySelector('input[type=email]').value.trim();
  const password = loginPanel.querySelector('input[type=password]').value;
  if (!email || !password) return showMsg(loginPanel, 'Enter your email and password.');
  if (captchaOn && !captchaToken('login')) return showMsg(loginPanel, 'Please complete the security check first.');

  const { data, error } = await sb.auth.signInWithPassword({
    email, password, options: { captchaToken: captchaToken('login') }
  });
  resetCaptcha('login');
  if (error) return showMsg(loginPanel, error.message);

  const { data: prof } = await sb.from('profiles').select('banned').eq('id', data.user.id).maybeSingle();
  if (prof && prof.banned) {
    await sb.auth.signOut();
    return showMsg(loginPanel, 'This account has been suspended. Please contact your teacher.');
  }
  location.href = 'home.html';
});

/* ── FORGOT PASSWORD: no email, the teacher sets a new one from the admin page ── */
const forgot = loginPanel.querySelector('.forgot');
if (forgot) {
  forgot.style.cursor = 'pointer';
  forgot.addEventListener('click', () => {
    const contact = (typeof SUPPORT_CONTACT === 'string' && SUPPORT_CONTACT) ? SUPPORT_CONTACT : 'your teacher';
    showMsg(loginPanel, `Forgot your password? Message your teacher (${contact}) and they will set a new one for you.`, true);
  });
}

/* ── REGISTER ── */
regPanel.querySelector('.btn').addEventListener('click', async () => {
  const texts = regPanel.querySelectorAll('input[type=text]');
  const name = texts[0].value.trim();
  const school = texts[1].value.trim();
  const cls = texts[2].value.trim();
  const email = regPanel.querySelector('input[type=email]').value.trim();
  const pws = regPanel.querySelectorAll('input[type=password]');

  if (!name || !email || !pws[0].value) return showMsg(regPanel, 'Fill in name, email and password.');
  if (pws[0].value.length < 6) return showMsg(regPanel, 'Password must be at least 6 characters.');
  if (pws[0].value !== pws[1].value) return showMsg(regPanel, 'Passwords do not match.');
  if (captchaOn && !captchaToken('register')) return showMsg(regPanel, 'Please complete the security check first.');

  const { data, error } = await sb.auth.signUp({
    email, password: pws[0].value,
    options: { data: { full_name: name }, captchaToken: captchaToken('register') }
  });
  resetCaptcha('register');
  if (error) return showMsg(regPanel, error.message);

  if (data.session) {
    await sb.from('profiles').update({ school, class_level: cls }).eq('id', data.user.id);
    location.href = 'home.html';
  } else {
    showMsg(regPanel, 'Account created. Check your email to confirm, then sign in.', true);
  }
});

/* sent back here because the account is suspended */
if (new URLSearchParams(location.search).get('banned')) {
  showMsg(loginPanel, 'This account has been suspended. Please contact your teacher.');
}

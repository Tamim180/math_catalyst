const loginPanel = document.getElementById('p-login');
const regPanel = document.getElementById('p-register');

function showMsg(panel, text) {
  let box = panel.querySelector('.auth-msg');
  if (!box) {
    box = document.createElement('div');
    box.className = 'auth-msg';
    box.style.cssText = 'margin-top:12px;font-size:13px;color:#f87171;text-align:center';
    panel.querySelector('.btn').after(box);
  }
  box.textContent = text;
}

/* ── SIGN IN ── */
loginPanel.querySelector('.btn').addEventListener('click', async () => {
  const email = loginPanel.querySelector('input[type=email]').value.trim();
  const password = loginPanel.querySelector('input[type=password]').value;
  if (!email || !password) return showMsg(loginPanel, 'Enter your email and password.');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return showMsg(loginPanel, error.message);
  const { data: prof } = await sb.from('profiles').select('banned').eq('id', data.user.id).maybeSingle();
  if (prof && prof.banned) {
    await sb.auth.signOut();
    return showMsg(loginPanel, 'This account has been suspended. Please contact your teacher.');
  }
  location.href = 'home.html';
});

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

  const { data, error } = await sb.auth.signUp({
    email, password: pws[0].value,
    options: { data: { full_name: name } }
  });
  if (error) return showMsg(regPanel, error.message);

  if (data.session) {
    await sb.from('profiles').update({ school, class_level: cls }).eq('id', data.user.id);
    location.href = 'home.html';
  } else {
    showMsg(regPanel, 'Account created. Check your email to confirm, then sign in.');
  }
});

/* sent back here because the account is suspended */
if (new URLSearchParams(location.search).get('banned')) {
  showMsg(loginPanel, 'This account has been suspended. Please contact your teacher.');
}

const $ = id => document.getElementById(id);
const ic = (n, c = '') => `<svg class="ic ${c}"><use href="#i-${n}"/></svg>`;
const CPL = '<svg class="cp-logo"><use href="#copilot-logo"/></svg>';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
const hhmm = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// ---------- 1. DATOS ----------
const KEY = 'edge_ux_prototype_db_v3';
let usersDB = {}; try { usersDB = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
let U = null, priv = false, selPin = null, zoom = 100, tabs = [], ai = 0;
const dlUrls = new WeakMap(), pwShown = new Set();
const Z = [25, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500];

const DEF = { trackingPrevention: true, thirdCookies: true, dnt: false, searchEngine: 'Bing', memorySaver: true, efficiencyMode: true,
    showHome: true, showFav: true, showExt: false, showCopilotBtn: false, copilotContext: true, copilotSuggest: false, askDownload: false, theme: 'dark',
    experience: 'focused', savePasswords: true, autofill: true, sync: true, showLinks: true, showBg: true, translate: true };
const LBL = { trackingPrevention: 'Prevención de seguimiento', thirdCookies: 'Bloquear cookies de terceros', dnt: 'Enviar "No realizar seguimiento"',
    searchEngine: 'Buscador predeterminado', memorySaver: 'Ahorro de memoria', efficiencyMode: 'Modo de eficiencia', showHome: 'Botón de página principal',
    showFav: 'Botón de favoritos', showExt: 'Botón de extensiones', showCopilotBtn: 'Botón de Copilot', copilotContext: 'Copilot con contenido de la página', copilotSuggest: 'Sugerencias de Copilot',
    askDownload: 'Preguntar dónde guardar descargas', theme: 'Tema', experience: 'Experiencia de inicio', savePasswords: 'Ofrecer guardar contraseñas',
    autofill: 'Autorrellenar', sync: 'Sincronización', showLinks: 'Accesos directos', showBg: 'Imagen de fondo', translate: 'Ofrecer traducción' };

const defLinks = () => [{ name: 'Outlook', url: 'https://outlook.live.com/', icon: '📧' }, { name: 'YouTube', url: 'https://www.youtube.com/', icon: '▶️' }, { name: 'UDH', url: 'https://www.udh.edu.pe/', icon: '🎓' }];
const defFavs = () => [{ n: 'Gmail', u: 'https://mail.google.com', c: '#EA4335' }, { n: 'YouTube', u: 'https://www.youtube.com', c: '#FF0000' }, { n: 'Maps', u: 'https://maps.google.com', c: '#4285F4' }, { n: 'UDH - Universidad de Huánuco', u: 'https://www.udh.edu.pe', c: '#0F6CBD' }];
function ensure(u) {
    for (const k in DEF) if (u[k] === undefined) u[k] = DEF[k];
    u.history = u.history || []; u.favs = u.favs || defFavs(); u.downloads = u.downloads || []; u.passwords = u.passwords || [];
    u.ext = u.ext || {}; u.chats = u.chats || []; u.quickLinks = u.quickLinks || defLinks();
    u.downloads.forEach(d => { delete d.p; });
    return u;
}
function persist() {
    if (!U || U.isGuest) return;
    usersDB[U.email] = U;
    try { localStorage.setItem(KEY, JSON.stringify(usersDB)); } catch (e) {}
}
const avatarSVG = () => '<svg class="avatar-svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#D5D4D2"/><circle cx="20" cy="16" r="6.5" fill="#8F8E8D"/><path d="M7 34c1.5-7 7-9.5 13-9.5s11.5 2.5 13 9.5a20 20 0 0 1-26 0z" fill="#8F8E8D"/></svg>';

function toast(msg, icon = 'ℹ️') {
    const c = $('toastContainer'), t = document.createElement('div');
    t.className = 'toast'; t.innerHTML = `<span>${icon}</span> <span>${msg}</span>`; c.appendChild(t);
    setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ---------- 2. DIÁLOGOS ----------
function collect(o) {
    const r = {};
    o.querySelectorAll('[data-k]').forEach(e => { r[e.dataset.k] = e.type === 'checkbox' ? e.checked : e.value; });
    return r;
}
function dlg(title, body, btns, w = 460) {
    return new Promise(res => {
        const o = document.createElement('div'); o.className = 'dlg-overlay';
        o.innerHTML = `<div class="dlg" style="max-width:${w}px"><div class="dlg-title">${title}</div><div class="dlg-body">${body}</div><div class="dlg-actions">${btns.map((b, i) => `<button class="${b.p ? 'primary-btn' : 'secondary-btn'} sm" data-b="${i}">${b.t}</button>`).join('')}</div></div>`;
        document.body.appendChild(o);
        const close = v => { o.remove(); res(v); };
        o.addEventListener('click', e => {
            const b = e.target.closest('[data-b]');
            if (b) { const x = btns[b.dataset.b]; close(x.v !== undefined ? x.v : (x.p ? collect(o) : null)); }
            else if (e.target === o) close(null);
        });
        o.addEventListener('keydown', e => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { const p = o.querySelector('.primary-btn'); if (p) p.click(); }
            if (e.key === 'Escape') close(null);
        });
        const f = o.querySelector('input,textarea,select'); if (f) f.focus();
    });
}

// ---------- 3. PERFILES / SESIÓN ----------
function renderProfileSelector() {
    const grid = $('savedProfilesGrid');
    grid.style.display = 'flex'; $('pinUnlockBox').style.display = 'none'; $('createProfileBox').style.display = 'none'; $('recoverBox').style.display = 'none'; selPin = null; recUser = null; recCode = null; grid.innerHTML = '';
    Object.keys(usersDB).forEach(email => {
        const u = usersDB[email], card = document.createElement('button');
        card.className = 'profile-card';
        card.innerHTML = `<div class="profile-card-avatar">${esc(u.name.charAt(0).toUpperCase())}</div><span class="profile-card-name">${esc(u.name)}</span><span class="profile-card-lock">${u.pin ? '🔒 PIN' : '🔓 Sin PIN'}</span>`;
        card.onclick = () => {
            if (u.pin) openUnlock(email);
            else activate(u);
        };
        grid.appendChild(card);
    });
    const add = document.createElement('button'); add.className = 'profile-card';
    add.innerHTML = '<div class="profile-card-avatar add-new">+</div><span class="profile-card-name">Nuevo perfil</span><span class="profile-card-lock">Con o sin PIN</span>';
    add.onclick = showCreate; grid.appendChild(add);
}
const show = (id, on) => { $(id).style.display = on ? 'block' : 'none'; };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/, PIN_RE = /^\d{4}$/, FAKE_MAIL = /@edge\.local$/;
const maskEmail = e => { if (FAKE_MAIL.test(e)) return 'tu correo registrado'; const [a, d] = e.split('@'); return a.charAt(0) + '•'.repeat(Math.max(2, a.length - 1)) + '@' + d; };
function saveDB() { try { localStorage.setItem(KEY, JSON.stringify(usersDB)); } catch (e) {} }
let failPin = 0, recUser = null, recCode = null;

// Solo números en los campos de PIN / código
document.querySelectorAll('.pin-input').forEach(i => i.addEventListener('input', () => { i.value = i.value.replace(/\D/g, ''); }));

// ----- Crear perfil: el PIN es opcional -----
const pinMode = () => document.querySelector('input[name="pinChoice"]:checked').value;
function syncPinChoice() {
    const yes = pinMode() === 'yes';
    show('pinFields', yes); show('noPinHint', !yes);
    $('optPinYes').classList.toggle('selected', yes); $('optPinNo').classList.toggle('selected', !yes);
}
document.querySelectorAll('input[name="pinChoice"]').forEach(r => r.addEventListener('change', syncPinChoice));
function showCreate() {
    $('savedProfilesGrid').style.display = 'none'; show('createProfileBox', true);
    ['loginName', 'loginEmail', 'loginPin', 'loginPinConfirm'].forEach(id => { $(id).value = ''; });
    document.querySelector('input[name="pinChoice"][value="no"]').checked = true; syncPinChoice();
    $('loginName').focus();
}
$('btnLogin').onclick = () => {
    const withPin = pinMode() === 'yes', name = $('loginName').value.trim() || 'Usuario', rawMail = $('loginEmail').value.trim().toLowerCase();
    if (withPin && !EMAIL_RE.test(rawMail)) return toast('Escribe un correo válido: lo usaremos para recuperar tu PIN si lo olvidas', '⚠️');
    if (!withPin && rawMail && !EMAIL_RE.test(rawMail)) return toast('El correo no es válido', '⚠️');
    const pin = $('loginPin').value.trim();
    if (withPin) {
        if (!PIN_RE.test(pin)) return toast('El PIN debe tener exactamente 4 números', '⚠️');
        if (pin !== $('loginPinConfirm').value.trim()) return toast('Los PIN no coinciden', '⚠️');
    }
    const email = rawMail || `usuario_${Date.now()}@edge.local`;
    if (usersDB[email]) return toast('Ya existe un perfil con ese correo', '⚠️');
    usersDB[email] = ensure({ name, email, pin: withPin ? pin : null, isGuest: false, onboarded: false });
    saveDB();
    activate(usersDB[email]);
};

// ----- Desbloquear con PIN -----
function openUnlock(email) {
    const u = usersDB[email]; if (!u) return;
    selPin = email; failPin = 0;
    $('savedProfilesGrid').style.display = 'none'; show('pinUnlockBox', true); show('recoverBox', false);
    $('pinTargetAvatar').textContent = u.name.charAt(0).toUpperCase(); $('pinTargetName').textContent = u.name; $('pinTargetEmail').textContent = FAKE_MAIL.test(u.email) ? '' : u.email;
    $('btnForgotPin').classList.remove('pulse'); show('pinError', false);
    $('unlockPinInput').value = ''; $('unlockPinInput').focus();
}
function verifyPin() {
    const u = usersDB[selPin]; if (!u) return;
    if ($('unlockPinInput').value.trim() === u.pin) { failPin = 0; activate(u); return; }
    failPin++;
    $('unlockPinInput').value = ''; $('unlockPinInput').focus();
    const e = $('pinError'); e.style.display = 'block';
    e.textContent = failPin >= 3 ? `PIN incorrecto (${failPin} intentos). ¿Lo olvidaste? Puedes restablecerlo con un código a tu correo.` : `PIN incorrecto (${failPin} ${failPin === 1 ? 'intento' : 'intentos'}).`;
    toast('PIN incorrecto. Acceso denegado por privacidad.', '🚫');
    if (failPin >= 3) { const b = $('btnForgotPin'); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); }
}
$('btnConfirmPin').onclick = verifyPin;
$('unlockPinInput').addEventListener('keypress', e => { if (e.key === 'Enter') verifyPin(); });
$('btnCancelPin').onclick = () => { renderProfileSelector(); };
$('btnCancelCreate').onclick = renderProfileSelector;

// ----- ¿Olvidaste tu PIN? Recuperación con código por correo -----
function recStep(n) {
    [1, 2, 3].forEach(i => show('recStep' + i, i === n));
    const f = { 2: 'recCodeInput', 3: 'recNewPin' }[n];
    if (f) { ['recCodeInput', 'recNewPin', 'recNewPinConfirm'].forEach(id => { $(id).value = ''; }); $(f).focus(); }
}
function startRecovery() {
    const u = usersDB[selPin]; if (!u) return;
    recUser = u.email; recCode = null;
    show('pinUnlockBox', false); show('recoverBox', true);
    $('recAvatar').textContent = u.name.charAt(0).toUpperCase(); $('recName').textContent = u.name; $('recEmail').textContent = maskEmail(u.email);
    $('recMaskedEmail').textContent = maskEmail(u.email);
    recStep(1);
}
function sendCode() {
    recCode = String(Math.floor(100000 + Math.random() * 900000));
    $('mockMailCode').textContent = recCode; recStep(2);
    toast('Código enviado a ' + maskEmail(recUser), '📧');
}
function verifyCode() {
    if (!recCode) return;
    if ($('recCodeInput').value.trim() === recCode) { recCode = null; recStep(3); toast('Identidad verificada', '✅'); }
    else { toast('Código incorrecto. Revisa tu correo e inténtalo de nuevo.', '🚫'); $('recCodeInput').value = ''; $('recCodeInput').focus(); }
}
function finishRecovery(removePin) {
    const u = usersDB[recUser]; if (!u) return renderProfileSelector();
    if (removePin) u.pin = null;
    else {
        const p = $('recNewPin').value.trim();
        if (!PIN_RE.test(p)) return toast('El PIN debe tener exactamente 4 números', '⚠️');
        if (p !== $('recNewPinConfirm').value.trim()) return toast('Los PIN no coinciden', '⚠️');
        u.pin = p;
    }
    saveDB(); recUser = null; recCode = null; show('recoverBox', false);
    toast(removePin ? 'PIN eliminado: tu perfil ya no está protegido' : 'PIN restablecido correctamente', '🔑');
    activate(u);
}
async function deleteForgottenProfile() {
    const u = usersDB[recUser || selPin]; if (!u) return;
    const ok = await dlg('Eliminar este perfil', `<p>Si no puedes acceder a tu correo, la única forma de recuperar el uso del navegador es eliminar el perfil <strong>${esc(u.name)}</strong> con todo su historial, favoritos y contraseñas guardadas.</p><p style="margin-top:8px"><strong>Esta acción no se puede deshacer.</strong></p>`, [{ t: 'Cancelar', v: false }, { t: 'Eliminar perfil', p: 1, v: true }], 420);
    if (ok !== true) return;
    delete usersDB[u.email]; saveDB(); renderProfileSelector();
    toast('Perfil eliminado. Puedes crear uno nuevo con o sin PIN.', '🗑️');
}
$('btnForgotPin').onclick = startRecovery;
$('btnRecBack').onclick = () => openUnlock(recUser);
$('btnRecSend').onclick = sendCode;
$('btnRecResend').onclick = sendCode;
$('btnRecVerify').onclick = verifyCode;
$('recCodeInput').addEventListener('keypress', e => { if (e.key === 'Enter') verifyCode(); });
$('btnRecSave').onclick = () => finishRecovery(false);
$('btnRecRemovePin').onclick = () => finishRecovery(true);
$('recNewPinConfirm').addEventListener('keypress', e => { if (e.key === 'Enter') finishRecovery(false); });
$('btnNoEmailAccess').onclick = deleteForgottenProfile;
function guest() { activate(ensure({ name: 'Invitado', email: 'Sesión temporal sin historial', pin: null, isGuest: true, onboarded: true })); }
$('btnGuestMode').onclick = guest;

function setAvatar() {
    const g = U.isGuest || priv;
    $('userAvatarBtn').innerHTML = g ? ic(priv ? 'inprivate' : 'personq') : avatarSVG();
    $('panelAvatar').innerHTML = g ? ic(priv ? 'inprivate' : 'personq') : avatarSVG();
}
function updateProfilePanel() {
    setAvatar();
    $('panelName').textContent = U.name; $('panelEmail').textContent = U.email;
    $('panelPinBadge').textContent = U.isGuest ? '🕵️ Modo Invitado (no guarda historial)' : (U.pin ? '🔒 Perfil protegido con PIN' : '🔓 Perfil sin PIN');
    $('btnChangePin').style.display = U.isGuest ? 'none' : 'flex';
    $('btnChangePin').querySelector('.mi-label').textContent = U.pin ? 'Cambiar o quitar PIN' : 'Agregar PIN de acceso';
    $('syncLabel').textContent = U.sync ? 'La sincronización está activada' : 'La sincronización está desactivada';
}
function activate(u) {
    U = ensure(u); priv = false; document.body.classList.remove('inprivate'); $('inprivateBadge').style.display = 'none';
    $('loginScreen').style.display = 'none';
    tabs = [newTab()]; ai = 0; zoom = 100; $('viewport').style.zoom = 1;
    cpNew(); renderQuick(); updateProfilePanel(); applySettings(); refreshPanels(); render();
    toast(U.isGuest ? 'Modo Invitado activo: tu historial no se guardará' : `Bienvenido, ${esc(U.name)}`, U.isGuest ? '🕵️' : '✅');
    if (!U.onboarded && !U.isGuest) { selMode = 'focused'; btnF.classList.add('active'); btnN.classList.remove('active'); $('onboardingModal').style.display = 'flex'; }
}
function logout(toShow) {
    const wasGuest = U && U.isGuest;
    closeAll(); toggleCp(false); closeFind(); U = null; priv = false; document.body.classList.remove('inprivate');
    renderProfileSelector(); $('loginScreen').style.display = 'flex';
    if (toShow === 'create') showCreate();
    else toast(wasGuest ? 'Sesión de invitado cerrada y borrada' : 'Perfil bloqueado por seguridad', '🔒');
}
$('btnLogout').onclick = () => logout();
$('btnNewProfile').onclick = () => logout('create');
$('btnGuestFromMenu').onclick = () => { closeAll(); guest(); };
$('btnPasswords').onclick = () => { closeAll(); openInternal('passwords'); };
$('btnProfileSettings').onclick = () => { closeAll(); openInternal('settings', 'profile'); };
$('btnSyncToggle').onclick = () => { setSetting('sync', !U.sync); updateProfilePanel(); };
$('btnChangePin').onclick = changePin;
async function changePin() {
    if (!U || U.isGuest) return toast('El modo invitado no usa PIN', '🕵️');
    closeAll();
    const has = !!U.pin, needMail = !has && FAKE_MAIL.test(U.email), pinIn = (k, ph) => `<input type="password" class="pin-input" data-k="${k}" maxlength="4" inputmode="numeric" placeholder="${ph}">`;
    let body = '';
    if (has) body += '<div class="dlg-lbl">PIN actual</div>' + pinIn('cur', 'PIN actual');
    body += `<div class="dlg-lbl">${has ? 'Nuevo PIN (déjalo vacío para quitar el PIN)' : 'Crea un PIN de 4 dígitos'}</div>` + pinIn('pin', has ? 'Nuevo PIN' : 'PIN de 4 dígitos') + pinIn('pin2', 'Confirma el PIN');
    if (needMail) body += '<div class="dlg-lbl">Correo de recuperación (por si olvidas el PIN)</div><input type="text" data-k="mail" placeholder="correo@ejemplo.com">';
    body += has ? '<p class="pin-hint" style="margin-top:6px">Si no recuerdas tu PIN actual, bloquea el perfil y elige "¿Olvidaste tu PIN?" en la pantalla de inicio.</p>' : '<p class="pin-hint" style="margin-top:6px">Con un PIN, nadie más podrá abrir tu perfil en este equipo.</p>';
    const r = await dlg(has ? 'Cambiar o quitar el PIN' : 'Agregar PIN de acceso', body, [{ t: 'Cancelar' }, { t: has ? 'Guardar' : 'Activar PIN', p: 1 }], 400);
    if (!r) return;
    const p = (r.pin || '').trim();
    if (has && (r.cur || '').trim() !== U.pin) return toast('El PIN actual no es correcto', '🚫');
    if (!has && !p) return toast('Escribe un PIN de 4 números para activarlo', '⚠️');
    if (p) {
        if (!PIN_RE.test(p)) return toast('El PIN debe ser de 4 dígitos numéricos', '⚠️');
        if (p !== (r.pin2 || '').trim()) return toast('Los PIN no coinciden', '⚠️');
    }
    if (needMail) {
        const m = (r.mail || '').trim().toLowerCase();
        if (!EMAIL_RE.test(m)) return toast('Escribe un correo válido para poder recuperar tu PIN', '⚠️');
        if (usersDB[m]) return toast('Ya existe un perfil con ese correo', '⚠️');
        delete usersDB[U.email]; U.email = m;
    }
    U.pin = p || null; persist(); updateProfilePanel(); if (page().view === 'view-internal') buildInternal(page());
    toast(U.pin ? (has ? 'PIN de seguridad actualizado' : 'PIN activado: tu perfil ahora está protegido') : 'PIN eliminado del perfil', '🔑');
}

// ---------- 4. ONBOARDING ----------
const btnF = $('btnFocused'), btnN = $('btnNews'); let selMode = 'focused';
btnF.onclick = () => { selMode = 'focused'; btnF.classList.add('active'); btnN.classList.remove('active'); };
btnN.onclick = () => { selMode = 'informative'; btnN.classList.add('active'); btnF.classList.remove('active'); };
$('startBrowsingBtn').onclick = () => {
    $('onboardingModal').style.display = 'none'; U.experience = selMode; U.onboarded = true; persist(); applySettings();
    toast(selMode === 'focused' ? 'Experiencia Enfocada activada (sin distracciones)' : 'Experiencia Informativa activada', '🎯');
};
$('btnQuickHideNews').onclick = () => { setSetting('experience', 'focused', true); toast('Noticias ocultadas. Modo Lienzo en blanco activo.', '🎯'); };

// ---------- 5. AJUSTES ----------
function setSetting(k, v, silent) {
    U[k] = v; persist(); applySettings();
    if (k === 'trackingPrevention' && $('trkBadge')) { $('trkBadge').textContent = v ? 'Activado' : 'Desactivado'; $('trkBadge').className = 'status-badge ' + (v ? 'on' : 'off'); }
    if (k === 'copilotContext' && !v) { cp.ctx = null; cpRender(); }
    if (!silent) toast(typeof v === 'boolean' ? `${LBL[k] || 'Opción'}: ${v ? 'activada' : 'desactivada'}` : `${LBL[k] || 'Opción'}: ${v}`, '⚙️');
}
function applySettings() {
    if (!U) return;
    document.body.classList.toggle('dark-mode', U.theme === 'dark');
    $('btnHome').style.display = U.showHome ? '' : 'none';
    $('btnFavPanel').style.display = U.showFav ? '' : 'none';
    $('btnCopilot').style.display = U.showCopilotBtn ? '' : 'none';
    $('btnExtensions').style.display = U.showExt ? '' : 'none';
    if (!U.showCopilotBtn) toggleCp(false);
    $('btnDownloads').style.display = U.downloads.length ? '' : 'none';
    $('quickLinksContainer').style.display = U.showLinks ? 'flex' : 'none';
    $('view-home').style.background = U.showBg ? '' : 'var(--edge-bg-top)';
    $('newsFeedContainer').style.display = U.experience === 'informative' ? 'block' : 'none';
    $('toggleNewsFeed').checked = U.experience === 'informative'; $('toggleLinks').checked = U.showLinks; $('toggleBackground').checked = U.showBg;
    $('inprivateBanner').style.display = priv ? 'flex' : 'none';
    if (tabs.length) renderTabs();
}
$('customizeBtn').onclick = () => $('customSidebar').classList.add('open');
$('closeSidebar').onclick = () => $('customSidebar').classList.remove('open');
$('btnSaveSidebar').onclick = () => { $('customSidebar').classList.remove('open'); toast('Preferencias guardadas', '💾'); };
$('toggleLinks').onchange = e => setSetting('showLinks', e.target.checked, true);
$('toggleBackground').onchange = e => setSetting('showBg', e.target.checked, true);
$('toggleNewsFeed').onchange = e => setSetting('experience', e.target.checked ? 'informative' : 'focused', true);

// ---------- 6. ACCESOS DIRECTOS ----------
function renderQuick() {
    const c = $('quickLinksContainer'); c.innerHTML = '';
    U.quickLinks.forEach(l => {
        const a = document.createElement('a'); a.href = l.url; a.target = '_blank'; a.rel = 'noopener'; a.className = 'quick-link'; a.title = 'Abrir ' + l.name;
        a.innerHTML = `<div class="quick-link-icon">${esc(l.icon)}</div><span>${esc(l.name)}</span>`;
        a.addEventListener('click', () => addHistory(l.name, l.url, 'globe')); c.appendChild(a);
    });
    if (U.quickLinks.length < 4) {
        const b = document.createElement('button'); b.className = 'quick-link';
        b.innerHTML = '<div class="quick-link-icon dashed">+</div><span>Añadir sitio</span>'; b.onclick = addQuick; c.appendChild(b);
    }
}
async function addQuick() {
    if (U.quickLinks.length >= 4) return toast('Máximo 4 accesos directos', '⚠️');
    const r = await dlg('Agregar acceso directo', '<label>Nombre</label><input type="text" data-k="n" placeholder="Canvas, GitHub…"><label>URL</label><input type="text" data-k="u" value="https://">', [{ t: 'Cancelar' }, { t: 'Agregar', p: 1 }], 400);
    if (!r || !r.n.trim() || !r.u.trim()) return;
    let u = r.u.trim(); if (!/^https?:/.test(u)) u = 'https://' + u;
    U.quickLinks.push({ name: r.n.trim().slice(0, 14), url: u, icon: '🌐' }); persist(); renderQuick(); commit();
    toast(`Acceso "${esc(r.n.trim())}" añadido`, '⭐');
}

// ---------- 7. HISTORIAL / DESCARGAS / FAVORITOS / EXTENSIONES ----------
function addHistory(title, url, ico = 'search', q) {
    if (!U || U.isGuest || priv) return;
    U.history.unshift({ title, url, ic: ico, q, time: hhmm(), ts: Date.now() }); U.history = U.history.slice(0, 200); persist(); renderHist();
}
const hIcon = h => h.ic || 'search';
function renderHist(f) {
    const box = $('historyListContainer'); if (!box || !U) return;
    f = (f !== undefined ? f : $('historySearch').value || '').toLowerCase();
    if (U.isGuest || priv) { box.innerHTML = `<div class="empty-state">🕵️ <strong>${priv ? 'Navegación InPrivate' : 'Modo Invitado'} activo</strong><br>Edge no guarda tu historial en esta sesión.</div>`; return; }
    const rows = U.history.map((h, i) => ({ h, i })).filter(x => !f || (x.h.title + ' ' + (x.h.url || '')).toLowerCase().includes(f));
    if (!rows.length) { box.innerHTML = '<div class="empty-state">No hay historial para mostrar.<br>Tus búsquedas recientes aparecerán aquí.</div>'; return; }
    box.innerHTML = '<div class="list-section">Actividad reciente</div>' + rows.map(x => `<div class="list-item" data-act="hopen" data-arg="${x.i}"><span class="icon">${ic(hIcon(x.h))}</span><div class="info"><div class="title">${esc(x.h.title)}</div><div class="time">${esc(x.h.time)}</div></div><button class="li-del" data-act="hdel" data-arg="${x.i}" title="Eliminar">${ic('x')}</button></div>`).join('');
}
$('historySearch').oninput = e => renderHist(e.target.value);

function addDownload(name, size, url) {
    const d = { name, size, ts: Date.now(), p: 0 }; if (url) dlUrls.set(d, url);
    U.downloads.unshift(d); $('btnDownloads').style.display = ''; $('dlBadge').style.display = 'block';
    closeAll(); renderDl(); $('downloadsPanel').classList.add('visible');
    const iv = setInterval(() => {
        d.p = Math.min(100, d.p + 20 + Math.random() * 15);
        if (d.p >= 100) {
            clearInterval(iv); delete d.p; persist();
            if (url) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
            toast(`Descarga completada: ${esc(name)}`, '⬇️');
        }
        renderDl(); if (page().view === 'view-internal' && page().name === 'downloads') buildInternal(page());
    }, 180);
}
function renderDl() {
    const box = $('downloadsListContainer'); if (!box || !U) return;
    if (!U.downloads.length) { box.innerHTML = '<div class="empty-state" style="padding:24px 10px">Cuando descargues archivos de la web, se mostrarán aquí.</div>'; return; }
    box.innerHTML = U.downloads.map((d, i) => `<div class="dl-item"><div class="dl-top">${ic('file')}<span class="dl-name">${esc(d.name)}</span><button class="li-del" style="display:inline-flex" data-act="ddel" data-arg="${i}" title="Quitar de la lista">${ic('x')}</button></div>${d.p != null ? `<div class="dl-bar"><div style="width:${d.p}%"></div></div><div class="dl-meta"><span>Descargando… ${Math.round(d.p)}%</span><span>${fmt(d.size)}</span></div>` : `<div class="dl-meta"><span>${fmt(d.size)} · Completado</span><span><button class="dl-link" data-act="dopen" data-arg="${i}">Abrir archivo</button></span></div>`}</div>`).join('');
}
function fakeFile(name, text) {
    const b = new Blob([text], { type: 'text/plain;charset=utf-8' }); return { size: b.size, url: URL.createObjectURL(b) };
}

function favKey() { return page().url || 'edge://newtab'; }
function updateStar() { if (U) $('btnBookmark').classList.toggle('saved', U.favs.some(f => f.u === favKey())); }
function toggleFav() {
    const k = favKey(), i = U.favs.findIndex(f => f.u === k);
    if (i >= 0) { U.favs.splice(i, 1); toast('Eliminado de favoritos', '⭐'); }
    else { const p = page(); U.favs.push({ n: p.search || p.title, u: k, c: ['#0F6CBD', '#E81123', '#107C10', '#8E5AF5', '#FF8C00'][U.favs.length % 5] }); toast('Página guardada en favoritos', '⭐'); }
    commit();
}
$('btnBookmark').onclick = toggleFav; $('favAddCurrent').onclick = () => { if (!U.favs.some(f => f.u === favKey())) toggleFav(); else toast('Esta página ya está en favoritos', '⭐'); };
function renderFavs() {
    const box = $('favoritesListContainer'); if (!box || !U) return;
    box.innerHTML = U.favs.length ? U.favs.map((f, i) => `<div class="list-item" data-act="fopen" data-arg="${i}"><span class="fav-ico" style="background:${f.c || '#0F6CBD'}">${esc(f.n.charAt(0).toUpperCase())}</span><div class="info"><div class="title">${esc(f.n)}</div></div><button class="li-del" data-act="fdel" data-arg="${i}" title="Eliminar">${ic('x')}</button></div>`).join('') : '<div class="empty-state" style="padding:24px 10px">Aún no tienes favoritos.</div>';
}

const EXT = [
    { id: 'adblock', n: 'Bloqueador de anuncios', d: 'Bloquea anuncios y ventanas emergentes en las páginas web.', i: 'shield' },
    { id: 'reader', n: 'Modo lectura mejorado', d: 'Muestra los artículos sin distracciones.', i: 'eye' },
    { id: 'dark', n: 'Modo oscuro para sitios web', d: 'Aplica un tema oscuro a los sitios que visitas.', i: 'moon' },
    { id: 'pass', n: 'Administrador de contraseñas', d: 'Guarda y rellena tus credenciales de forma segura.', i: 'key' },
    { id: 'color', n: 'Selector de color', d: 'Obtén el código de color de cualquier punto de la página.', i: 'pencil' },
    { id: 'notes', n: 'Notas rápidas', d: 'Toma notas sin salir de la pestaña actual.', i: 'file' }
];
function renderExt() {
    const box = $('extensionsListContainer'); if (!box || !U) return;
    const inst = EXT.filter(e => U.ext[e.id]);
    box.innerHTML = inst.length ? inst.map(e => `<div class="ext-item"><span class="ext-ico">${ic(e.i)}</span><div class="ext-info"><b>${e.n}</b><span>${U.ext[e.id].on ? 'Activada' : 'Desactivada'}</span></div><label class="switch"><input type="checkbox" data-ext="${e.id}" ${U.ext[e.id].on ? 'checked' : ''}><span class="slider"></span></label></div>`).join('') + '<div class="menu-sep"></div><button class="menu-item" data-act="goto" data-arg="extensions"><span class="mi-label">Obtener más extensiones</span></button>'
        : '<div class="empty-state" style="padding:20px 10px">No tienes extensiones instaladas.</div><button class="menu-item" data-act="goto" data-arg="extensions">' + ic('puzzle') + '<span class="mi-label">Obtener extensiones para Microsoft Edge</span></button>';
}
function refreshPanels() { if (!U) return; renderHist(); renderDl(); renderFavs(); renderExt(); updateStar(); }
function commit() { persist(); refreshPanels(); applySettings(); if (U && page().view === 'view-internal') buildInternal(page()); }

$('histOpenPage').onclick = () => { closeAll(); openInternal('history'); };
$('histClearAll').onclick = () => { closeAll(); clearDataDlg(); };
$('dlOpenPage').onclick = () => { closeAll(); openInternal('downloads'); };
$('dlClearAll').onclick = () => { U.downloads = []; commit(); toast('Descargas borradas', '🗑️'); };
$('extManage').onclick = () => { closeAll(); openInternal('extensions'); };
$('favOpenPage').onclick = () => { closeAll(); openInternal('favorites'); };

async function clearDataDlg() {
    const r = await dlg('Borrar datos de exploración', '<label>Intervalo de tiempo</label><select data-k="rng"><option>Última hora</option><option>Últimas 24 horas</option><option selected>Todo el tiempo</option></select><label class="chk"><input type="checkbox" data-k="hist" checked> Historial de exploración</label><label class="chk"><input type="checkbox" data-k="dl" checked> Historial de descargas</label><label class="chk"><input type="checkbox" data-k="cache"> Imágenes y archivos en caché</label><label class="chk"><input type="checkbox" data-k="cookies"> Cookies y otros datos de sitios</label><label class="chk"><input type="checkbox" data-k="pw"> Contraseñas guardadas</label>', [{ t: 'Cancelar' }, { t: 'Borrar ahora', p: 1 }]);
    if (!r) return;
    if (r.hist) U.history = []; if (r.dl) U.downloads = []; if (r.pw) U.passwords = [];
    commit(); toast('Datos de exploración eliminados', '🗑️');
}

// ---------- 8. PESTAÑAS Y NAVEGACIÓN ----------
const newTab = () => ({ h: [{ view: 'view-home', url: '', title: 'Nueva pestaña', ico: 'newtab' }], i: 0, group: null });
const cur = () => tabs[ai], page = () => tabs[ai].h[tabs[ai].i];
const PAGES = { settings: ['Configuración', 'gear'], history: ['Historial', 'history'], downloads: ['Descargas', 'download'], favorites: ['Favoritos', 'favlist'], extensions: ['Extensiones', 'puzzle'], passwords: ['Contraseñas', 'key'], about: ['Acerca de Microsoft Edge', 'info'], help: ['Ayuda y comentarios', 'help'] };
const SECS = ['profile', 'privacy', 'appearance', 'newtab', 'search', 'performance', 'downloads', 'copilot', 'about'];

function load(cb) {
    const b = $('loadingBar'), s = $('btnRefresh').firstElementChild;
    b.style.display = 'block'; b.style.animation = 'loadProgress 0.45s ease-out forwards'; s.classList.add('spin-icon');
    setTimeout(() => { b.style.display = 'none'; b.style.animation = 'none'; s.classList.remove('spin-icon'); if (cb) cb(); }, 450);
}
function navigate(view, url, title, extra = {}) {
    load(() => { const t = cur(); t.h = t.h.slice(0, t.i + 1); t.h.push({ view, url, title, ...extra }); t.i++; render(); });
}
function executeWebSearch(q) {
    const base = { Google: 'https://www.google.com/search?q=', DuckDuckGo: 'https://duckduckgo.com/?q=' }[U.searchEngine] || 'https://www.bing.com/search?q=';
    const url = base + encodeURIComponent(q);
    addHistory(`${q} - Buscar en ${U.searchEngine}`, url, 'search', q);
    navigate('view-search', url, `${q} - Buscar`, { search: q, ico: 'search' });
}
function openUrl(u, title) { window.open(u, '_blank', 'noopener'); addHistory(title || u, u, 'globe'); toast('Abierto en una pestaña nueva del navegador real', '🌐'); }
function openInternal(name, section) {
    if (!PAGES[name]) return toast('Página no disponible', '⚠️');
    const url = name === 'settings' ? 'edge://settings/' + (section || 'profile') : 'edge://' + name;
    if (!(page().view === 'view-home' && cur().h.length === 1)) { tabs.push(newTab()); ai = tabs.length - 1; }
    navigate('view-internal', url, PAGES[name][0], { ico: PAGES[name][1], name, section: section || 'profile' });
}
function handleOmni(txt) {
    txt = txt.trim(); if (!txt) return;
    const m = txt.match(/^edge:\/\/([\w-]+)(?:\/([\w-]+))?/i);
    if (m) {
        const n = m[1].toLowerCase(), s = (m[2] || '').toLowerCase();
        if (n === 'settings') return openInternal('settings', SECS.includes(s) ? s : 'profile');
        if (n === 'privacy') return openInternal('settings', 'privacy');
        if (n === 'performance') return openInternal('settings', 'performance');
        if (PAGES[n]) return openInternal(n);
        return toast(`edge://${n} no existe`, '⚠️');
    }
    if (!/\s/.test(txt) && (/^https?:\/\//i.test(txt) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(txt))) return openUrl(/^https?:/i.test(txt) ? txt : 'https://' + txt, txt);
    executeWebSearch(txt);
}
$('urlInput').addEventListener('keypress', e => { if (e.key === 'Enter') handleOmni(e.target.value); });
$('urlInput').addEventListener('focus', e => e.target.select());
$('mainSearchInput').addEventListener('keypress', e => { if (e.key === 'Enter' && e.target.value.trim()) { executeWebSearch(e.target.value.trim()); e.target.value = ''; } });
$('btnBack').onclick = () => { const t = cur(); if (t.i > 0) { t.i--; load(render); } };
$('btnForward').onclick = () => { const t = cur(); if (t.i < t.h.length - 1) { t.i++; load(render); } };
$('btnRefresh').onclick = () => load(render);
$('btnHome').onclick = () => navigate('view-home', '', 'Nueva pestaña', { ico: 'newtab' });
document.querySelector('.mic-icon').onclick = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast('Tu navegador no admite búsqueda por voz', '🎤');
    const r = new SR(); r.lang = 'es-PE'; toast('Escuchando… habla ahora', '🎤');
    r.onresult = ev => executeWebSearch(ev.results[0][0].transcript); r.onerror = () => toast('No se pudo usar el micrófono', '🎤'); r.start();
};

function render() {
    const p = page(), t = cur(); clearMarks();
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); $(p.view).classList.add('active');
    $('urlInput').value = p.url || ''; $('addrIcon').innerHTML = ic(p.view === 'view-internal' ? 'info' : 'search');
    if (p.view === 'view-home') $('mainSearchInput').value = '';
    if (p.view === 'view-search') {
        buildSearchPage(p);
    } else if (p.view === 'view-internal') buildInternal(p);
    $('btnBack').style.opacity = t.i > 0 ? 1 : 0.3; $('btnForward').style.opacity = t.i < t.h.length - 1 ? 1 : 0.3;
    renderTabs(); updateStar(); refreshDev();
}

// ---------- BÚSQUEDA CON RESULTADOS REALES (API pública de Wikipedia / Wikimedia Commons) ----------
let searchTok = 0; const searchCache = {};
const WIKI = { es: 'https://es.wikipedia.org/w/api.php', en: 'https://en.wikipedia.org/w/api.php', commons: 'https://commons.wikimedia.org/w/api.php' };
async function wikiGet(base, params) {
    const r = await fetch(base + '?' + new URLSearchParams({ format: 'json', origin: '*', ...params }));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
}
async function wikiSearch(q) {
    for (const lang of ['es', 'en']) {
        const d = await wikiGet(WIKI[lang], { action: 'query', generator: 'search', gsrsearch: q, gsrlimit: 8, prop: 'extracts|pageimages|info', exintro: 1, explaintext: 1, exlimit: 'max', piprop: 'thumbnail', pithumbsize: 200, inprop: 'url' });
        const pages = Object.values((d.query && d.query.pages) || {}).sort((a, b) => a.index - b.index);
        if (pages.length) return { lang, pages };
    }
    return { lang: 'es', pages: [] };
}
async function wikiImages(q) {
    const d = await wikiGet(WIKI.commons, { action: 'query', generator: 'search', gsrnamespace: 6, gsrsearch: q, gsrlimit: 24, prop: 'imageinfo', iiprop: 'url', iiurlwidth: 320 });
    return Object.values((d.query && d.query.pages) || {}).sort((a, b) => a.index - b.index).filter(p => p.imageinfo && p.imageinfo[0].thumburl);
}
const sentencesOf = t => (String(t || '').replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+(?=\s|$)/g) || [String(t || '').trim()]).map(s => s.trim()).filter(Boolean);
const clip = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t; };
const shortUrl = u => { try { const x = new URL(u); return x.host + ' › ' + decodeURIComponent(x.pathname.replace(/^\//, '')).replace(/\//g, ' › '); } catch (e) { return u; } };

function buildSearchPage(p) {
    const q = p.search, tab = p.tab || 'all', eng = U.searchEngine, root = $('bingPage'), tok = ++searchTok;
    const tabs = [['all', 'Todo'], ['img', 'Imágenes'], ['https://www.bing.com/videos/search?q=', 'Vídeos'], ['https://www.bing.com/maps?q=', 'Mapas'], ['https://www.bing.com/news/search?q=', 'Noticias']];
    root.innerHTML = `<div class="bp-top"><span class="bp-brand">${esc(eng)}</span><div class="bp-box"><input id="bpInput" type="text" value="${esc(q)}" autocomplete="off" aria-label="Buscar"><button id="bpGo" title="Buscar">${ic('search')}</button></div></div>
        <div class="bp-tabs">${tabs.map(t => `<button class="bp-tab ${t[0] === tab ? 'active' : ''}" data-tab="${esc(t[0])}">${t[1]}</button>`).join('')}</div>
        <div id="bpBody"><div class="bp-loading">${ic('refresh', 'spin-icon')} Buscando “${esc(q)}”…</div></div>`;
    const go = () => { const v = $('bpInput').value.trim(); if (v) executeWebSearch(v); };
    $('bpGo').onclick = go; $('bpInput').onkeypress = e => { if (e.key === 'Enter') go(); };
    root.querySelectorAll('.bp-tab').forEach(b => b.onclick = () => {
        const t = b.dataset.tab;
        if (t.startsWith('http')) return openUrl(t + encodeURIComponent(q), `${b.textContent} - ${q}`);
        p.tab = t; buildSearchPage(p);
    });
    const body = $('bpBody'), live = () => tok === searchTok && p === page();
    (tab === 'img' ? imagesView(q, body, live) : allView(q, body, live, p));
}
async function allView(q, body, live, p) {
    let data;
    try { data = searchCache['a:' + q] || (searchCache['a:' + q] = await wikiSearch(q)); }
    catch (e) { if (!live()) return; return offlineView(q, body, p); }
    if (!live()) return;
    const pages = data.pages;
    if (!pages.length) { body.innerHTML = `<p class="bp-empty">No hay resultados para <strong>${esc(q)}</strong>. Revisa la ortografía o prueba con otras palabras.</p>${footerHTML(p)}`; wireFooter(body, p); return; }
    const top = pages.find(x => x.extract && x.extract.length > 40), sens = top ? sentencesOf(top.extract) : [];
    const chip = '<span class="bp-chip"><i>W</i> Wikipedia</span>';
    const ov = top ? `<section class="bp-ov"><div class="bp-ov-label">${CPL}<span>Resumen</span><small>con datos de Wikipedia</small></div>
        <p class="bp-ov-lead">${esc(sens[0])}</p>
        ${sens.length > 1 ? `<h3>Más sobre “${esc(top.title)}”</h3><ul class="bp-ov-list">${sens.slice(1, 4).map(s => `<li>${esc(s)} ${chip}</li>`).join('')}</ul>` : ''}
        ${sens.length > 4 ? `<ul class="bp-ov-list bp-ov-extra" style="display:none">${sens.slice(4, 9).map(s => `<li>${esc(s)} ${chip}</li>`).join('')}</ul><button class="bp-more" id="bpMore">Mostrar más ${ic('chevron', 'bp-chev')}</button>` : ''}</section>` : '';
    const results = pages.map(x => `<article class="bp-res"><div class="bp-res-main"><div class="bp-site"><span class="bp-fav">W</span><div><div class="bp-site-name">Wikipedia</div><div class="bp-site-url">${esc(shortUrl(x.fullurl))}</div></div></div>
        <a href="#" class="bp-title" data-u="${esc(x.fullurl)}" data-t="${esc(x.title)}">${esc(x.title)} - Wikipedia, la enciclopedia libre</a><p class="bp-snip">${esc(clip(x.extract, 230)) || 'Sin descripción disponible.'}</p></div>${x.thumbnail ? `<img class="bp-thumb" src="${esc(x.thumbnail.source)}" alt="" loading="lazy">` : ''}</article>`).join('');
    const side = pages.slice(0, 2).map(x => `<a href="#" class="bp-card" data-u="${esc(x.fullurl)}" data-t="${esc(x.title)}"><div class="bp-card-site"><span class="bp-fav">W</span> Wikipedia › ${esc(x.title)}</div><strong>${esc(x.title)} - Wikipedia, la enciclopedia libre</strong></a>`).join('');
    const rel = pages.slice(1, 6).map(x => `<button class="bp-rel" data-q="${esc(x.title)}">${ic('search')}<span>${esc(x.title)}</span></button>`).join('');
    body.innerHTML = `<div class="bp-cols"><div class="bp-main">${ov}${results}${footerHTML(p)}</div><aside class="bp-side">${side}${rel ? `<h3 class="bp-side-h">Profundiza en ${esc(q)}</h3>${rel}` : ''}</aside></div>`;
    body.querySelectorAll('[data-u]').forEach(a => a.onclick = e => { e.preventDefault(); openUrl(a.dataset.u, a.dataset.t); });
    body.querySelectorAll('.bp-rel').forEach(b => b.onclick = () => executeWebSearch(b.dataset.q));
    const more = $('bpMore'); if (more) more.onclick = () => { const ex = body.querySelector('.bp-ov-extra'), open = ex.style.display === 'none'; ex.style.display = open ? '' : 'none'; more.firstChild.textContent = open ? 'Mostrar menos ' : 'Mostrar más '; more.classList.toggle('open', open); };
    wireFooter(body, p);
}
async function imagesView(q, body, live) {
    let imgs;
    try { imgs = searchCache['i:' + q] || (searchCache['i:' + q] = await wikiImages(q)); }
    catch (e) { if (!live()) return; body.innerHTML = '<p class="bp-empty">No se pudieron cargar las imágenes. Revisa tu conexión a internet.</p>'; return; }
    if (!live()) return;
    if (!imgs.length) { body.innerHTML = `<p class="bp-empty">No se encontraron imágenes para <strong>${esc(q)}</strong>.</p>`; return; }
    body.innerHTML = `<div class="bp-imgs">${imgs.map(x => `<a href="#" data-u="${esc(x.imageinfo[0].descriptionurl || x.imageinfo[0].url)}" data-t="${esc(x.title.replace(/^Archivo:|^File:/, ''))}"><img src="${esc(x.imageinfo[0].thumburl)}" alt="${esc(x.title.replace(/^Archivo:|^File:/, ''))}" loading="lazy"></a>`).join('')}</div><p class="bp-note">Imágenes de Wikimedia Commons.</p>`;
    body.querySelectorAll('[data-u]').forEach(a => a.onclick = e => { e.preventDefault(); openUrl(a.dataset.u, a.dataset.t); });
}
function offlineView(q, body, p) {
    body.innerHTML = `<div class="bp-offline">${ic('info')} <span><strong>No se pudo conectar a internet.</strong> Se muestran resultados simulados del prototipo; con conexión verás resultados reales.</span></div>${resultsHTML(q)}`;
}
const footerHTML = p => `<p class="bp-note">Resultados obtenidos en línea desde Wikipedia. <a href="#" id="bpEngine">Ver esta búsqueda en ${esc(U.searchEngine)}</a></p>`;
function wireFooter(body, p) { const a = $('bpEngine'); if (a) a.onclick = e => { e.preventDefault(); openUrl(p.url, `${p.search} - ${U.searchEngine}`); }; }

function renderTabs() {
    const c = $('tabsContainer'); c.innerHTML = '';
    tabs.forEach((t, idx) => {
        const p = t.h[t.i], act = idx === ai, sleep = !act && U.memorySaver && tabs.length > 1, el = document.createElement('div');
        el.className = `tab ${act ? 'active' : ''} ${sleep ? 'sleeping' : ''} ${t.group ? 'grouped' : ''}`;
        if (t.group) el.style.setProperty('--group', t.group.color);
        el.title = sleep ? 'Pestaña suspendida (Ahorro de memoria activo)' : p.title;
        el.innerHTML = `<div class="tab-icon">${ic(sleep ? 'moon' : (p.ico || 'globe'))}</div>${t.group ? `<span class="tab-group-chip">${esc(t.group.name)}</span>` : ''}<span class="tab-title">${esc(p.title)}</span><div class="tab-close" data-i="${idx}">${ic('x')}</div>`;
        el.onclick = e => { if (e.target.closest('.tab-close')) closeTab(idx); else { ai = idx; render(); } };
        el.oncontextmenu = e => { e.preventDefault(); tabMenu(idx, e.clientX, e.clientY); };
        c.appendChild(el);
    });
    const b = document.createElement('button'); b.className = 'add-tab-btn'; b.title = 'Nueva pestaña (Ctrl+T)'; b.innerHTML = ic('plus'); b.onclick = addTab; c.appendChild(b);
}
function addTab() { tabs.push(newTab()); ai = tabs.length - 1; render(); }
function closeTab(i) {
    if (tabs.length < 2) return toast('No puedes cerrar la última pestaña.', '🚫');
    tabs.splice(i, 1); if (ai >= tabs.length) ai = tabs.length - 1; else if (ai > i) ai--; render();
}
function tabMenu(idx, x, y) {
    const t = tabs[idx], colors = ['#0F6CBD', '#E81123', '#107C10', '#8E5AF5', '#FF8C00'];
    ctxMenu([
        { i: 'newtab', l: 'Nueva pestaña', f: addTab },
        { i: 'refresh', l: 'Recargar', f: () => { ai = idx; load(render); } },
        { i: 'copy', l: 'Duplicar pestaña', f: () => { tabs.splice(idx + 1, 0, JSON.parse(JSON.stringify(t))); ai = idx + 1; render(); } },
        'sep',
        t.group ? { i: 'tabgroup', l: 'Quitar del grupo', f: () => { t.group = null; renderTabs(); } }
            : { i: 'tabgroup', l: 'Agregar pestaña a un grupo nuevo', f: async () => { const r = await dlg('Nuevo grupo de pestañas', '<input type="text" data-k="n" placeholder="Nombre del grupo (ej. Tareas)">', [{ t: 'Cancelar' }, { t: 'Crear', p: 1 }], 380); if (r && r.n.trim()) { t.group = { name: r.n.trim().slice(0, 10), color: colors[Math.floor(Math.random() * colors.length)] }; renderTabs(); } } },
        'sep',
        { i: 'x', l: 'Cerrar pestaña', f: () => closeTab(idx) },
        { i: 'x', l: 'Cerrar otras pestañas', f: () => { tabs = [t]; ai = 0; render(); } }
    ], x, y);
}

// ---------- 9. MENÚS (Configuración y más) ----------
function closeAll() { document.querySelectorAll('.flyout-panel').forEach(p => p.classList.remove('visible')); document.querySelectorAll('.submenu').forEach(s => s.remove()); }
function showSub(btn, sub) {
    document.querySelectorAll('.sub1').forEach(s => s.remove());
    const s = document.createElement('div'); s.className = 'flyout-panel edge-menu submenu sub1 visible'; fillMenu(s, sub); document.body.appendChild(s);
    const r = btn.getBoundingClientRect(); s.style.cssText = `right:auto;width:300px;left:${Math.max(8, r.left - 308)}px;top:${Math.max(8, r.top - 6)}px`;
}
function ctxMenu(items, x, y) {
    closeAll(); const m = document.createElement('div'); m.className = 'flyout-panel edge-menu submenu ctx visible'; fillMenu(m, items); document.body.appendChild(m);
    m.style.cssText = `right:auto;width:270px;left:${Math.min(x, innerWidth - 280)}px;top:${y}px`;
}
function setZoom(v) { zoom = v; $('viewport').style.zoom = zoom / 100; const z = $('zv'); if (z) z.textContent = zoom + '%'; }
function fillMenu(el, items) {
    el.innerHTML = '';
    items.forEach(it => {
        if (it === 'sep') return el.insertAdjacentHTML('beforeend', '<div class="menu-sep"></div>');
        if (it === 'zoom') {
            const d = document.createElement('div'); d.className = 'zoom-row';
            d.innerHTML = `<span class="zr-label">Zoom</span><div class="zr-ctl"><button data-z="-">${ic('minus')}</button><span class="zr-val" id="zv">${zoom}%</span><button data-z="+">${ic('plus')}</button><span class="zr-sep"></span><button data-z="fs" title="Pantalla completa (F11)">${ic('expand')}</button></div>`;
            d.onclick = e => {
                const b = e.target.closest('[data-z]'); if (!b) return; const k = b.dataset.z, i = Z.indexOf(zoom);
                if (k === '+') setZoom(Z[Math.min(Z.length - 1, (i < 0 ? 6 : i) + 1)]); else if (k === '-') setZoom(Z[Math.max(0, (i < 0 ? 6 : i) - 1)]);
                else toggleFS();
            };
            return el.appendChild(d);
        }
        if (it === 'qs') {
            const d = document.createElement('div'); d.className = 'qs-card';
            d.innerHTML = `<div class="qs-title">Ajustes rápidos</div><div class="qs-row"><button class="qs-btn" data-qs="theme">${ic(U.theme === 'dark' ? 'moon' : 'sun')}<span>${U.theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}</span></button><button class="qs-btn" data-qs="memorySaver">${ic('bolt')}<span>Memoria: ${U.memorySaver ? 'sí' : 'no'}</span></button><button class="qs-btn" data-qs="trackingPrevention">${ic('shield')}<span>Rastreo: ${U.trackingPrevention ? 'bloqueado' : 'permitido'}</span></button></div>`;
            d.onclick = e => { const b = e.target.closest('[data-qs]'); if (!b) return; const k = b.dataset.qs; setSetting(k, k === 'theme' ? (U.theme === 'dark' ? 'light' : 'dark') : !U[k]); fillMenu(el, menuItems()); };
            return el.appendChild(d);
        }
        const b = document.createElement('button'); b.className = 'menu-item';
        b.innerHTML = `${ic(it.i)}<span class="mi-label">${it.l}</span>${it.sc ? `<span class="sc">${it.sc}</span>` : ''}${it.sub ? ic('chevron', 'chev') : ''}`;
        if (it.sub) { b.onmouseenter = () => showSub(b, it.sub); b.onclick = () => showSub(b, it.sub); }
        else { b.onmouseenter = () => document.querySelectorAll('.sub1').forEach(s => s.remove()); b.onclick = () => { closeAll(); it.f && it.f(); }; }
        el.appendChild(b);
    });
}
function menuItems() {
    return [
        'qs',
        { i: 'newtab', l: 'Nueva pestaña', sc: 'Ctrl+T', f: addTab },
        { i: 'inprivate', l: priv ? 'Salir de InPrivate' : 'Nueva ventana InPrivate', sc: 'Ctrl+Mayús+N', f: togglePriv },
        { i: U.theme === 'dark' ? 'sun' : 'moon', l: U.theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro', f: () => setSetting('theme', U.theme === 'dark' ? 'light' : 'dark') },
        'sep', 'zoom', 'sep',
        { i: 'favlist', l: 'Favoritos', sc: 'Ctrl+Mayús+O', f: () => openPanel('favoritesPanel') },
        { i: 'history', l: 'Historial', sc: 'Ctrl+H', f: () => openPanel('historyPanel') },
        { i: 'download', l: 'Descargas', sc: 'Ctrl+J', f: () => openPanel('downloadsPanel') },
        'sep',
        { i: 'shield', l: 'Privacidad y seguridad', f: () => openInternal('settings', 'privacy') },
        { i: 'bolt', l: 'Rendimiento y memoria', f: () => openInternal('settings', 'performance') },
        { i: 'gear', l: 'Configuración', f: () => openInternal('settings', 'profile') },
        'sep',
        {
            i: 'tabgroup', l: 'Más herramientas', sub: [
                { i: 'window', l: 'Nueva ventana', sc: 'Ctrl+N', f: () => window.open(location.href, '_blank') },
                { i: 'key', l: 'Contraseñas', f: () => openInternal('passwords') },
                { i: 'puzzle', l: 'Extensiones', f: () => openPanel('extensionsPanel') },
                { i: 'print', l: 'Imprimir', sc: 'Ctrl+P', f: () => window.print() },
                { i: 'shot', l: 'Captura de pantalla', sc: 'Ctrl+Mayús+S', f: startShot },
                { i: 'find', l: 'Buscar en la página', sc: 'Ctrl+F', f: openFind },
                { i: 'file', l: 'Guardar página como…', sc: 'Ctrl+S', f: savePage },
                { i: 'split', l: 'Vista dividida', f: toggleSplit },
                { i: 'bolt', l: 'Administrador de tareas del explorador', sc: 'Mayús+Esc', f: taskManager },
                { i: 'code', l: 'Ver código fuente de la página', sc: 'Ctrl+U', f: () => toggleDev(true, 'elements') },
                { i: 'code', l: 'Herramientas para desarrolladores', sc: 'F12', f: () => toggleDev() }
            ]
        },
        {
            i: 'help', l: 'Ayuda y comentarios', sub: [
                { i: 'help', l: 'Ayuda de Microsoft Edge', sc: 'F1', f: () => openInternal('help') },
                { i: 'pencil', l: 'Enviar comentarios', sc: 'Alt+Mayús+I', f: feedback },
                { i: 'info', l: 'Acerca de Microsoft Edge', f: () => openInternal('about') }
            ]
        },
        { i: 'x', l: 'Cerrar Microsoft Edge', f: closeEdge }
    ];
}
function openPanel(id) { closeAll(); prep(id); $(id).classList.add('visible'); if (id === 'downloadsPanel') $('dlBadge').style.display = 'none'; }
function prep(id) { if (id === 'settingsMenu') fillMenu($('settingsMenu'), menuItems()); else if (id === 'profilePanel') updateProfilePanel(); else refreshPanels(); }
document.querySelectorAll('.panel-trigger').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); if (!U) return;
    const id = b.dataset.panel, was = $(id).classList.contains('visible'); closeAll(); if (!was) openPanel(id);
}));
document.addEventListener('click', e => {
    if (!e.target.closest('.flyout-panel,.panel-trigger')) closeAll();
    if (!e.target.closest('.cp-menu,#cpMoreBtn,#cpPlusBtn')) document.querySelectorAll('.cp-menu').forEach(m => m.classList.remove('open'));
});
function toggleFS() { if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); else document.exitFullscreen(); }
function togglePriv() {
    priv = !priv; document.body.classList.toggle('inprivate', priv); $('inprivateBadge').style.display = priv ? '' : 'none';
    tabs = [newTab()]; ai = 0; setAvatar(); applySettings(); render(); renderHist();
    toast(priv ? 'Ventana InPrivate: no se guardará tu historial' : 'Saliste de InPrivate', '🕶️');
}
function closeEdge() { closeAll(); $('closedScreen').style.display = 'flex'; }
$('reopenEdge').onclick = () => { $('closedScreen').style.display = 'none'; };
async function feedback() {
    const r = await dlg('Enviar comentarios a Microsoft', '<label>Tipo</label><select data-k="t"><option>Sugerencia</option><option>Algo no funciona</option><option>Me gusta algo</option></select><label>Cuéntanos qué pasó</label><textarea data-k="m" placeholder="Escribe tus comentarios…"></textarea><label class="chk"><input type="checkbox" data-k="s" checked> Incluir captura de pantalla</label>', [{ t: 'Cancelar' }, { t: 'Enviar', p: 1 }]);
    if (r) toast('¡Gracias! Tus comentarios fueron enviados', '💬');
}
function savePage() {
    const f = fakeFile('p', `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(page().title)}</title></head><body>${document.querySelector('.view.active').innerHTML}</body></html>`);
    addDownload(`${page().title.replace(/[^\w\s-]/g, '').trim() || 'pagina'}.html`, f.size, f.url);
}
function taskManager() {
    const rows = () => tabs.map((t, i) => `<tr><td>${ic(t.h[t.i].ico || 'globe')} Pestaña: ${esc(t.h[t.i].title)}</td><td>${(i === ai ? 85 : 38) + (i * 37) % 60} MB</td><td>${i === ai ? (2 + i % 4) : 0}%</td><td><button class="btn-link" data-end="${i}">Finalizar proceso</button></td></tr>`).join('');
    const body = () => `<table class="tm-table"><tr><th>Tarea</th><th>Memoria</th><th>CPU</th><th></th></tr><tr><td>${ic('globe')} Explorador</td><td>152 MB</td><td>1%</td><td></td></tr><tr><td>${ic('bolt')} Proceso de GPU</td><td>96 MB</td><td>0%</td><td></td></tr>${rows()}${U.showCopilotBtn ? `<tr><td>${ic('globe')} Copilot (barra lateral)</td><td>${$('copilotPanel').classList.contains('open') ? 74 : 12} MB</td><td>0%</td><td></td></tr>` : ''}</table>`;
    dlg('Administrador de tareas', body(), [{ t: 'Cerrar', p: 1, v: true }], 620);
    const o = document.querySelector('.dlg-overlay'); o.addEventListener('click', e => { const b = e.target.closest('[data-end]'); if (b) { closeTab(+b.dataset.end); o.querySelector('.dlg-body').innerHTML = body(); } });
}

// ---------- 10. BUSCAR EN LA PÁGINA ----------
let fm = [], fi = 0;
function clearMarks() { document.querySelectorAll('mark.find-mark').forEach(m => m.replaceWith(document.createTextNode(m.textContent))); document.querySelectorAll('.view').forEach(v => v.normalize()); fm = []; }
function doFind(q) {
    clearMarks(); const root = document.querySelector('.view.active'); if (q && root) {
        const ql = q.toLowerCase(), w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
        while (w.nextNode()) { const n = w.currentNode; if (n.nodeValue.toLowerCase().includes(ql) && !n.parentElement.closest('script,style,textarea,input,select,button')) nodes.push(n); }
        nodes.forEach(n => {
            const txt = n.nodeValue, lt = txt.toLowerCase(), fr = document.createDocumentFragment(); let i = 0, j;
            while ((j = lt.indexOf(ql, i)) >= 0) { if (j > i) fr.append(txt.slice(i, j)); const m = document.createElement('mark'); m.className = 'find-mark'; m.textContent = txt.substr(j, q.length); fr.append(m); i = j + q.length; }
            fr.append(txt.slice(i)); n.replaceWith(fr);
        });
        fm = [...root.querySelectorAll('mark.find-mark')];
    }
    fi = 0; showFind();
}
function showFind() { fm.forEach(m => m.classList.remove('current')); if (fm.length) { fm[fi].classList.add('current'); fm[fi].scrollIntoView({ block: 'center' }); } $('findCount').textContent = fm.length ? `${fi + 1}/${fm.length}` : '0/0'; }
function openFind() { $('findBar').classList.add('open'); $('findInput').focus(); $('findInput').select(); if ($('findInput').value) doFind($('findInput').value); }
function closeFind() { $('findBar').classList.remove('open'); clearMarks(); }
function stepFind(d) { if (!fm.length) return; fi = (fi + d + fm.length) % fm.length; showFind(); }
$('findInput').oninput = e => doFind(e.target.value);
$('findInput').onkeydown = e => { if (e.key === 'Enter') stepFind(e.shiftKey ? -1 : 1); };
$('findNext').onclick = () => stepFind(1); $('findPrev').onclick = () => stepFind(-1); $('findClose').onclick = closeFind;

// ---------- 11. VISTA DIVIDIDA ----------
function resultsHTML(q) {
    const d = { Google: 'google.com', DuckDuckGo: 'duckduckgo.com' }[U.searchEngine] || 'bing.com';
    return `<div class="search-result"><div class="result-url">https://www.${d} › search</div><a href="#" class="result-title">${esc(q)} - Resultados oficiales</a><div class="result-desc">Resultado simulado en la vista dividida.</div></div><div class="search-result"><div class="result-url">https://www.udh.edu.pe › biblioteca</div><a href="#" class="result-title">${esc(q)} - Guía y documentación</a><div class="result-desc">Información relacionada con tu consulta.</div></div>`;
}
function toggleSplit() {
    const on = $('viewport').classList.toggle('split'); $('splitPane').style.display = on ? 'flex' : 'none';
    if (on) {
        $('splitBody').innerHTML = '<input type="text" id="splitIn" placeholder="Buscar en la web"><div id="splitRes"></div>';
        $('splitIn').onkeypress = e => { if (e.key === 'Enter' && e.target.value.trim()) { $('splitRes').innerHTML = resultsHTML(e.target.value.trim()); addHistory(e.target.value.trim() + ' - Vista dividida', '', 'search', e.target.value.trim()); } };
        $('splitIn').focus();
    }
}
$('splitClose').onclick = () => { if ($('viewport').classList.contains('split')) toggleSplit(); };

// ---------- 12. CAPTURA DE PANTALLA ----------
let sd = null, sr = null;
function startShot() { closeAll(); sr = null; $('shotOverlay').style.display = 'block'; $('shotRect').style.display = 'none'; $('shotActions').style.display = 'none'; }
function endShot() { $('shotOverlay').style.display = 'none'; sd = null; sr = null; }
function paintRect(r) { Object.assign($('shotRect').style, { display: 'block', left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }); const a = $('shotActions'); a.style.display = 'flex'; a.style.left = r.x + 'px'; a.style.top = Math.min(innerHeight - 50, r.y + r.h + 8) + 'px'; }
$('shotOverlay').addEventListener('mousedown', e => { if (e.target.closest('#shotToolbar,#shotActions')) return; sd = { x: e.clientX, y: e.clientY }; $('shotActions').style.display = 'none'; });
$('shotOverlay').addEventListener('mousemove', e => { if (!sd) return; sr = { x: Math.min(sd.x, e.clientX), y: Math.min(sd.y, e.clientY), w: Math.abs(e.clientX - sd.x), h: Math.abs(e.clientY - sd.y) }; Object.assign($('shotRect').style, { display: 'block', left: sr.x + 'px', top: sr.y + 'px', width: sr.w + 'px', height: sr.h + 'px' }); });
$('shotOverlay').addEventListener('mouseup', () => { if (sd && sr && sr.w > 8 && sr.h > 8) paintRect(sr); sd = null; });
$('shotFull').onclick = () => { const v = $('viewport').getBoundingClientRect(); sr = { x: v.left, y: v.top, w: v.width, h: v.height }; paintRect(sr); };
$('shotArea').onclick = () => toast('Arrastra el mouse para seleccionar un área', '✂️');
$('shotCancel').onclick = endShot; $('shotDiscard').onclick = endShot;
$('shotCopy').onclick = () => { endShot(); toast('Captura copiada al portapapeles', '📋'); };
$('shotSave').onclick = () => {
    const r = sr || { w: 800, h: 450 }, cv = document.createElement('canvas'); cv.width = Math.max(40, Math.round(r.w)); cv.height = Math.max(40, Math.round(r.h));
    const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, cv.width, cv.height); gr.addColorStop(0, '#0F6CBD'); gr.addColorStop(1, '#8E5AF5');
    g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#fff'; g.font = '16px Segoe UI, sans-serif'; g.fillText(`Captura de pantalla - ${page().title}`, 16, 28); g.fillText(new Date().toLocaleString('es-PE'), 16, 52);
    endShot(); cv.toBlob(b => { const n = `Captura de pantalla ${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`; addDownload(n, b.size, URL.createObjectURL(b)); });
};

// ---------- 13. HERRAMIENTAS DE DESARROLLO ----------
function devLine(t, err) { const o = $('devConsoleOut'); if (!o) return; const d = document.createElement('div'); d.className = 'dev-line' + (err ? ' err' : ''); d.textContent = t; o.appendChild(d); }
['log', 'warn', 'error'].forEach(k => { const o = console[k]; console[k] = (...a) => { o.apply(console, a); devLine(a.map(x => { try { return typeof x === 'object' ? JSON.stringify(x) : String(x); } catch (e) { return String(x); } }).join(' '), k === 'error'); }; });
window.addEventListener('error', e => devLine(e.message, true));
function refreshDev() { if ($('devtools').style.display !== 'none') { const v = document.querySelector('.view.active'); $('devElements').textContent = v ? v.outerHTML.replace(/></g, '>\n<').slice(0, 9000) : ''; } }
function devTab(n) { document.querySelectorAll('.dev-tab').forEach(b => b.classList.toggle('active', b.dataset.dev === n)); $('devElements').style.display = n === 'elements' ? '' : 'none'; $('devConsole').style.display = n === 'console' ? '' : 'none'; }
function toggleDev(force, tab) { const on = force !== undefined ? force : $('devtools').style.display === 'none'; $('devtools').style.display = on ? 'flex' : 'none'; if (on) { refreshDev(); devTab(tab || 'elements'); } }
document.querySelectorAll('.dev-tab').forEach(b => b.onclick = () => devTab(b.dataset.dev));
$('devClose').onclick = () => toggleDev(false);
$('devConsoleIn').onkeydown = e => {
    if (e.key !== 'Enter' || !e.target.value.trim()) return;
    const c = e.target.value; e.target.value = ''; devLine('> ' + c);
    try { const r = (0, eval)(c); devLine(typeof r === 'object' ? JSON.stringify(r, (k, v) => v instanceof Node ? '[Node]' : v) : String(r)); } catch (er) { devLine(String(er), true); }
};

// ---------- 14. COPILOT ----------
let cp = {};
const CP_CARDS = ['Reescribe este párrafo para que suene más persuasivo a la vez que conciso y profesional. Párrafo: ', 'Encuentra la mejor oferta para mí en [product] bajo [budget], compara precio, calidad, reseñas y compensaciones, y luego recomienda la mejor oferta.', 'Recomiéndame una película basada en [mood], [genre] y [time available], y explica por qué encaja sin estropear la historia principal.'];
function cpNew() { cp = { id: Date.now(), msgs: [], busy: false, typing: false, ctx: null, file: null }; cpRender(); }
function toggleCp(force) {
    if (!U && force) return; const on = force !== undefined ? force : !$('copilotPanel').classList.contains('open');
    $('copilotPanel').scrollLeft = 0; $('copilotPanel').classList.toggle('open', on); $('btnCopilot').classList.toggle('active', on); if (on) { closeAll(); cpRender(); setTimeout(() => { $('copilotPanel').scrollLeft = 0; $('cpInput').focus({ preventScroll: true }); $('copilotPanel').scrollLeft = 0; }, 260); }
}
$('btnCopilot').onclick = () => toggleCp(); $('cpCloseBtn').onclick = () => toggleCp(false);
function cpRender(mode) {
    const b = $('cpBody');
    if (mode === 'history') {
        b.innerHTML = `<div class="cp-chats"><h3>Chats anteriores</h3>${U.chats.length ? U.chats.map(c => `<div class="cp-chat-item" data-c="${c.id}"><span>${esc(c.title)}</span><button class="cp-icon-btn" data-cd="${c.id}" title="Eliminar">${ic('trash')}</button></div>`).join('') : '<p style="font-size:14px;color:var(--muted)">Aún no tienes chats guardados.</p>'}</div>`; return;
    }
    if (!cp.msgs.length) {
        b.innerHTML = `<div class="cp-welcome"><h1>Hola, ¿en qué te puedo ayudar?</h1><p>Estoy aquí para ayudarle cuando me necesite. Cuénteme en qué está trabajando y podremos ponernos manos a la obra.</p>${U && U.copilotSuggest ? `<div class="cp-cards">${CP_CARDS.map((t, i) => `<button class="cp-card" data-card="${i}">${esc(t)}</button>`).join('')}</div>` : ''}</div>`;
    } else {
        b.innerHTML = cp.msgs.map((m, i) => m.r === 'u' ? `<div class="cp-msg user"><div class="cp-bubble">${esc(m.t)}</div></div>`
            : `<div class="cp-msg bot"><div class="cp-name">${CPL} Copilot</div><div class="cp-bubble">${esc(m.t)}</div>${m.done ? `<div class="cp-tools"><button data-ct="copy" data-i="${i}" title="Copiar">${ic('copy')}</button><button data-ct="up" title="Buena respuesta">${ic('thumbup')}</button><button data-ct="down" title="Mala respuesta">${ic('thumbdown')}</button></div>` : ''}</div>`).join('')
            + (cp.typing ? '<div class="cp-msg bot"><div class="cp-name">' + CPL + ' Copilot</div><div class="cp-typing"><i></i><i></i><i></i></div></div>' : '');
    }
    const chips = []; if (cp.ctx) chips.push(`<span class="cp-chip">${ic('globe')} ${esc(cp.ctx)}<button data-chip="ctx">${ic('x')}</button></span>`);
    if (cp.file) chips.push(`<span class="cp-chip">${ic('paperclip')} ${esc(cp.file.name)}<button data-chip="file">${ic('x')}</button></span>`);
    $('cpChips').innerHTML = chips.join(''); b.scrollTop = b.scrollHeight;
}
$('cpBody').addEventListener('click', e => {
    const card = e.target.closest('[data-card]'), t = e.target.closest('[data-ct]'), c = e.target.closest('[data-c]'), cd = e.target.closest('[data-cd]');
    if (card) { const i = $('cpInput'); i.value = CP_CARDS[+card.dataset.card]; i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
    else if (cd) { U.chats = U.chats.filter(x => x.id != cd.dataset.cd); persist(); cpRender('history'); }
    else if (c) { const s = U.chats.find(x => x.id == c.dataset.c); if (s) { cp = { id: s.id, msgs: JSON.parse(JSON.stringify(s.msgs)), busy: false, typing: false, ctx: null, file: null }; cpRender(); } }
    else if (t) { const k = t.dataset.ct; if (k === 'copy') { navigator.clipboard && navigator.clipboard.writeText(cp.msgs[+t.dataset.i].t); toast('Copiado', '📋'); } else { t.classList.toggle('on'); toast('Gracias por tu opinión', k === 'up' ? '👍' : '👎'); } }
});
$('cpChips').addEventListener('click', e => { const b = e.target.closest('[data-chip]'); if (b) { cp[b.dataset.chip] = null; cpRender(); } });
const cpf = f => () => { document.querySelectorAll('.cp-menu').forEach(m => m.classList.remove('open')); f(); };
function cpMenu(id, items, btn) { const m = $(id), open = m.classList.contains('open'); document.querySelectorAll('.cp-menu').forEach(x => x.classList.remove('open')); if (open) return; fillMenu(m, items.map(i => i.f ? { ...i, f: null, _f: i.f } : i)); m.querySelectorAll('.menu-item').forEach((b, k) => { const it = items.filter(x => x !== 'sep')[k]; if (it) b.onclick = cpf(it.f); }); m.classList.add('open'); }
$('cpHistoryBtn').onclick = e => { e.stopPropagation(); cpRender('history'); };
$('cpMoreBtn').onclick = e => { e.stopPropagation(); cpMenu('cpMenu', [
    { i: 'plus', l: 'Nuevo chat', f: cpNew }, { i: 'trash', l: 'Borrar conversación', f: () => { U.chats = U.chats.filter(x => x.id !== cp.id); persist(); cpNew(); } },
    { i: 'gear', l: 'Configuración de Copilot', f: () => openInternal('settings', 'copilot') }, { i: 'pencil', l: 'Enviar comentarios', f: feedback },
    { i: 'x', l: 'Ocultar el botón de Copilot', f: () => setSetting('showCopilotBtn', false) }]); };
$('cpPlusBtn').onclick = e => { e.stopPropagation(); cpMenu('cpPlusMenu', [
    { i: 'paperclip', l: 'Subir imagen o archivo', f: () => $('cpFile').click() },
    { i: 'globe', l: 'Agregar la pestaña actual', f: () => { if (!U.copilotContext) return toast('Activa "Usar contenido de la página" en la configuración de Copilot', '⚠️'); cp.ctx = page().title; cpRender(); } },
    { i: 'shot', l: 'Tomar una captura de pantalla', f: startShot }, { i: 'plus', l: 'Nuevo chat', f: cpNew }]); };
$('cpFile').onchange = e => {
    const f = e.target.files[0]; if (!f) return; cp.file = { name: f.name, size: f.size, type: f.type };
    if (/^text|json|csv/.test(f.type) || /\.(txt|md|csv|json|js|html|css|py)$/i.test(f.name)) { const r = new FileReader(); r.onload = () => { cp.file.text = String(r.result).slice(0, 20000); }; r.readAsText(f); }
    cpRender(); e.target.value = '';
};
$('cpSendBtn').onclick = () => cpSend(); $('cpInput').onkeypress = e => { if (e.key === 'Enter') cpSend(); };
function saveChat() {
    if (!U || U.isGuest || priv) return; const first = cp.msgs.find(m => m.r === 'u'); if (!first) return;
    const rec = { id: cp.id, title: first.t.slice(0, 40), msgs: cp.msgs.map(m => ({ r: m.r, t: m.t, done: true })) }, i = U.chats.findIndex(c => c.id === cp.id);
    if (i >= 0) U.chats[i] = rec; else U.chats.unshift(rec); U.chats = U.chats.slice(0, 20); persist();
}
function cpSend(text) {
    const t = (text || $('cpInput').value).trim(); if (!t || cp.busy) return; $('cpInput').value = '';
    const a = cpAnswer(t); cp.msgs.push({ r: 'u', t: cp.file ? `${t}\n[Adjunto: ${cp.file.name}]` : t }); cp.file = null; cp.busy = true; cp.typing = true; cpRender();
    setTimeout(() => {
        cp.typing = false; const m = { r: 'b', t: '', done: false }; cp.msgs.push(m); let i = 0;
        const iv = setInterval(() => { i += 4; m.t = a.t.slice(0, i); if (i >= a.t.length) { clearInterval(iv); m.t = a.t; m.done = true; cp.busy = false; saveChat(); if (a.run) a.run(); } cpRender(); }, 16);
    }, 600 + Math.random() * 500);
}
function cpAnswer(q) {
    const n = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), ph = q.match(/\[[^\]]+\]/g), pick = a => a[Math.floor(Math.random() * a.length)];
    let m;
    if (cp.file) {
        const f = cp.file, w = f.text ? f.text.trim().split(/\s+/).length : 0;
        return { t: f.text ? `Revisé "${f.name}" (${fmt(f.size)}). Tiene unas ${w} palabras. Empieza así:\n\n${f.text.trim().slice(0, 220)}…\n\n¿Quieres que lo resuma o lo reescriba?` : `Recibí "${f.name}" (${fmt(f.size)}). En este prototipo no analizo el contenido de este tipo de archivo, pero puedo ayudarte con lo que necesites sobre él.` };
    }
    if (ph) return { t: `Antes de continuar, completa estos datos: ${ph.join(', ')}. Cuando los tengas, vuelve a enviarme el mensaje y te preparo la respuesta.` };
    if ((m = n.match(/^(busca|buscar|googlea|investiga)\s+(.+)/))) return { t: `Buscando "${m[2]}" en ${U.searchEngine}…`, run: () => executeWebSearch(m[2]) };
    if (/(abre|abrir|ve a|ir a|muestrame|llevame).*(historial)/.test(n)) return { t: 'Listo, abrí tu historial.', run: () => openInternal('history') };
    if (/(abre|abrir|ve a|ir a|muestrame|llevame).*(descargas)/.test(n)) return { t: 'Abrí tus descargas.', run: () => openInternal('downloads') };
    if (/(abre|abrir|ve a|ir a|muestrame|llevame).*(favoritos)/.test(n)) return { t: 'Abrí tus favoritos.', run: () => openInternal('favorites') };
    if (/(abre|abrir|ve a|ir a|muestrame|llevame).*(extension)/.test(n)) return { t: 'Abrí la página de extensiones.', run: () => openInternal('extensions') };
    if (/(abre|abrir|ve a|ir a|muestrame|llevame).*(contrasena)/.test(n)) return { t: 'Abrí tus contraseñas guardadas.', run: () => openInternal('passwords') };
    if (/(abre|abrir|ve a|ir a|muestrame|llevame).*(privacidad)/.test(n)) return { t: 'Te llevo a Privacidad y seguridad.', run: () => openInternal('settings', 'privacy') };
    if (/(abre|abrir|ve a|ir a|muestrame|llevame).*(rendimiento|memoria)/.test(n)) return { t: 'Abrí Rendimiento y memoria.', run: () => openInternal('settings', 'performance') };
    if (/(abre|abrir|ve a|ir a|muestrame|llevame).*(configuracion|ajustes)/.test(n)) return { t: 'Abrí la configuración de Edge.', run: () => openInternal('settings', 'profile') };
    if (/modo oscuro|tema oscuro/.test(n)) return { t: 'Activé el modo oscuro.', run: () => setSetting('theme', 'dark') };
    if (/modo claro|tema claro/.test(n)) return { t: 'Activé el modo claro.', run: () => setSetting('theme', 'light') };
    if (/nueva pestana/.test(n)) return { t: 'Abrí una pestaña nueva.', run: addTab };
    if (/(resume|resumen|de que trata|que dice).*(pagina|pestana|sitio)|resumen de esta/.test(n)) {
        if (!U.copilotContext) return { t: 'No tengo permiso para leer la página. Actívalo en Configuración > Copilot y barra lateral.' };
        const p = page(); return { t: p.view === 'view-home' ? 'Estás en una pestaña nueva: tiene la barra de búsqueda, tus accesos directos y, si la activaste, el feed de noticias.' : p.view === 'view-search' ? `Estás viendo resultados de ${U.searchEngine} para "${p.search}". Hay dos resultados simulados: la guía principal y recursos de la biblioteca de la UDH.` : `Estás en "${p.title}", una página interna de Edge (${p.url}).` };
    }
    if (/^(hola|buenas|hey|buenos dias|buenas tardes|buenas noches)/.test(n)) return { t: `¡Hola${U.isGuest ? '' : ', ' + U.name}! ¿En qué te puedo ayudar hoy?` };
    if (/quien eres|como te llamas|que eres/.test(n)) return { t: 'Soy Copilot, tu asistente dentro de Edge (versión de prototipo). Puedo abrir secciones del navegador, buscar en la web, hacer cálculos, resumir la página o ayudarte a redactar.' };
    if (/que puedes hacer|ayuda|que haces/.test(n)) return { t: 'Puedo:\n• Buscar en la web ("busca …")\n• Abrir historial, descargas, favoritos, extensiones o configuración\n• Cambiar a modo oscuro o claro\n• Resumir la página actual\n• Calcular operaciones\n• Reescribir párrafos y recomendar películas\n• Leer archivos de texto que adjuntes' };
    if (/hora|fecha|que dia/.test(n)) { const d = new Date(); return { t: `Son las ${hhmm()} del ${d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.` }; }
    if (/calcul|cuanto es|\d\s*[+\-*/x×^]\s*\d/.test(n)) {
        const ex = q.replace(/[^0-9+\-*/().,%x×^ ]/g, '').replace(/[x×]/g, '*').replace(/\^/g, '**').replace(/,/g, '.').trim();
        try { if (/\d/.test(ex) && /[+\-*/%]/.test(ex)) { const r = Function('"use strict";return (' + ex + ')')(); if (isFinite(r)) return { t: `${ex} = ${+r.toFixed(8)}` }; } } catch (e) {}
        return { t: 'No pude resolver esa operación. Prueba con algo como "calcula 15 * 4 + 3".' };
    }
    if (/chiste|hazme reir/.test(n)) return { t: pick(['¿Por qué los programadores confunden Halloween con Navidad? Porque OCT 31 = DEC 25.', 'Un SQL entra a un bar, se acerca a dos mesas y pregunta: "¿Puedo unirme?"', 'Hay 10 tipos de personas: las que entienden binario y las que no.']) };
    if (/reescribe|parafrasea|mejora este/.test(n)) {
        const txt = q.split(/p[aá]rrafo:/i)[1] || ''; if (!txt.trim()) return { t: 'Pega el párrafo después de "Párrafo:" y lo reescribo de forma más persuasiva, concisa y profesional.' };
        const s = txt.replace(/\b(muy|realmente|basicamente|básicamente|como que|la verdad|en realidad)\s+/gi, '').replace(/\s+/g, ' ').trim();
        return { t: `Versión más persuasiva y concisa:\n\n${s.charAt(0).toUpperCase() + s.slice(1)}${/[.!?]$/.test(s) ? '' : '.'}\n\nSugerencia: abre con el beneficio principal y cierra con una acción clara.` };
    }
    if (/pelicula|film/.test(n)) {
        const g = { comedia: ['Una pareja de idiotas… ¿o genios?: "Superbad"', '"Mi gran boda griega"'], terror: ['"Un lugar en silencio"', '"Hereditary"'], accion: ['"Mad Max: Furia en la carretera"', '"John Wick"'], 'ciencia ficcion': ['"Interestelar"', '"Arrival"'], drama: ['"El pianista"', '"En busca de la felicidad"'], animacion: ['"Spider-Man: Un nuevo universo"', '"Coco"'], romance: ['"Antes del amanecer"', '"La La Land"'] };
        const k = Object.keys(g).find(x => n.includes(x)) || 'drama'; return { t: `Te recomiendo ${pick(g[k])}. Encaja con el género ${k} y se disfruta sin spoilers de la trama principal. ¿Quieres otra opción?` };
    }
    if (/codigo|funcion|script/.test(n)) return { t: 'Ejemplo en JavaScript:\n\nfunction saludar(nombre) {\n  return `Hola, ${nombre}!`;\n}\nconsole.log(saludar("Edge"));\n\nDime el lenguaje y lo que necesitas y lo adapto.' };
    if (/(borro|borrar|elimino|eliminar).*historial/.test(n)) return { t: 'Menú ⋯ > Historial > ícono de papelera, o Configuración > Privacidad > Borrar datos de exploración. Si prefieres, dime "abre historial".' };
    if (/gracias/.test(n)) return { t: '¡De nada! Aquí sigo por si necesitas algo más.' };
    return { t: `Entendido. Sobre "${q}": puedo buscarlo en la web si me escribes "busca ${q}". También puedo ayudarte con cálculos, resúmenes de la página, redacción o abrir secciones de Edge.` };
}

// ---------- 15. PÁGINAS INTERNAS (edge://) ----------
const row = (t, d, ctl = '') => `<div class="setting-row"><div class="setting-info"><h4>${t}</h4><p>${d}</p></div><div>${ctl}</div></div>`;
const tog = (k, t, d) => row(t, d, `<label class="switch"><input type="checkbox" data-set="${k}" ${U[k] ? 'checked' : ''}><span class="slider"></span></label>`);
const sel = (k, t, d, o) => row(t, d, `<select class="edge-select" data-set="${k}">${o.map(x => `<option value="${x[0]}" ${U[k] === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select>`);
const btn = (a, t, cls = 'secondary-btn sm', arg = '') => `<button class="${cls}" data-act="${a}" data-arg="${esc(arg)}">${t}</button>`;
const card = h => `<div class="settings-card">${h}</div>`;

function section(s) {
    if (s === 'profile') return '<h3>Tu perfil</h3>' + card(row('Nombre del perfil', esc(U.name), btn('rename', 'Editar')) + row('Correo', esc(U.email)) + row('Protección con PIN', U.pin ? 'Perfil protegido con PIN de 4 dígitos' : 'Perfil sin PIN', btn('pin', U.pin ? 'Cambiar o quitar' : 'Agregar PIN')) + tog('sync', 'Sincronización', 'Sincroniza favoritos, historial y contraseñas entre tus dispositivos.') + row('Contraseñas y autorrellenar', 'Administra tus contraseñas guardadas.', btn('goto', 'Abrir', 'secondary-btn sm', 'passwords')) + row('Bloquear perfil', 'Vuelve al selector de perfiles.', btn('lock', 'Bloquear', 'danger-btn')));
    if (s === 'privacy') return '<h3>Privacidad y seguridad</h3>' + card(row('Prevención de seguimiento', 'Bloquea rastreadores de sitios web para proteger tu privacidad.', `<div class="toggle-wrapper"><span id="trkBadge" class="status-badge ${U.trackingPrevention ? 'on' : 'off'}">${U.trackingPrevention ? 'Activado' : 'Desactivado'}</span><label class="switch"><input type="checkbox" data-set="trackingPrevention" ${U.trackingPrevention ? 'checked' : ''}><span class="slider"></span></label></div>`) + tog('thirdCookies', 'Bloquear cookies de terceros', 'Impide que otros sitios te sigan mediante cookies.') + tog('dnt', 'Enviar solicitudes "No realizar seguimiento"', 'Pide a los sitios que no rastreen tu actividad.') + row('Borrar datos de exploración', `Borra el historial, descargas y caché de ${esc(U.name)}.`, btn('clear', 'Elegir qué borrar', 'danger-btn')));
    if (s === 'appearance') return '<h3>Apariencia</h3>' + card(sel('theme', 'Tema', 'Elige entre el modo claro y el oscuro.', [['dark', 'Oscuro'], ['light', 'Claro']]) + tog('showHome', 'Mostrar el botón de página principal', 'Agrega el botón de inicio a la barra de herramientas.') + tog('showFav', 'Mostrar el botón de favoritos', 'Muestra el acceso rápido a tus favoritos.') + tog('showExt', 'Mostrar el botón de extensiones', 'Muestra el botón de extensiones en la barra de herramientas.') + tog('translate', 'Ofrecer traducir páginas', 'Pregunta si quieres traducir páginas en otros idiomas.'));
    if (s === 'newtab') return '<h3>Página de inicio y nuevas pestañas</h3>' + card(sel('experience', 'Experiencia de la página', 'Enfocada: sin noticias. Informativa: con noticias y sugerencias.', [['focused', 'Enfocada'], ['informative', 'Informativa']]) + tog('showLinks', 'Mostrar accesos directos', 'Hasta 4 sitios en tu nueva pestaña.') + tog('showBg', 'Imagen del día', 'Muestra la imagen de fondo.')) + '<h3>Accesos directos</h3>' + card(U.quickLinks.map((l, i) => row(`${esc(l.icon)} ${esc(l.name)}`, esc(l.url), btn('qdel', 'Quitar', 'secondary-btn sm', i))).join('') + row('Agregar acceso directo', `${U.quickLinks.length}/4 en uso`, btn('qadd', 'Agregar', 'primary-btn sm')));
    if (s === 'search') return '<h3>Búsqueda</h3>' + card(sel('searchEngine', 'Buscador predeterminado', 'Edge respetará tu elección sin mostrar mensajes insistentes.', [['Bing', 'Microsoft Bing'], ['Google', 'Google'], ['DuckDuckGo', 'DuckDuckGo']]));
    if (s === 'performance') {
        const dm = navigator.deviceMemory, ram = dm ? (dm >= 8 ? '8 GB o más' : `${dm} GB`) : 'No disponible en este navegador', cores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} núcleos lógicos` : 'No disponible', sleeping = U.memorySaver ? Math.max(0, tabs.length - 1) : 0, m = pfNow();
        return '<h3>Rendimiento y memoria</h3>' + card(`<div style="padding:14px 0;font-size:13px;line-height:1.9">Memoria RAM del dispositivo: <strong>${ram}</strong><br>Procesador: <strong>${cores}</strong><br>Velocidad de CPU (prueba rápida): <strong>${pfBench()} puntos</strong><br>Memoria usada por el prototipo: <strong id="pfHeap">${m.heap}</strong><br>Fluidez: <strong id="pfFps">${m.fps}</strong><br>Batería: <strong id="pfBat">${m.bat}</strong><br>Conexión: <strong id="pfNet">${m.net}</strong><br>Plataforma: <strong>${esc(navigator.userAgentData?.platform || navigator.platform || 'Desconocida')}</strong><br>Pestañas abiertas: <strong>${tabs.length}</strong> · Suspendidas: <strong>${sleeping}</strong><br><span style="opacity:.7;font-size:12px">Datos reales leídos de tu dispositivo. Por privacidad, los navegadores redondean la RAM (máx. 8 GB).</span></div>` + tog('efficiencyMode', 'Modo de eficiencia', 'Minimiza el uso de energía reduciendo recursos de pestañas inactivas.') + tog('memorySaver', 'Ahorro de memoria', `Libera RAM (${ram}) al suspender pestañas en segundo plano.`));
    }
    if (s === 'downloads') return '<h3>Descargas</h3>' + card(row('Ubicación', 'C:\\Users\\' + esc(U.name) + '\\Descargas') + tog('askDownload', 'Preguntar dónde guardar cada archivo', 'Edge te pedirá una carpeta antes de descargar.') + row('Historial de descargas', `${U.downloads.length} archivo(s)`, btn('goto', 'Ver descargas', 'secondary-btn sm', 'downloads')));
    if (s === 'copilot') return '<h3>Copilot y barra lateral</h3>' + card(tog('showCopilotBtn', 'Mostrar el botón de Copilot', 'Muestra el botón "Chat" en la barra de herramientas.') + tog('copilotContext', 'Usar el contenido de la página', 'Permite a Copilot leer la pestaña actual para resumirla.') + tog('copilotSuggest', 'Mostrar sugerencias de mensajes', 'Muestra ideas al abrir un chat nuevo.') + row('Chats guardados', `${U.chats.length} conversación(es)`, btn('cpclear', 'Borrar chats', 'danger-btn')));
    return aboutHTML();
}
function aboutHTML() {
    return `<div style="text-align:center;padding:10px 0 20px"><img src="https://upload.wikimedia.org/wikipedia/commons/9/98/Microsoft_Edge_logo_%282019%29.svg" width="64" alt="Edge"><h3 style="margin-top:10px">Microsoft Edge</h3><p style="color:var(--muted);font-size:13px" id="updText">Microsoft Edge está actualizado.</p></div>` + card(row('Versión', 'Prototipo académico UX v4.0 · Compilación oficial (64 bits)') + row('Motor', esc(navigator.userAgent.split(' ').slice(-2).join(' '))) + row('Actualizaciones', 'Busca actualizaciones del prototipo.', btn('update', 'Buscar actualizaciones', 'primary-btn sm')));
}
function histTable(f) {
    f = (f || '').toLowerCase(); const r = U.history.map((h, i) => ({ h, i })).filter(x => !f || (x.h.title + (x.h.url || '')).toLowerCase().includes(f));
    if (U.isGuest || priv) return '<tr><td colspan="4">El historial no se guarda en esta sesión.</td></tr>';
    return r.length ? r.map(x => `<tr><td>${esc(x.h.time)}</td><td>${ic(hIcon(x.h))} ${esc(x.h.title)}</td><td style="color:var(--muted)">${esc((x.h.url || '').slice(0, 50))}</td><td><button class="btn-link" data-act="hopen" data-arg="${x.i}">Abrir</button><button class="btn-link" data-act="hdel" data-arg="${x.i}">Eliminar</button></td></tr>`).join('') : '<tr><td colspan="4">No hay historial para mostrar.</td></tr>';
}
function buildInternal(p) {
    const c = $('internalSettingsContainer'); c.className = 'internal-box wide'; $('internalTitle').textContent = p.title; $('internalIcon').innerHTML = ic(p.ico || 'gear');
    const n = p.name || 'settings'; let h = '';
    if (n === 'settings') {
        const sec = p.section || 'profile', labels = { profile: ['Tu perfil', ic('personcog')], privacy: ['Privacidad y seguridad', ic('shield')], appearance: ['Apariencia', ic('sun')], newtab: ['Página de inicio y nuevas pestañas', ic('newtab')], search: ['Búsqueda', ic('search')], performance: ['Rendimiento y memoria', ic('bolt')], downloads: ['Descargas', ic('download')], copilot: ['Copilot y barra lateral', CPL], about: ['Acerca de Microsoft Edge', ic('info')] };
        h = `<div class="settings-layout"><div class="settings-nav">${SECS.map(s => `<button class="${s === sec ? 'active' : ''}" data-act="sec" data-arg="${s}">${labels[s][1]}<span>${labels[s][0]}</span></button>`).join('')}</div><div class="settings-main"><input class="settings-search" data-q="settings" placeholder="Buscar en la configuración">${section(sec)}</div></div>`;
    } else if (n === 'history') h = `<div class="page-actions"><input data-q="hist" placeholder="Buscar en el historial">${btn('clear', 'Borrar datos de exploración', 'danger-btn')}</div><table class="page-table"><tr><th>Hora</th><th>Título</th><th>Dirección</th><th></th></tr><tbody id="histBody">${histTable()}</tbody></table>`;
    else if (n === 'downloads') h = `<div class="page-actions">${btn('dlclear', 'Borrar todas las descargas', 'danger-btn')}</div><table class="page-table"><tr><th>Archivo</th><th>Tamaño</th><th>Fecha</th><th></th></tr>${U.downloads.length ? U.downloads.map((d, i) => `<tr><td>${ic('file')} ${esc(d.name)}</td><td>${fmt(d.size)}</td><td>${new Date(d.ts).toLocaleString('es-PE')}</td><td>${d.p != null ? Math.round(d.p) + '%' : `<button class="btn-link" data-act="dopen" data-arg="${i}">Abrir</button>`}<button class="btn-link" data-act="ddel" data-arg="${i}">Eliminar</button></td></tr>`).join('') : '<tr><td colspan="4">No hay descargas todavía. Descarga algo desde un resultado de búsqueda.</td></tr>'}</table>`;
    else if (n === 'favorites') h = `<div class="page-actions">${btn('fadd', 'Agregar página actual', 'primary-btn sm')}</div><table class="page-table"><tr><th>Nombre</th><th>Dirección</th><th></th></tr>${U.favs.length ? U.favs.map((f, i) => `<tr><td><span class="fav-ico" style="background:${f.c || '#0F6CBD'}">${esc(f.n.charAt(0).toUpperCase())}</span> ${esc(f.n)}</td><td style="color:var(--muted)">${esc(f.u)}</td><td><button class="btn-link" data-act="fopen" data-arg="${i}">Abrir</button><button class="btn-link" data-act="fedit" data-arg="${i}">Editar</button><button class="btn-link" data-act="fdel" data-arg="${i}">Eliminar</button></td></tr>`).join('') : '<tr><td colspan="3">No tienes favoritos.</td></tr>'}</table>`;
    else if (n === 'extensions') h = card(EXT.map(e => row(`${ic(e.i)} ${e.n}`, e.d, U.ext[e.id] ? `<div class="toggle-wrapper"><label class="switch"><input type="checkbox" data-ext="${e.id}" ${U.ext[e.id].on ? 'checked' : ''}><span class="slider"></span></label>${btn('extrm', 'Quitar', 'secondary-btn sm', e.id)}</div>` : btn('extget', 'Obtener', 'primary-btn sm', e.id))).join(''));
    else if (n === 'passwords') h = card(tog('savePasswords', 'Ofrecer guardar contraseñas', 'Edge te preguntará si quieres guardar las credenciales.') + tog('autofill', 'Inicio de sesión automático', 'Rellena tus credenciales guardadas en los sitios.')) + `<div class="page-actions">${btn('pwadd', 'Agregar contraseña', 'primary-btn sm')}</div><table class="page-table"><tr><th>Sitio</th><th>Usuario</th><th>Contraseña</th><th></th></tr>${U.passwords.length ? U.passwords.map((p2, i) => `<tr><td>${esc(p2.site)}</td><td>${esc(p2.user)}</td><td>${pwShown.has(i) ? esc(p2.pw) : '••••••••'}</td><td><button class="btn-link" data-act="pwshow" data-arg="${i}">${pwShown.has(i) ? 'Ocultar' : 'Mostrar'}</button><button class="btn-link" data-act="pwdel" data-arg="${i}">Eliminar</button></td></tr>`).join('') : '<tr><td colspan="4">No hay contraseñas guardadas.</td></tr>'}</table>`;
    else if (n === 'about') h = aboutHTML();
    else if (n === 'help') h = `<div class="faq"><details open><summary>¿Cómo cambio de perfil o bloqueo el mío?</summary><p>Haz clic en tu foto de perfil y elige "Bloquear / Cambiar perfil".</p></details><details><summary>¿Cómo uso Copilot?</summary><p>Presiona el botón "Chat" de la barra de herramientas. Puedes pedirle que busque, abra secciones o resuma la página.</p></details><details><summary>¿Cómo navego sin dejar rastro?</summary><p>Usa "Nueva ventana InPrivate" o "Explorar como invitado".</p></details><details><summary>¿Cómo cambio el buscador?</summary><p>Configuración > Búsqueda.</p></details></div><h3 style="margin:18px 0 10px">Métodos abreviados</h3><table class="page-table">${[['Buscar en la página', 'Ctrl+F'], ['Historial', 'Ctrl+H'], ['Descargas', 'Ctrl+J'], ['Favoritos', 'Ctrl+Mayús+O'], ['Agregar a favoritos', 'Ctrl+D'], ['Captura de pantalla', 'Ctrl+Mayús+S'], ['Herramientas de desarrollo', 'F12'], ['Atrás / Adelante', 'Alt+← / Alt+→']].map(k => `<tr><td>${k[0]}</td><td><span class="kbd">${k[1]}</span></td></tr>`).join('')}</table>`;
    c.innerHTML = h;
}

// ---------- 16. EVENTOS DELEGADOS ----------
const ACT = {
    sec: a => { page().section = a; page().url = 'edge://settings/' + a; $('urlInput').value = page().url; buildInternal(page()); },
    goto: a => { closeAll(); openInternal(a); }, lock: () => logout(), clear: clearDataDlg, pin: changePin,
    rename: async () => { if (U.isGuest) return; const r = await dlg('Nombre del perfil', `<input type="text" data-k="n" value="${esc(U.name)}">`, [{ t: 'Cancelar' }, { t: 'Guardar', p: 1 }], 380); if (r && r.n.trim()) { U.name = r.n.trim(); persist(); updateProfilePanel(); commit(); } },
    qadd: addQuick, qdel: a => { U.quickLinks.splice(+a, 1); renderQuick(); commit(); },
    hopen: a => { const h = U.history[+a]; if (!h) return; closeAll(); if (h.ic === 'globe') openUrl(h.url, h.title); else executeWebSearch(h.q || h.title.replace(/ - (Buscar en|Vista dividida).*/i, '')); },
    hdel: a => { U.history.splice(+a, 1); commit(); }, ddel: a => { U.downloads.splice(+a, 1); commit(); }, dlclear: () => { U.downloads = []; commit(); },
    dopen: a => { const d = U.downloads[+a]; const u = d && dlUrls.get(d); if (u) window.open(u, '_blank'); else toast('El archivo se guardó en tu carpeta Descargas', '📁'); },
    fopen: a => { const f = U.favs[+a]; if (!f) return; closeAll(); if (/^edge:/.test(f.u)) handleOmni(f.u); else openUrl(f.u, f.n); },
    fdel: a => { U.favs.splice(+a, 1); commit(); },
    fedit: async a => { const f = U.favs[+a], r = await dlg('Editar favorito', `<label>Nombre</label><input type="text" data-k="n" value="${esc(f.n)}"><label>URL</label><input type="text" data-k="u" value="${esc(f.u)}">`, [{ t: 'Cancelar' }, { t: 'Guardar', p: 1 }]); if (r) { f.n = r.n.trim() || f.n; f.u = r.u.trim() || f.u; commit(); } },
    fadd: () => { if (!U.favs.some(f => f.u === favKey())) toggleFav(); else toast('Esta página ya está en favoritos', '⭐'); },
    extget: a => { U.ext[a] = { on: true }; commit(); toast('Extensión agregada', '🧩'); }, extrm: a => { delete U.ext[a]; commit(); toast('Extensión quitada', '🧩'); },
    pwadd: async () => { const r = await dlg('Agregar contraseña', '<label>Sitio web</label><input type="text" data-k="site" placeholder="ejemplo.com"><label>Usuario</label><input type="text" data-k="user"><label>Contraseña</label><input type="password" data-k="pw">', [{ t: 'Cancelar' }, { t: 'Guardar', p: 1 }]); if (r && r.site.trim()) { U.passwords.push({ site: r.site.trim(), user: r.user.trim(), pw: r.pw }); commit(); toast('Contraseña guardada', '🔑'); } },
    pwdel: a => { U.passwords.splice(+a, 1); pwShown.clear(); commit(); }, pwshow: a => { pwShown.has(+a) ? pwShown.delete(+a) : pwShown.add(+a); buildInternal(page()); },
    cpclear: () => { U.chats = []; persist(); cpNew(); buildInternal(page()); toast('Chats de Copilot borrados', '🗑️'); },
    update: () => { toast('Buscando actualizaciones…', '🔄'); setTimeout(() => { if ($('updText')) $('updText').textContent = 'Microsoft Edge está actualizado.'; toast('Edge está actualizado', '✅'); }, 1200); }
};
document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && U && ACT[b.dataset.act]) { e.stopPropagation(); ACT[b.dataset.act](b.dataset.arg, b, e); } });
document.addEventListener('change', e => {
    const t = e.target; if (!U) return;
    if (t.dataset.set) setSetting(t.dataset.set, t.type === 'checkbox' ? t.checked : t.value);
    else if (t.dataset.ext && U.ext[t.dataset.ext]) { U.ext[t.dataset.ext].on = t.checked; commit(); toast(t.checked ? 'Extensión activada' : 'Extensión desactivada', '🧩'); }
});
document.addEventListener('input', e => {
    const t = e.target; if (!t.dataset || !t.dataset.q) return;
    if (t.dataset.q === 'hist') $('histBody').innerHTML = histTable(t.value);
    else document.querySelectorAll('.settings-main .setting-row').forEach(r => { r.style.display = r.textContent.toLowerCase().includes(t.value.toLowerCase()) ? '' : 'none'; });
});

// ---------- 17. ATAJOS DE TECLADO ----------
document.addEventListener('keydown', e => {
    if (!U) return; const c = e.ctrlKey || e.metaKey;
    if (e.key === 'Escape') { closeAll(); closeFind(); if ($('shotOverlay').style.display !== 'none') endShot(); }
    else if (e.key === 'F12') { e.preventDefault(); toggleDev(); }
    else if (e.key === 'F5') { e.preventDefault(); load(render); }
    else if (e.key === 'F1') { e.preventDefault(); openInternal('help'); }
    else if (e.altKey && e.key === 'ArrowLeft') $('btnBack').click();
    else if (e.altKey && e.key === 'ArrowRight') $('btnForward').click();
    else if (e.shiftKey && e.key === 'Escape') taskManager();
    else if (c && e.key.toLowerCase() === 'f') { e.preventDefault(); openFind(); }
    else if (c && e.key.toLowerCase() === 'h') { e.preventDefault(); openPanel('historyPanel'); }
    else if (c && e.key.toLowerCase() === 'j') { e.preventDefault(); openPanel('downloadsPanel'); }
    else if (c && e.key.toLowerCase() === 'd') { e.preventDefault(); toggleFav(); }
    else if (c && e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); openPanel('favoritesPanel'); }
    else if (c && e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); startShot(); }
    else if (c && e.shiftKey && e.key.toLowerCase() === 'n') { e.preventDefault(); togglePriv(); }
    else if (c && e.key.toLowerCase() === 't') { e.preventDefault(); addTab(); }
    else if (c && (e.key === '+' || e.key === '=')) { e.preventDefault(); setZoom(Z[Math.min(Z.length - 1, Z.indexOf(zoom) + 1)] || 110); }
    else if (c && e.key === '-') { e.preventDefault(); setZoom(Z[Math.max(0, Z.indexOf(zoom) - 1)] || 90); }
    else if (c && e.key === '0') { e.preventDefault(); setZoom(100); }
});

// ---------- 18. INICIO ----------
document.body.classList.add('dark-mode');
renderProfileSelector();

// ---------- MÉTRICAS REALES DEL DISPOSITIVO ----------
const PF = { fps: null, bat: null, score: null };
function pfBench() {
    if (PF.score === null) { const t = performance.now(); let x = 0, n = 0; while (performance.now() - t < 40) { for (let i = 0; i < 20000; i++) x += Math.sqrt(i) * Math.sin(i); n++; } PF.score = Math.round(n * 20000 / 1000); }
    return PF.score;
}
function pfNow() {
    const pm = performance.memory, c = navigator.connection, b = PF.bat;
    return {
        heap: pm ? `${(pm.usedJSHeapSize / 1048576).toFixed(0)} MB de ${(pm.jsHeapSizeLimit / 1048576).toFixed(0)} MB` : 'No disponible (solo Chrome/Edge)',
        fps: PF.fps ? `${PF.fps} FPS` : 'midiendo…',
        bat: b ? `${Math.round(b.level * 100)} %${b.charging ? ' (cargando)' : ''}` : 'No disponible en este navegador',
        net: c ? `${c.effectiveType || '?'}${c.downlink ? ' · ' + c.downlink + ' Mbps' : ''}` : 'No disponible en este navegador'
    };
}
(function pfLive() {
    let frames = 0, last = performance.now();
    if (navigator.getBattery) navigator.getBattery().then(b => { PF.bat = b; }).catch(() => { });
    (function loop(t) {
        frames++;
        if (t - last >= 1000) {
            PF.fps = Math.round(frames * 1000 / (t - last)); frames = 0; last = t;
            const m = pfNow();
            [['pfHeap', m.heap], ['pfFps', m.fps], ['pfBat', m.bat], ['pfNet', m.net]].forEach(([id, v]) => { const e = document.getElementById(id); if (e) e.textContent = v; });
        }
        requestAnimationFrame(loop);
    })(last);
})();

// Start page of the desktop app: chooses the Jinsei instance and opens it.
const OFFICIAL = 'https://jinsei.kenai.site';
const STORAGE_KEY = 'jinsei-server';

const texts = {
  pt: {
    connecting: 'Conectando ao seu Jinsei…',
    offlineTitle: 'Não foi possível conectar',
    offlineText: 'Confira sua internet ou se o servidor está no ar e tente de novo.',
    retry: 'Tentar de novo',
    change: 'Trocar servidor',
    intro: 'O app abre o Jinsei que você usa na web. Seus dados continuam no servidor.',
    serverLabel: 'Endereço do servidor',
    serverHint: 'Use o endereço da sua instância, se ela for própria.',
    connect: 'Conectar',
    official: 'Usar o servidor oficial',
    invalid: 'Informe um endereço válido, como https://jinsei.kenai.site.',
    unreachable: 'Não encontramos um Jinsei nesse endereço.',
    footer: 'Jinsei · gratuito e open source',
  },
  en: {
    connecting: 'Connecting to your Jinsei…',
    offlineTitle: "Couldn't connect",
    offlineText: 'Check your internet connection or whether the server is up, then try again.',
    retry: 'Try again',
    change: 'Change server',
    intro: 'The app opens the Jinsei you use on the web. Your data stays on the server.',
    serverLabel: 'Server address',
    serverHint: 'Use your own instance address if you run one.',
    connect: 'Connect',
    official: 'Use the official server',
    invalid: 'Enter a valid address, such as https://jinsei.kenai.site.',
    unreachable: "We couldn't find a Jinsei at that address.",
    footer: 'Jinsei · free and open source',
  },
  es: {
    connecting: 'Conectando con tu Jinsei…',
    offlineTitle: 'No se pudo conectar',
    offlineText:
      'Comprueba tu conexión a internet o si el servidor está en línea e inténtalo de nuevo.',
    retry: 'Intentar de nuevo',
    change: 'Cambiar servidor',
    intro: 'La app abre el Jinsei que usas en la web. Tus datos siguen en el servidor.',
    serverLabel: 'Dirección del servidor',
    serverHint: 'Usa la dirección de tu instancia si tienes una propia.',
    connect: 'Conectar',
    official: 'Usar el servidor oficial',
    invalid: 'Indica una dirección válida, como https://jinsei.kenai.site.',
    unreachable: 'No encontramos un Jinsei en esa dirección.',
    footer: 'Jinsei · gratuito y de código abierto',
  },
};
const language = navigator.language.toLowerCase().startsWith('es')
  ? 'es'
  : navigator.language.toLowerCase().startsWith('en')
    ? 'en'
    : 'pt';
const text = texts[language];
document.documentElement.lang = language === 'pt' ? 'pt-BR' : language;
for (const element of document.querySelectorAll('[data-text]')) {
  element.textContent = text[element.dataset.text];
}

const sections = ['connecting', 'offline', 'setup'].map((id) => document.getElementById(id));
const show = (id) => sections.forEach((section) => (section.hidden = section.id !== id));
const input = document.getElementById('server');
const error = document.getElementById('error');
const submit = document.querySelector('#setup button[type="submit"]');

/** Keeps only the origin, adding https:// when the scheme is missing. */
function normalize(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.hostname.includes('.') || url.hostname === 'localhost' ? url.origin : null;
  } catch {
    return null;
  }
}

/** True when a Jinsei instance answers at this address (checked by the app, not the page). */
async function reachable(origin) {
  try {
    return await window.__TAURI__.core.invoke('check_server', { url: origin });
  } catch {
    return false;
  }
}

async function open(origin) {
  await window.__TAURI__.core.invoke('connect', { url: `${origin}/home?client=desktop` });
}

async function start(origin) {
  show('connecting');
  document.getElementById('connecting-server').textContent = origin;
  if (await reachable(origin)) {
    await open(origin);
    return;
  }
  document.getElementById('offline-server').textContent = origin;
  show('offline');
}

function setup(message = '') {
  input.value = localStorage.getItem(STORAGE_KEY) ?? OFFICIAL;
  error.textContent = message;
  show('setup');
  input.focus();
  input.select();
}

document.getElementById('setup').addEventListener('submit', async (event) => {
  event.preventDefault();
  const origin = normalize(input.value);
  if (!origin) {
    error.textContent = text.invalid;
    return;
  }
  error.textContent = '';
  submit.disabled = true;
  const ok = await reachable(origin);
  submit.disabled = false;
  if (!ok) {
    error.textContent = text.unreachable;
    return;
  }
  localStorage.setItem(STORAGE_KEY, origin);
  show('connecting');
  document.getElementById('connecting-server').textContent = origin;
  await open(origin);
});
document.getElementById('official').addEventListener('click', () => {
  input.value = OFFICIAL;
  input.focus();
});
document
  .getElementById('retry')
  .addEventListener('click', () => start(localStorage.getItem(STORAGE_KEY) ?? OFFICIAL));
document.getElementById('change').addEventListener('click', () => setup());

const saved = localStorage.getItem(STORAGE_KEY);
if (saved && !new URLSearchParams(location.search).has('change')) start(saved);
else setup();

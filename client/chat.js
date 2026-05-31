const socket = io();

// SessionStorage se data lo — index.html ne save kiya tha
const username = sessionStorage.getItem('username');
const roomId = sessionStorage.getItem('roomId');

// Agar koi seedha chat.html pe aa gaya bina room join kiye
if (!username || !roomId) {
  window.location.href = '/';
}
// Naya socket hai — server ko batao ki hum is room mein hain
socket.emit('rejoin-room', { roomId, username });
// Header update karo
document.getElementById('roomName').textContent = 'Room: ' + roomId;
document.getElementById('myName').textContent = 'Tu: ' + username;

const messagesEl = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

// --- Message dikhane ka function ---
function showMessage(type, text, meta = '') {
  const div = document.createElement('div');
  div.classList.add('message', type);

  if (type === 'system') {
    // System message — jaise "Nitin join hua"
    div.textContent = text;
  } else {
    // Normal message — naam + time upar, message neeche
    div.innerHTML = `
      <div class="meta">${meta}</div>
      <div>${text}</div>
    `;
  }

  messagesEl.appendChild(div);

  // Automatically neeche scroll karo
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// --- Message bhejne ka function ---
function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  socket.emit('send-message', message);
  messageInput.value = ''; // Input clear karo
  messageInput.focus();
}

// Send button click
sendBtn.addEventListener('click', sendMessage);

// Enter press karo toh bhi bheje
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// --- Server se events sunna ---

// Koi naya banda join hua
socket.on('user-joined', (name) => {
  showMessage('system', `${name} room mein aa gaya 👋`);
});

// Message aaya
socket.on('receive-message', ({ username: sender, message, time }) => {
  if (sender === username) {
    // Mera apna message
    showMessage('mine', message, `Tu • ${time}`);
  } else {
    // Dusre ka message
    showMessage('theirs', message, `${sender} • ${time}`);
  }
});

// Koi banda chala gaya
socket.on('user-left', (name) => {
  showMessage('system', `${name} room se chala gaya 👋`);
});

// Koi error aaya
socket.on('error', (msg) => {
  showMessage('system', `⚠️ ${msg}`);
});

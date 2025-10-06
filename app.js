const API = '';
const socket = io();

let currentUser = null;
let currentRoom = 'main';
const messagesEl = document.getElementById('messages');
const roomListEl = document.getElementById('roomList');
const products = [
  { id: 'crown_owner', name: 'صاحب التاج', price: 5000 },
  { id: 'master', name: 'صاحب الشات', price: 10000 }
];

function renderRooms(rooms){
  roomListEl.innerHTML = '';
  rooms.forEach(r => {
    const li = document.createElement('li');
    li.textContent = r.name;
    li.onclick = ()=> joinRoom(r.name);
    roomListEl.appendChild(li);
  });
}

async function fetchRooms(){
  const res = await fetch('/api/rooms');
  const data = await res.json();
  renderRooms(data);
}
fetchRooms();

function addMessage(m, me=false){
  const div = document.createElement('div');
  div.className = 'msg' + (me?' me':'');
  if(m.system) {
    div.textContent = m.text;
  } else {
    div.innerHTML = `<b>${m.username}</b>${m.message?(': '+m.message):''}${m.image?('<br/><img src="'+m.image+'" style="max-width:160px;border-radius:8px"/>':'')}`;
  }
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

socket.on('old_messages', (msgs)=> {
  messagesEl.innerHTML = '';
  msgs.forEach(m=> addMessage(m,false));
});
socket.on('new_message', (m)=> addMessage(m,false));
socket.on('system_message', (m)=> addMessage({system:true, text:m.text}, false));

function joinRoom(name){
  currentRoom = name;
  socket.emit('join_room', { room: name, username: currentUser?currentUser.username:'زائر' });
  document.getElementById('chatHeader').innerText = name;
}

document.getElementById('send').onclick = async ()=>{
  const text = document.getElementById('text').value;
  const fileInput = document.getElementById('file');
  let imageUrl = null;
  if (fileInput.files.length){
    const form = new FormData();
    form.append('image', fileInput.files[0]);
    const res = await fetch('/api/upload', { method:'POST', body: form });
    const j = await res.json();
    imageUrl = j.url;
  }
  if (!text && !imageUrl) return;
  socket.emit('send_message', { room: currentRoom, message: text, username: currentUser?currentUser.username:'زائر', image: imageUrl });
  document.getElementById('text').value = '';
  document.getElementById('file').value = '';
};

document.getElementById('btnGuest').onclick = ()=>{
  const name = prompt('اسم الزائر');
  if (!name) return;
  currentUser = { id: 'g_'+Date.now(), username: name, role: 'user', coins:50 };
  document.getElementById('userInfo').innerText = 'مرحبا، ' + name;
  joinRoom('main');
};

document.getElementById('btnRegister').onclick = async ()=>{
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  const res = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:u,password:p})});
  const j = await res.json();
  if (j.error) return alert(j.error);
  currentUser = j.user;
  document.getElementById('userInfo').innerText = 'مرحبا، ' + currentUser.username;
  joinRoom('main');
};

document.getElementById('btnLogin').onclick = async ()=>{
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:u,password:p})});
  const j = await res.json();
  if (j.error) return alert(j.error);
  currentUser = j.user;
  document.getElementById('userInfo').innerText = 'مرحبا، ' + currentUser.username;
  joinRoom('main');
};

document.getElementById('createRoom').onclick = async ()=>{
  const name = prompt('اسم الغرفة:');
  if (!name) return;
  await fetch('/api/rooms', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name})});
  fetchRooms();
};

document.getElementById('openStore').onclick = ()=>{
  document.getElementById('store').classList.remove('hidden');
  const pdiv = document.getElementById('products');
  pdiv.innerHTML = '';
  products.forEach(pr=>{
    const card = document.createElement('div');
    card.innerHTML = `<b>${pr.name}</b><p>السعر: ${pr.price} عملة</p><button data-id="${pr.id}">شراء</button>`;
    pdiv.appendChild(card);
  });
};

document.getElementById('closeStore').onclick = ()=> document.getElementById('store').classList.add('hidden');
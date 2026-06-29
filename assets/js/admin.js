import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, setDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app), storage=getStorage(app);
const $=id=>document.getElementById(id); const rupiah=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
let products=[], chats=[], editId=null, selectedChat=null;
$('loginForm').onsubmit=async e=>{e.preventDefault(); try{await signInWithEmailAndPassword(auth,$('email').value,$('password').value)}catch(err){alert('Login gagal: '+err.message)}};
$('logoutBtn').onclick=()=>signOut(auth);
onAuthStateChanged(auth,u=>{ $('loginPage').classList.toggle('hidden',!!u); $('appPage').classList.toggle('hidden',!u); if(u){$('adminEmail').textContent=u.email; startProducts(); startChats();}});
function showPage(page){document.querySelectorAll('.navbtn').forEach(x=>x.classList.toggle('active',x.dataset.page===page));document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));$(page).classList.add('active')}
document.querySelectorAll('.navbtn').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
$('goLiveChat') && ($('goLiveChat').onclick=()=>showPage('livechat'));
$('quickChat') && ($('quickChat').onclick=()=>showPage('livechat'));
$('quickProduct') && ($('quickProduct').onclick=()=>showPage('products'));
function startProducts(){onSnapshot(collection(db,'products'),snap=>{products=snap.docs.map(d=>({id:d.id,...d.data()})); renderProducts(); stats();});}
function stats(){ $('totalProducts').textContent=products.length; $('activeProducts').textContent=products.filter(p=>p.status!=='Nonaktif').length; $('emptyStock').textContent=products.filter(p=>Number(p.stock||0)<=0).length;}
function renderProducts(){const term=($('searchProduct').value||'').toLowerCase(), cat=$('filterCategory').value; const list=products.filter(p=>(!term||(p.name||'').toLowerCase().includes(term))&&(!cat||p.category===cat)); $('productList').innerHTML=list.map(p=>`<div class="item"><img src="${p.image||p.frontImage||''}"><div><b>${p.name||'-'}</b><div class="muted">${p.category||'-'} • ${rupiah(p.price)} • Stok: ${p.stock||0} • ${p.status||'Aktif'}</div></div><div class="actions"><button class="btn light" data-edit="${p.id}">Edit</button> <button class="btn red" data-del="${p.id}">Hapus</button></div></div>`).join('')||'<p class="muted">Belum ada produk.</p>'; document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>fillProduct(b.dataset.edit)); document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(confirm('Hapus produk ini?')) await deleteDoc(doc(db,'products',b.dataset.del))});}
$('searchProduct').oninput=renderProducts; $('filterCategory').onchange=renderProducts;
function fillProduct(id){const p=products.find(x=>x.id===id); if(!p)return; editId=id; $('pName').value=p.name||''; $('pCat').value=p.category||'Kaos'; $('pPrice').value=p.price||''; $('pStock').value=p.stock||0; $('pSku').value=p.sku||''; $('pStatus').value=p.status||'Aktif'; $('pBadge').value=p.badge||''; $('pDesc').value=p.description||''; $('oldImage').value=p.image||p.frontImage||''; $('preview').innerHTML=`<img src="${p.image||p.frontImage||''}">`;}
$('newProduct').onclick=()=>{$('productForm').reset(); editId=null; $('preview').innerHTML=''; $('oldImage').value=''};
$('pImage').onchange=e=>{const f=e.target.files[0]; $('preview').innerHTML=f?`<img src="${URL.createObjectURL(f)}">`:''};
async function uploadImage(file){ if(!file) return $('oldImage').value||''; const path=`products/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g,'_')}`; const r=ref(storage,path); await uploadBytes(r,file); return await getDownloadURL(r);}
$('productForm').onsubmit=async e=>{e.preventDefault(); try{const image=await uploadImage($('pImage').files[0]); const data={name:$('pName').value,category:$('pCat').value,price:Number($('pPrice').value||0),stock:Number($('pStock').value||0),sku:$('pSku').value,status:$('pStatus').value,badge:$('pBadge').value,description:$('pDesc').value,image,frontImage:image,updatedAt:serverTimestamp()}; if(editId) await setDoc(doc(db,'products',editId),data,{merge:true}); else await addDoc(collection(db,'products'),{...data,createdAt:serverTimestamp()}); $('productForm').reset(); editId=null; $('preview').innerHTML=''; alert('Produk tersimpan') }catch(err){alert('Gagal simpan: '+err.message)}};
function chatTime(c){try{return c.updatedAt?.toDate?.().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})||'-'}catch(e){return '-'}}
function renderChats(){
  const term=($('chatSearch')?.value||'').toLowerCase();
  const data=chats.filter(c=>!term || (c.customerName||'Tamu').toLowerCase().includes(term) || (c.lastMessage||'').toLowerCase().includes(term));
  $('chatList').innerHTML=data.map(c=>`<div class="chat-user ${selectedChat===c.id?'active':''} ${c.unreadAdmin?'unread':''}" data-chat="${c.id}"><div><b>${c.customerName||'Tamu'}</b><div class="muted">${c.lastMessage||'Belum ada pesan'}</div></div><span>${c.unreadAdmin?'<i></i>':''}${chatTime(c)}</span></div>`).join('')||'<p class="muted">Belum ada chat.</p>';
  document.querySelectorAll('[data-chat]').forEach(b=>b.onclick=()=>openChat(b.dataset.chat,b.querySelector('b').textContent));
}
function startChats(){onSnapshot(query(collection(db,'livechats'),orderBy('updatedAt','desc')),snap=>{
  chats=snap.docs.map(d=>({id:d.id,...d.data()}));
  const unread=chats.filter(c=>c.unreadAdmin).length;
  $('totalChats').textContent=chats.length;
  if($('unreadChats')) $('unreadChats').textContent=unread;
  if($('chatUnreadPill')) $('chatUnreadPill').textContent=unread+' baru';
  renderChats();
  if($('dashChatList')) $('dashChatList').innerHTML=chats.slice(0,6).map(c=>`<div class="dash-chat-item ${c.unreadAdmin?'unread':''}" data-dash-chat="${c.id}"><div><b>${c.customerName||'Tamu'}</b><p>${c.lastMessage||'Belum ada pesan'}</p></div><span>${c.unreadAdmin?'Baru':'Balas'}</span></div>`).join('')||'<p class="muted">Belum ada chat masuk.</p>';
  document.querySelectorAll('[data-dash-chat]').forEach(b=>b.onclick=()=>{const id=b.dataset.dashChat; const name=b.querySelector('b').textContent; showPage('livechat'); openChat(id,name);});
});}
$('chatSearch') && ($('chatSearch').oninput=renderChats);
let unsubMsgs=null; async function openChat(id,name){
  selectedChat=id; $('chatTitle').textContent=name; const c=chats.find(x=>x.id===id); $('chatMeta').textContent=(c?.status||'open')+' • '+chatTime(c);
  await setDoc(doc(db,'livechats',id),{unreadAdmin:false,adminOpenedAt:serverTimestamp()},{merge:true});
  renderChats();
  if(unsubMsgs)unsubMsgs(); unsubMsgs=onSnapshot(query(collection(db,'livechats',id,'messages'),orderBy('createdAt','asc')),snap=>{ $('messages').innerHTML=''; snap.forEach(d=>{const m=d.data(); const div=document.createElement('div'); div.className='msg '+(m.sender==='admin'?'admin':''); div.innerHTML=`<span>${(m.text||'').replace(/[<>&]/g, ch=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[ch]))}</span><small>${m.createdAt?.toDate?.().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})||''}</small>`; $('messages').appendChild(div)}); $('messages').scrollTop=$('messages').scrollHeight;});}
$('closeChatBtn') && ($('closeChatBtn').onclick=async()=>{if(!selectedChat)return; await setDoc(doc(db,'livechats',selectedChat),{status:'closed',updatedAt:serverTimestamp()},{merge:true});});
$('sendChat').onsubmit=async e=>{e.preventDefault(); if(!selectedChat)return alert('Pilih chat dulu'); const text=$('replyText').value.trim(); if(!text)return; await addDoc(collection(db,'livechats',selectedChat,'messages'),{text,sender:'admin',createdAt:serverTimestamp(),readByCustomer:false}); await setDoc(doc(db,'livechats',selectedChat),{lastMessage:text,lastSender:'admin',unreadCustomer:true,unreadAdmin:false,status:'open',updatedAt:serverTimestamp()},{merge:true}); $('replyText').value=''};

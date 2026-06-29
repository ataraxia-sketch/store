import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, doc, setDoc, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
const app=initializeApp(firebaseConfig); const db=getFirestore(app);
const $=id=>document.getElementById(id);
const toggle=$('ata-chat-toggle'), box=$('ata-chat-box'), close=$('ata-chat-close'), form=$('ata-chat-form'), input=$('ata-chat-input'), msgs=$('ata-chat-messages'), nameBox=$('ata-chat-name'), nameInput=$('ata-chat-customer'), saveName=$('ata-chat-save-name');
let guestId=localStorage.getItem('ata_guest_id')||('guest_'+Date.now()+'_'+Math.random().toString(36).slice(2)); localStorage.setItem('ata_guest_id',guestId);
let customerName=localStorage.getItem('ata_customer_name')||''; if(customerName){nameBox.style.display='none'}
const chatRef=doc(db,'livechats',guestId); const msgRef=collection(db,'livechats',guestId,'messages');
async function ensureChat(){await setDoc(chatRef,{customerName:customerName||'Tamu',updatedAt:serverTimestamp(),status:'open',lastMessage:''},{merge:true});}
toggle.onclick=async()=>{box.classList.toggle('show'); await ensureChat()}; close.onclick=()=>box.classList.remove('show');
saveName.onclick=async()=>{customerName=nameInput.value.trim()||'Tamu'; localStorage.setItem('ata_customer_name',customerName); nameBox.style.display='none'; await ensureChat()};
function render(snap){msgs.innerHTML=''; snap.forEach(d=>{const m=d.data(); const div=document.createElement('div'); div.className='ata-msg '+(m.sender==='admin'?'admin':'customer'); div.textContent=m.text||''; msgs.appendChild(div)}); msgs.scrollTop=msgs.scrollHeight}
onSnapshot(query(msgRef,orderBy('createdAt','asc')),render);
form.onsubmit=async(e)=>{e.preventDefault(); const text=input.value.trim(); if(!text)return; await ensureChat(); await addDoc(msgRef,{text,sender:'customer',createdAt:serverTimestamp(),readByAdmin:false}); await setDoc(chatRef,{customerName:customerName||'Tamu',lastMessage:text,lastSender:'customer',unreadAdmin:true,unreadCustomer:false,updatedAt:serverTimestamp(),status:'open'},{merge:true}); input.value=''};

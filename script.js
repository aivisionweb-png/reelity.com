const pages=[...document.querySelectorAll(".page")], nav=[...document.querySelectorAll(".nav")];
const today=document.getElementById("today"); today.textContent=new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
function showPage(id){pages.forEach(p=>p.classList.toggle("active",p.id===id));nav.forEach(n=>n.classList.toggle("active",n.dataset.page===id));window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
const modal=document.getElementById("modal"), body=document.getElementById("modalBody"), title=document.getElementById("modalTitle"), kicker=document.getElementById("modalKicker");
const forms={
 order:["NEW ORDER","Create distributor order",'<label>Distributor</label><select><option>Patel Distributors</option><option>Shreeji Agency</option><option>Rajkot Trade</option><option>Maruti Sales</option></select><label>Order value</label><input type="number" placeholder="₹0"><label>Items</label><input placeholder="e.g. Product A × 20 cases"><button class="primary" onclick="closeModal()">SAVE ORDER →</button>'],
 stock:["STOCK ENTRY","Receive incoming stock",'<label>Product</label><select><option>Product A</option><option>Product B</option><option>Product D</option><option>Product E</option></select><label>Quantity (cases)</label><input type="number" placeholder="0"><label>Reference</label><input placeholder="Purchase order / invoice no."><button class="primary" onclick="closeModal()">ADD TO STOCK →</button>'],
 distributor:["NEW DISTRIBUTOR","Add account",'<label>Business name</label><input placeholder="Distributor name"><label>Territory</label><input placeholder="City / area"><div class="form-row"><div><label>Credit limit</label><input type="number" placeholder="₹0"></div><div><label>Phone</label><input placeholder="+91…"></div></div><button class="primary" onclick="closeModal()">CREATE ACCOUNT →</button>'],
 payment:["RECORD PAYMENT","Log collection",'<label>Distributor</label><select><option>Patel Distributors</option><option>Shreeji Agency</option><option>Rajkot Trade</option><option>Maruti Sales</option></select><label>Amount received</label><input type="number" placeholder="₹0"><label>Mode</label><select><option>Bank transfer</option><option>UPI</option><option>Cash</option><option>Cheque</option></select><button class="primary" onclick="closeModal()">RECORD PAYMENT →</button>']
};
function openModal(type){const f=forms[type];if(!f)return;kicker.textContent=f[0];title.textContent=f[1];body.innerHTML=f[2];modal.classList.add("open")}
function closeModal(){modal.classList.remove("open")}
window.closeModal=closeModal;
document.querySelectorAll("[data-modal]").forEach(b=>b.addEventListener("click",()=>openModal(b.dataset.modal)));
document.getElementById("close").addEventListener("click",closeModal);
modal.addEventListener("click",e=>{if(e.target===modal)closeModal()});
document.querySelectorAll(".mini").forEach(b=>b.addEventListener("click",()=>alert("Reminder queued for WhatsApp. Connect your WhatsApp provider to send automatically.")));
document.querySelectorAll(".text-btn").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
document.getElementById("orderSearch")?.addEventListener("input",e=>{const q=e.target.value.toLowerCase();document.querySelectorAll("#orders .trow:not(.thead)").forEach(r=>r.style.display=r.textContent.toLowerCase().includes(q)?"grid":"none")});

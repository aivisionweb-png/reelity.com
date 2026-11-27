const pages=[...document.querySelectorAll(".page")],nav=[...document.querySelectorAll(".nav")];
document.getElementById("today").textContent=new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
function showPage(id){pages.forEach(p=>p.classList.toggle("active",p.id===id));nav.forEach(n=>n.classList.toggle("active",n.dataset.page===id));window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
const modal=document.getElementById("modal"),body=document.getElementById("modalBody"),title=document.getElementById("modalTitle"),kicker=document.getElementById("modalKicker");
const forms={
setup:["BUSINESS SETUP","Set up KS Enterprise",'<label>Business name</label><input placeholder="KS Enterprise"><label>Monthly target (optional)</label><input type="number" placeholder="₹0"><button class="primary" onclick="closeModal()">SAVE SETUP →</button>'],
order:["NEW ORDER","Create distributor order",'<label>Distributor</label><input placeholder="Enter real distributor name"><label>Order value</label><input type="number" placeholder="₹0"><label>Items / notes</label><input placeholder="Products, cases, notes…"><button class="primary" onclick="closeModal()">SAVE ORDER →</button>'],
stock:["STOCK ENTRY","Add real inventory",'<label>Product</label><input placeholder="Product name"><div class="form-row"><div><label>Quantity</label><input type="number" placeholder="0"></div><div><label>Unit</label><select><option>Cases</option><option>Pieces</option><option>Boxes</option></select></div></div><label>Cost value</label><input type="number" placeholder="₹0"><button class="primary" onclick="closeModal()">ADD STOCK →</button>'],
distributor:["NEW DISTRIBUTOR","Add real account",'<label>Business name</label><input placeholder="Distributor name"><label>Territory</label><input placeholder="City / area"><div class="form-row"><div><label>Credit limit</label><input type="number" placeholder="₹0"></div><div><label>Phone</label><input placeholder="+91…"></div></div><button class="primary" onclick="closeModal()">CREATE ACCOUNT →</button>'],
payment:["RECORD PAYMENT","Log a real collection",'<label>Distributor</label><input placeholder="Distributor name"><label>Amount received</label><input type="number" placeholder="₹0"><label>Mode</label><select><option>Bank transfer</option><option>UPI</option><option>Cash</option><option>Cheque</option></select><button class="primary" onclick="closeModal()">RECORD PAYMENT →</button>']
};
function openModal(type){const f=forms[type];kicker.textContent=f[0];title.textContent=f[1];body.innerHTML=f[2];modal.classList.add("open")}
function closeModal(){modal.classList.remove("open")} window.closeModal=closeModal;
document.querySelectorAll("[data-modal]").forEach(b=>b.addEventListener("click",()=>openModal(b.dataset.modal)));
document.getElementById("close").addEventListener("click",closeModal);modal.addEventListener("click",e=>{if(e.target===modal)closeModal()});

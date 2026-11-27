const SUPABASE_URL="https://ptxfjybdayqtqwcjpvxl.supabase.co";
const SUPABASE_KEY="sb_publishable_Uv8_AsELuR2okWRAY9FsfA_07-9TgeX";
const supabaseClient=window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
let mode="login",user=null,shop=null,data={sales:[],customers:[],expenses:[]},customerQuery="";
const $=id=>document.getElementById(id),msg=(id,text)=>{if($(id))$(id).textContent=text||""};
function show(id){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));if($(id))$(id).classList.add("active")}
function setMode(m){mode=m;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.mode===m));$("authBtn").innerHTML=m==="login"?'LOGIN <span>→</span>':'CREATE ACCOUNT <span>→</span>';msg("authMsg","")}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.mode)));

async function loadShop(){
 if(!supabaseClient||!user)throw new Error("Supabase connection unavailable.");
 const {data:shops,error}=await supabaseClient.from("shops").select("*").eq("owner_id",user.id).limit(1);
 if(error)throw error;shop=shops?.[0]||null;if(!shop)return show("onboarding");await loadDashboard();show("dashboard")
}
async function loadDashboard(){
 if(!shop)return;
 const [a,b,c]=await Promise.all([
  supabaseClient.from("sales").select("*").eq("shop_id",shop.id).order("created_at",{ascending:false}),
  supabaseClient.from("customers").select("*").eq("shop_id",shop.id).order("created_at",{ascending:false}),
  supabaseClient.from("expenses").select("*").eq("shop_id",shop.id).order("created_at",{ascending:false})
 ]);
 if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;
 data.sales=a.data||[];data.customers=b.data||[];data.expenses=c.data||[];render()
}
function money(n){return"₹"+Number(n||0).toLocaleString("en-IN")}
function todayOnly(items){const d=new Date().toDateString();return items.filter(x=>new Date(x.created_at).toDateString()===d)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function render(){
 const ts=todayOnly(data.sales),te=todayOnly(data.expenses),sales=ts.reduce((a,x)=>a+Number(x.amount||0),0),received=ts.reduce((a,x)=>a+Number(x.received||0),0),pending=data.customers.reduce((a,x)=>a+Number(x.balance||0),0),expenses=te.reduce((a,x)=>a+Number(x.amount||0),0);
 $("shopLabel").textContent=shop?.name||"Your shop";$("sales").textContent=money(sales);$("received").textContent=money(received);$("pending").textContent=money(pending);$("expenses").textContent=money(expenses);$("netCash").textContent=money(received-expenses);$("customerCount").textContent=data.customers.length;
 const h=new Date().getHours();$("welcome").textContent="Good "+(h<12?"morning":h<17?"afternoon":"evening")+".";
 $("transactions").innerHTML=data.sales.length?data.sales.slice(0,8).map(x=>'<div class="transaction"><div><b>'+esc(x.note||"Sale")+'</b><small>'+new Date(x.created_at).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})+(x.payment_method?" · "+esc(x.payment_method.toUpperCase()):"")+'</small></div><span class="amount">'+money(x.amount)+'</span></div>').join(""):'<div class="empty">No transactions yet.</div>';
 renderCustomers()
}
function renderCustomers(){
 const q=customerQuery.trim().toLowerCase();
 const list=data.customers.filter(x=>!q||String(x.name).toLowerCase().includes(q)||String(x.phone||"").toLowerCase().includes(q));
 $("customers").innerHTML=list.length?list.map(x=>'<div class="customer"><button class="customer-main" type="button" onclick="customerDetails(\''+x.id+'\')"><div><b>'+esc(x.name)+'</b><small>'+esc(x.phone||"No phone")+'</small></div><span class="amount '+(Number(x.balance)>0?"credit":"paid")+'">'+(Number(x.balance)>0?money(x.balance)+" due":"CLEAR")+'</span></button><div class="customer-actions">'+(Number(x.balance)>0?'<button class="mini" onclick="receivePayment(\''+x.id+'\')">RECEIVE</button>':"")+(x.phone?'<button class="mini" onclick="remindCustomer(\''+x.id+'\')">WHATSAPP</button>':"")+'</div></div>').join(""):'<div class="empty">No matching customers.</div>'
}
$("customerSearch").addEventListener("input",e=>{customerQuery=e.target.value;renderCustomers()});

$("authBtn").addEventListener("click",async()=>{
 if(!supabaseClient)return msg("authMsg","Supabase is still loading. Refresh once.");
 const email=$("email").value.trim(),password=$("password").value;if(!email||!password)return msg("authMsg","Enter email and password.");
 $("authBtn").disabled=true;msg("authMsg",mode==="login"?"Signing you in…":"Creating your account…");
 try{if(mode==="signup"){const {data:r,error}=await supabaseClient.auth.signUp({email,password});if(error)throw error;if(!r.session)return msg("authMsg","Account created. Check your email to verify it, then login.");user=r.user}else{const {data:r,error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)throw error;user=r.user}await loadShop()}catch(e){msg("authMsg",e.message||"Something went wrong.")}finally{$("authBtn").disabled=false}
});
$("googleBtn").addEventListener("click",async()=>{if(!supabaseClient)return msg("authMsg","Refresh once and try again.");const {error}=await supabaseClient.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});if(error)msg("authMsg",error.message)});
$("finishSetup").addEventListener("click",async()=>{
 const name=$("shopName").value.trim(),owner=$("ownerName").value.trim(),phone=$("shopPhone").value.trim();if(!name)return msg("setupMsg","Add your shop name.");$("finishSetup").disabled=true;msg("setupMsg","Saving your shop…");
 try{const {data:r,error}=await supabaseClient.from("shops").insert({owner_id:user.id,name,owner_name:owner||null,phone:phone||null}).select().single();if(error)throw error;shop=r;await loadDashboard();show("dashboard")}catch(e){msg("setupMsg",e.message||"Could not save shop.")}finally{$("finishSetup").disabled=false}
});

function openModal(type){
 const configs={
 sale:["QUICK SALE","Record a sale",'<label>Amount</label><input id="mAmount" type="number" min="0" placeholder="₹0"><label>Customer</label><select id="mCustomer"><option value="">Walk-in customer</option>'+data.customers.map(x=>'<option value="'+x.id+'">'+esc(x.name)+' — '+money(x.balance)+' due</option>').join("")+'</select><label>Received now</label><input id="mReceived" type="number" min="0" placeholder="₹0"><label>Payment method</label><select id="mMethod"><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="credit">Credit / Udhaar</option></select><label>Note</label><input id="mNote" placeholder="What was sold?"><button class="primary" onclick="addSale()">SAVE SALE →</button>'],
 customer:["CUSTOMER KHATA","Open a permanent khata",'<label>Name</label><input id="mName" placeholder="Customer name"><label>Phone</label><input id="mPhone" placeholder="+91…"><label>Opening balance</label><input id="mBalance" type="number" min="0" placeholder="₹0"><button class="primary" onclick="addCustomer()">CREATE KHATA →</button>'],
 expense:["EXPENSE","Track business spending",'<label>Amount</label><input id="mAmount" type="number" min="0" placeholder="₹0"><label>Category</label><select id="mCategory"><option>Stock</option><option>Electricity</option><option>Transport</option><option>Rent</option><option>Salary</option><option>Other</option></select><label>Note</label><input id="mNote" placeholder="Details"><button class="primary" onclick="addExpense()">SAVE EXPENSE →</button>'],
 reports:["REPORTS","Business snapshot",'<div class="report"><p>Total sales <b>'+money(data.sales.reduce((a,x)=>a+Number(x.amount||0),0))+'</b></p><p>Total received <b>'+money(data.sales.reduce((a,x)=>a+Number(x.received||0),0))+'</b></p><p>Pending khata <b>'+money(data.customers.reduce((a,x)=>a+Number(x.balance||0),0))+'</b></p><p>Total expenses <b>'+money(data.expenses.reduce((a,x)=>a+Number(x.amount||0),0))+'</b></p><p>Customers <b>'+data.customers.length+'</b></p></div><button class="primary" onclick="exportData()">EXPORT BACKUP →</button>']
 };
 const f=configs[type];$("modalEyebrow").textContent=f[0];$("modalTitle").textContent=f[1];$("modalBody").innerHTML=f[2];$("modal").classList.add("open")
}
window.addSale=async()=>{
 const amount=Number($("mAmount").value||0),received=Math.min(Number($("mReceived").value||0),amount),customerId=$("mCustomer").value||null,method=$("mMethod").value;
 if(!amount)return;
 const {error}=await supabaseClient.from("sales").insert({shop_id:shop.id,customer_id:customerId,amount,received,payment_method:method,note:$("mNote").value.trim()||null});
 if(error)return alert(error.message);
 if(customerId&&amount>received){const c=data.customers.find(x=>x.id===customerId);const {error:e}=await supabaseClient.from("customers").update({balance:Number(c.balance||0)+(amount-received)}).eq("id",customerId).eq("shop_id",shop.id);if(e)return alert(e.message)}
 $("modal").classList.remove("open");await loadDashboard()
};
window.addCustomer=async()=>{
 const name=$("mName").value.trim();if(!name)return;
 const {error}=await supabaseClient.from("customers").insert({shop_id:shop.id,name,phone:$("mPhone").value.trim()||null,balance:Number($("mBalance").value||0)});
 if(error)return alert(error.message);$("modal").classList.remove("open");await loadDashboard()
};
window.addExpense=async()=>{
 const amount=Number($("mAmount").value||0);if(!amount)return;
 const {error}=await supabaseClient.from("expenses").insert({shop_id:shop.id,amount,category:$("mCategory").value,note:$("mNote").value.trim()||null});
 if(error)return alert(error.message);$("modal").classList.remove("open");await loadDashboard()
};
window.customerDetails=id=>{const c=data.customers.find(x=>x.id===id);if(!c)return;openCustomerModal(c)};
function openCustomerModal(c){
 $("modalEyebrow").textContent="CUSTOMER KHATA";$("modalTitle").textContent=c.name;
 $("modalBody").innerHTML='<div class="customer-profile"><div class="big-balance">'+(Number(c.balance)>0?money(c.balance):"CLEAR")+'</div><p>'+esc(c.phone||"No phone added")+'</p><p class="muted">This khata stays saved even when the balance becomes ₹0.</p></div><button class="primary" onclick="receivePayment(\''+c.id+'\')">RECEIVE PAYMENT →</button>'+(c.phone?'<button class="ghost wide" onclick="remindCustomer(\''+c.id+'\')">WHATSAPP REMINDER</button>':"");
 $("modal").classList.add("open")
}
window.receivePayment=async id=>{
 const c=data.customers.find(x=>x.id===id);if(!c)return;const raw=prompt("Payment received from "+c.name+"\nCurrent due: "+money(c.balance)+"\n\nEnter amount:");
 const amount=Number(raw);if(!amount||amount<=0)return;const next=Math.max(0,Number(c.balance||0)-amount);
 if(amount>Number(c.balance||0))return alert("Payment cannot be greater than current due.");
 const {error}=await supabaseClient.from("customers").update({balance:next}).eq("id",id).eq("shop_id",shop.id);
 if(error)return alert(error.message);$("modal").classList.remove("open");await loadDashboard()
};
window.remindCustomer=id=>{
 const c=data.customers.find(x=>x.id===id);if(!c?.phone)return;
 const phone=String(c.phone).replace(/\D/g,"").replace(/^0/,"91");
 const text=encodeURIComponent("Hi "+c.name+", your pending HISAAB balance is "+money(c.balance)+". Please clear it when convenient. Thank you.");
 window.open("https://wa.me/"+phone+"?text="+text,"_blank")
};
function exportData(){
 const payload={exported_at:new Date().toISOString(),shop,sales:data.sales,customers:data.customers,expenses:data.expenses};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="hisaab-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(url)
}
$("exportData").addEventListener("click",exportData);
$("refreshData").addEventListener("click",async()=>{try{await loadDashboard()}catch(e){alert(e.message)}});
document.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>openModal(b.dataset.open)));
$("closeModal").addEventListener("click",()=>$("modal").classList.remove("open"));
$("modal").addEventListener("click",e=>{if(e.target.id==="modal")$("modal").classList.remove("open")});
$("logout").addEventListener("click",async()=>{if(supabaseClient)await supabaseClient.auth.signOut();user=null;shop=null;data={sales:[],customers:[],expenses:[]};show("auth");setMode("login")});
if(supabaseClient){supabaseClient.auth.onAuthStateChange(async(event,session)=>{if(session?.user){user=session.user;try{await loadShop()}catch(e){msg("authMsg",e.message);show("auth")}}else if(event==="SIGNED_OUT")show("auth")});(async()=>{const {data:s}=await supabaseClient.auth.getSession();if(s.session?.user){user=s.session.user;try{await loadShop()}catch(e){msg("authMsg",e.message);show("auth")}}else show("auth")})()}else msg("authMsg","Connection library did not load. Refresh the page.");

const SUPABASE_URL = "https://ptxfjybdayqtqwcjpvxl.supabase.co";
const SUPABASE_KEY = "sb_publishable_Uv8_AsELuR2okWRAY9FsfA_07-9TgeX";
const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

let mode = "login";
let user = null;
let shop = null;
let data = { sales: [], customers: [], expenses: [] };

const $ = id => document.getElementById(id);
const msg = (id, text) => { if ($(id)) $(id).textContent = text || ""; };

function show(id) {
  document.querySelectorAll(".screen").forEach(x => x.classList.remove("active"));
  const target = $(id);
  if (target) target.classList.add("active");
}

function setMode(nextMode) {
  mode = nextMode;
  document.querySelectorAll(".tab").forEach(x => {
    x.classList.toggle("active", x.dataset.mode === mode);
  });
  const authBtn = $("authBtn");
  if (authBtn) {
    authBtn.innerHTML = mode === "login"
      ? 'LOGIN <span>→</span>'
      : 'CREATE ACCOUNT <span>→</span>';
  }
  msg("authMsg", "");
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
});

async function loadShop() {
  if (!supabaseClient || !user) throw new Error("Supabase connection is unavailable.");

  const { data: shops, error } = await supabaseClient
    .from("shops").select("*").eq("owner_id", user.id).limit(1);

  if (error) throw error;
  shop = shops?.[0] || null;

  if (!shop) {
    show("onboarding");
    return;
  }

  await loadDashboard();
  show("dashboard");
}

async function loadDashboard() {
  if (!shop) return;

  const [salesRes, customersRes, expensesRes] = await Promise.all([
    supabaseClient.from("sales").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false }),
    supabaseClient.from("customers").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false }),
    supabaseClient.from("expenses").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false })
  ]);

  if (salesRes.error) throw salesRes.error;
  if (customersRes.error) throw customersRes.error;
  if (expensesRes.error) throw expensesRes.error;

  data.sales = salesRes.data || [];
  data.customers = customersRes.data || [];
  data.expenses = expensesRes.data || [];
  render();
}

$("authBtn").addEventListener("click", async () => {
  if (!supabaseClient) {
    msg("authMsg", "Supabase is still loading. Refresh once and try again.");
    return;
  }

  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) {
    msg("authMsg", "Enter email and password.");
    return;
  }

  $("authBtn").disabled = true;
  msg("authMsg", mode === "login" ? "Signing you in..." : "Creating your account...");

  try {
    if (mode === "signup") {
      const { data: result, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;

      if (!result.session) {
        msg("authMsg", "Account created. Check your email to verify it, then login.");
        return;
      }
      user = result.user;
    } else {
      const { data: result, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      user = result.user;
    }

    await loadShop();
  } catch (error) {
    msg("authMsg", error.message || "Something went wrong.");
  } finally {
    $("authBtn").disabled = false;
  }
});

$("googleBtn").addEventListener("click", async () => {
  if (!supabaseClient) return msg("authMsg", "Supabase is still loading. Refresh once.");
  msg("authMsg", "Opening Google sign-in...");
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin }
  });
  if (error) msg("authMsg", error.message);
});

$("finishSetup").addEventListener("click", async () => {
  if (!supabaseClient || !user) return msg("setupMsg", "Please login again.");

  const name = $("shopName").value.trim();
  const owner = $("ownerName").value.trim();
  const phone = $("shopPhone").value.trim();

  if (!name) return msg("setupMsg", "Add your shop name.");

  $("finishSetup").disabled = true;
  msg("setupMsg", "Saving your shop...");

  try {
    const { data: created, error } = await supabaseClient
      .from("shops")
      .insert({ owner_id: user.id, name, owner_name: owner || null, phone: phone || null })
      .select().single();

    if (error) throw error;

    shop = created;
    await loadDashboard();
    show("dashboard");
  } catch (error) {
    msg("setupMsg", error.message || "Could not save shop.");
  } finally {
    $("finishSetup").disabled = false;
  }
});

function money(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function todayOnly(items) {
  const today = new Date().toDateString();
  return items.filter(x => new Date(x.created_at).toDateString() === today);
}

function render() {
  const todaySales = todayOnly(data.sales);
  const todayExpenses = todayOnly(data.expenses);

  $("shopLabel").textContent = shop?.name || "Your shop";
  $("sales").textContent = money(todaySales.reduce((a,x)=>a+Number(x.amount||0),0));
  $("received").textContent = money(todaySales.reduce((a,x)=>a+Number(x.received||0),0));
  $("pending").textContent = money(data.customers.reduce((a,x)=>a+Number(x.balance||0),0));
  $("expenses").textContent = money(todayExpenses.reduce((a,x)=>a+Number(x.amount||0),0));

  const h = new Date().getHours();
  $("welcome").textContent = "Good " + (h < 12 ? "morning" : h < 17 ? "afternoon" : "evening") + ".";

  $("transactions").innerHTML = data.sales.length
    ? data.sales.slice(0,6).map(x =>
      '<div class="transaction"><div><b>'+escapeHtml(x.note||"Sale")+
      '</b><small>'+new Date(x.created_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})+
      '</small></div><span class="amount">'+money(x.amount)+'</span></div>').join("")
    : '<div class="empty">No transactions yet.</div>';

  $("customers").innerHTML = data.customers.length
    ? data.customers.map(x =>
      '<div class="customer"><div><b>'+escapeHtml(x.name)+
      '</b><small>'+escapeHtml(x.phone||"No phone")+
      '</small></div><span class="amount credit">'+money(x.balance)+'</span></div>').join("")
    : '<div class="empty">No customers added yet.</div>';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function openModal(type) {
  const configs = {
    sale:["QUICK SALE","Record a sale",'<label>Amount</label><input id="mAmount" type="number" min="0"><label>Note</label><input id="mNote" placeholder="Counter sale"><label>Received now</label><input id="mReceived" type="number" min="0"><button class="primary" onclick="addSale()">SAVE SALE →</button>'],
    customer:["CUSTOMER KHATA","Add customer",'<label>Name</label><input id="mName"><label>Phone</label><input id="mPhone"><label>Opening balance</label><input id="mBalance" type="number" min="0"><button class="primary" onclick="addCustomer()">CREATE KHATA →</button>'],
    expense:["EXPENSE","Add expense",'<label>Amount</label><input id="mAmount" type="number" min="0"><label>For</label><input id="mNote" placeholder="Stock, electricity, transport..."><button class="primary" onclick="addExpense()">SAVE EXPENSE →</button>'],
    reports:["REPORTS","Business snapshot",'<div class="report"><p>Sales <b>'+money(data.sales.reduce((a,x)=>a+Number(x.amount||0),0))+'</b></p><p>Received <b>'+money(data.sales.reduce((a,x)=>a+Number(x.received||0),0))+'</b></p><p>Pending <b>'+money(data.customers.reduce((a,x)=>a+Number(x.balance||0),0))+'</b></p><p>Expenses <b>'+money(data.expenses.reduce((a,x)=>a+Number(x.amount||0),0))+'</b></p></div>']
  };
  const f = configs[type];
  $("modalEyebrow").textContent=f[0];
  $("modalTitle").textContent=f[1];
  $("modalBody").innerHTML=f[2];
  $("modal").classList.add("open");
}

window.addSale = async function() {
  const amount=Number($("mAmount").value||0), received=Number($("mReceived").value||0);
  if(!amount || !shop) return;
  const {error}=await supabaseClient.from("sales").insert({shop_id:shop.id,amount,received,payment_method:received>=amount?"cash":"credit",note:$("mNote").value.trim()||null});
  if(error) return alert(error.message);
  $("modal").classList.remove("open"); await loadDashboard();
};

window.addCustomer = async function() {
  const name=$("mName").value.trim();
  if(!name || !shop) return;
  const {error}=await supabaseClient.from("customers").insert({shop_id:shop.id,name,phone:$("mPhone").value.trim()||null,balance:Number($("mBalance").value||0)});
  if(error) return alert(error.message);
  $("modal").classList.remove("open"); await loadDashboard();
};

window.addExpense = async function() {
  const amount=Number($("mAmount").value||0);
  if(!amount || !shop) return;
  const {error}=await supabaseClient.from("expenses").insert({shop_id:shop.id,amount,category:"General",note:$("mNote").value.trim()||null});
  if(error) return alert(error.message);
  $("modal").classList.remove("open"); await loadDashboard();
};

document.querySelectorAll("[data-open]").forEach(btn => btn.addEventListener("click",()=>openModal(btn.dataset.open)));
$("closeModal").addEventListener("click",()=> $("modal").classList.remove("open"));
$("modal").addEventListener("click",e=>{if(e.target.id==="modal")$("modal").classList.remove("open")});
$("logout").addEventListener("click",async()=>{if(supabaseClient)await supabaseClient.auth.signOut();user=null;shop=null;data={sales:[],customers:[],expenses:[]};show("auth");setMode("login")});

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      user=session.user;
      try { await loadShop(); }
      catch(error) { msg("authMsg",error.message||"Could not load your shop."); show("auth"); }
    } else if(event==="SIGNED_OUT") show("auth");
  });

  (async function init(){
    const {data:sessionData}=await supabaseClient.auth.getSession();
    if(sessionData.session?.user){
      user=sessionData.session.user;
      try { await loadShop(); }
      catch(error) { msg("authMsg",error.message||"Could not connect to HISAAB."); show("auth"); }
    } else show("auth");
  })();
} else {
  msg("authMsg","Connection library did not load. Refresh the page.");
}
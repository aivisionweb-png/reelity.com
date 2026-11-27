const SUPABASE_URL = "https://ptxfjybdayqtqwcjpvxl.supabase.co";
const SUPABASE_KEY = "sb_publishable_Uv8_AsELuR2okWRAY9FsfA_07-9TgeX";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

let mode = "login";
let user = null;
let shop = null;
let data = { sales: [], customers: [], expenses: [] };

const $ = id => document.getElementById(id);

function show(id) {
  document.querySelectorAll(".screen").forEach(x => x.classList.remove("active"));
  $(id).classList.add("active");
}

function msg(id, text) {
  $(id).textContent = text || "";
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () => {
    mode = btn.dataset.mode;
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    $("authBtn").innerHTML = mode === "login"
      ? "LOGIN <span>→</span>"
      : "CREATE ACCOUNT <span>→</span>";
    msg("authMsg", "");
  };
});

async function loadShop() {
  const { data: shops, error } = await supabase
    .from("shops")
    .select("*")
    .eq("owner_id", user.id)
    .limit(1);

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
    supabase.from("sales").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false }),
    supabase.from("customers").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false }),
    supabase.from("expenses").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false })
  ]);

  if (salesRes.error) throw salesRes.error;
  if (customersRes.error) throw customersRes.error;
  if (expensesRes.error) throw expensesRes.error;

  data.sales = salesRes.data || [];
  data.customers = customersRes.data || [];
  data.expenses = expensesRes.data || [];
  render();
}

$("authBtn").onclick = async () => {
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
      const { data: result, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (!result.session) {
        msg("authMsg", "Account created. Check your email to verify it, then login.");
        return;
      }
      user = result.user;
    } else {
      const { data: result, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      user = result.user;
    }

    await loadShop();
  } catch (error) {
    msg("authMsg", error.message || "Something went wrong.");
  } finally {
    $("authBtn").disabled = false;
  }
};

$("googleBtn").onclick = async () => {
  msg("authMsg", "Opening Google sign-in...");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin }
  });
  if (error) msg("authMsg", error.message);
};

$("finishSetup").onclick = async () => {
  const name = $("shopName").value.trim();
  const owner = $("ownerName").value.trim();
  const phone = $("shopPhone").value.trim();

  if (!name) {
    msg("setupMsg", "Add your shop name.");
    return;
  }

  $("finishSetup").disabled = true;
  msg("setupMsg", "Saving your shop...");

  try {
    const { data: created, error } = await supabase
      .from("shops")
      .insert({
        owner_id: user.id,
        name,
        owner_name: owner || null,
        phone: phone || null
      })
      .select()
      .single();

    if (error) throw error;

    shop = created;
    await loadDashboard();
    show("dashboard");
  } catch (error) {
    msg("setupMsg", error.message || "Could not save shop.");
  } finally {
    $("finishSetup").disabled = false;
  }
};

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

  const sales = todaySales.reduce((a, x) => a + Number(x.amount || 0), 0);
  const received = todaySales.reduce((a, x) => a + Number(x.received || 0), 0);
  const pending = data.customers.reduce((a, x) => a + Number(x.balance || 0), 0);
  const expenses = todayExpenses.reduce((a, x) => a + Number(x.amount || 0), 0);

  $("shopLabel").textContent = shop?.name || "Your shop";
  $("sales").textContent = money(sales);
  $("received").textContent = money(received);
  $("pending").textContent = money(pending);
  $("expenses").textContent = money(expenses);

  const h = new Date().getHours();
  $("welcome").textContent = "Good " + (h < 12 ? "morning" : h < 17 ? "afternoon" : "evening") + ".";

  $("transactions").innerHTML = data.sales.length
    ? data.sales.slice(0, 6).map(x =>
      '<div class="transaction"><div><b>' + (x.note || "Sale") +
      '</b><small>' + new Date(x.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) +
      '</small></div><span class="amount">' + money(x.amount) + '</span></div>'
    ).join("")
    : '<div class="empty">No transactions yet.</div>';

  $("customers").innerHTML = data.customers.length
    ? data.customers.map(x =>
      '<div class="customer"><div><b>' + escapeHtml(x.name) +
      '</b><small>' + escapeHtml(x.phone || "No phone") +
      '</small></div><span class="amount credit">' + money(x.balance) + '</span></div>'
    ).join("")
    : '<div class="empty">No customers added yet.</div>';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function openModal(type) {
  const configs = {
    sale: ["QUICK SALE", "Record a sale",
      '<label>Amount</label><input id="mAmount" type="number" min="0">' +
      '<label>Note</label><input id="mNote" placeholder="Counter sale">' +
      '<label>Received now</label><input id="mReceived" type="number" min="0">' +
      '<button class="primary" onclick="addSale()">SAVE SALE →</button>'],
    customer: ["CUSTOMER KHATA", "Add customer",
      '<label>Name</label><input id="mName">' +
      '<label>Phone</label><input id="mPhone">' +
      '<label>Opening balance</label><input id="mBalance" type="number" min="0">' +
      '<button class="primary" onclick="addCustomer()">CREATE KHATA →</button>'],
    expense: ["EXPENSE", "Add expense",
      '<label>Amount</label><input id="mAmount" type="number" min="0">' +
      '<label>For</label><input id="mNote" placeholder="Stock, electricity, transport...">' +
      '<button class="primary" onclick="addExpense()">SAVE EXPENSE →</button>'],
    reports: ["REPORTS", "Business snapshot",
      '<div class="report"><p>Sales <b>' + money(data.sales.reduce((a, x) => a + Number(x.amount || 0), 0)) +
      '</b></p><p>Received <b>' + money(data.sales.reduce((a, x) => a + Number(x.received || 0), 0)) +
      '</b></p><p>Pending <b>' + money(data.customers.reduce((a, x) => a + Number(x.balance || 0), 0)) +
      '</b></p><p>Expenses <b>' + money(data.expenses.reduce((a, x) => a + Number(x.amount || 0), 0)) + '</b></p></div>']
  };

  const f = configs[type];
  $("modalEyebrow").textContent = f[0];
  $("modalTitle").textContent = f[1];
  $("modalBody").innerHTML = f[2];
  $("modal").classList.add("open");
}

async function addSale() {
  const amount = Number($("mAmount").value || 0);
  const received = Number($("mReceived").value || 0);
  if (!amount) return;

  const { error } = await supabase.from("sales").insert({
    shop_id: shop.id,
    amount,
    received,
    payment_method: received >= amount ? "cash" : "credit",
    note: $("mNote").value.trim() || null
  });

  if (error) return alert(error.message);

  $("modal").classList.remove("open");
  await loadDashboard();
}

async function addCustomer() {
  const name = $("mName").value.trim();
  if (!name) return;

  const { error } = await supabase.from("customers").insert({
    shop_id: shop.id,
    name,
    phone: $("mPhone").value.trim() || null,
    balance: Number($("mBalance").value || 0)
  });

  if (error) return alert(error.message);

  $("modal").classList.remove("open");
  await loadDashboard();
}

async function addExpense() {
  const amount = Number($("mAmount").value || 0);
  if (!amount) return;

  const { error } = await supabase.from("expenses").insert({
    shop_id: shop.id,
    amount,
    category: "General",
    note: $("mNote").value.trim() || null
  });

  if (error) return alert(error.message);

  $("modal").classList.remove("open");
  await loadDashboard();
}

document.querySelectorAll("[data-open]").forEach(btn => {
  btn.onclick = () => openModal(btn.dataset.open);
});

$("closeModal").onclick = () => $("modal").classList.remove("open");
$("modal").onclick = e => {
  if (e.target.id === "modal") $("modal").classList.remove("open");
};

$("logout").onclick = async () => {
  await supabase.auth.signOut();
  user = null;
  shop = null;
  data = { sales: [], customers: [], expenses: [] };
  show("auth");
};

supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    user = session.user;
    try {
      await loadShop();
    } catch (error) {
      msg("authMsg", error.message || "Could not load your shop.");
      show("auth");
    }
  } else if (event === "SIGNED_OUT") {
    show("auth");
  }
});

(async function init() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    user = sessionData.session.user;
    try {
      await loadShop();
    } catch (error) {
      msg("authMsg", error.message || "Could not connect to HISAAB.");
      show("auth");
    }
  } else {
    show("auth");
  }
})();
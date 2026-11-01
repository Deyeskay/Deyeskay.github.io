// Payment details, decoded from the shop's PhonePe QR on the printed menu.
const UPI = {
  id: "8185025112-2@ybl",
  name: "RAKOTI SNEHA",
};

// To change the menu, edit this list. Prices are in rupees.
// Each item's photo is images/<name-in-lowercase-with-dashes>.jpg
const MENU = [
  {
    category: "Loaded Bowls",
    items: [
      { name: "Creamy Loaded Bowl", price: 135 },
      { name: "Loaded Nacho Bowl", price: 140 },
      { name: "Peri Peri Salad Bowl", price: 150 },
      { name: "Tandoori Loaded Bowl", price: 150 },
      { name: "Cheese Please Bowl", price: 160 },
    ],
  },
  {
    category: "Fries",
    items: [
      { name: "Cheesy Fries", price: 69 },
      { name: "Peri Peri Fries", price: 69 },
      { name: "Creamy Fries", price: 69 },
    ],
  },
  {
    category: "Dessert Bowls",
    items: [
      { name: "Dark Temptation", price: 100 },
      { name: "Choco Duo", price: 110 },
      { name: "Waffy Pop Delight", price: 115 },
      { name: "Triple Choco Bliss", price: 120 },
      { name: "Kinder Crunch", price: 125 },
      { name: "Ultimate Chocolate", price: 130 },
    ],
  },
];

const $ = (id) => document.getElementById(id);
const rupees = (n) => "₹" + n.toLocaleString("en-IN");

// Namespaced because every app under deyeskay.github.io shares one localStorage.
const ORDERS_KEY = "munchDistrict.orders.v1";

// Item names are unique, so the name doubles as the cart key.
const allItems = MENU.flatMap((group) => group.items);
const cart = new Map();
let activeTab = 0;

const qtyOf = (name) => cart.get(name) || 0;
const cartLines = () => allItems.filter((item) => qtyOf(item.name) > 0);
const cartCount = () => cartLines().reduce((sum, item) => sum + qtyOf(item.name), 0);
const cartTotal = () => cartLines().reduce((sum, item) => sum + item.price * qtyOf(item.name), 0);

function setQty(name, qty) {
  if (qty > 0) cart.set(name, qty);
  else cart.delete(name);
  renderItems();
  renderBar();
}

function renderTabs() {
  $("tabs").replaceChildren(
    ...MENU.map((group, index) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "tab";
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(index === activeTab));
      tab.textContent = group.category;
      tab.addEventListener("click", () => {
        activeTab = index;
        renderTabs();
        renderItems();
      });
      return tab;
    })
  );
}

function renderItems() {
  const group = MENU[activeTab];
  $("items").replaceChildren(
    ...group.items.map((item) => {
      const qty = qtyOf(item.name);
      const card = document.createElement("article");
      card.className = "item";

      const img = document.createElement("img");
      img.src = "images/" + item.name.toLowerCase().replace(/ /g, "-") + ".jpg";
      img.alt = "";
      img.width = 72;
      img.height = 72;

      const info = document.createElement("div");
      info.className = "item-info";
      const title = document.createElement("h3");
      title.textContent = item.name;
      const price = document.createElement("p");
      price.textContent = rupees(item.price);
      info.append(title, price);

      const stepper = document.createElement("div");
      stepper.className = "stepper";

      const minus = document.createElement("button");
      minus.type = "button";
      minus.className = "minus";
      minus.textContent = "–";
      minus.disabled = qty === 0;
      minus.setAttribute("aria-label", "Remove one " + item.name);
      minus.addEventListener("click", () => setQty(item.name, qty - 1));

      const count = document.createElement("span");
      count.textContent = qty;

      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "plus";
      plus.textContent = "+";
      plus.setAttribute("aria-label", "Add one " + item.name);
      plus.addEventListener("click", () => setQty(item.name, qty + 1));

      stepper.append(minus, count, plus);
      card.append(img, info, stepper);
      return card;
    })
  );
}

function renderBar() {
  $("cart-count").textContent = cartCount();
  $("menu-total").textContent = rupees(cartTotal());
  $("next").disabled = cartCount() === 0;
}

// Same fields as the shop's own QR, plus the amount and currency when there is one.
function upiLink(amount) {
  return (
    "upi://pay?pa=" + UPI.id +
    "&pn=" + encodeURIComponent(UPI.name) +
    (amount > 0 ? "&am=" + amount.toFixed(2) + "&cu=INR" : "") +
    "&mc=0000&mode=02&purpose=00"
  );
}

function qrSvg(text) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  const quiet = 4; // blank margin scanners need around the code
  let path = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.isDark(row, col)) path += `M${col + quiet} ${row + quiet}h1v1h-1z`;
    }
  }
  const full = size + quiet * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}" shape-rendering="crispEdges"><rect width="${full}" height="${full}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}

function showMenu() {
  $("pay-screen").hidden = true;
  $("menu-screen").hidden = false;
  window.scrollTo(0, 0);
}

function showPay() {
  const total = cartTotal();
  $("pay-name").textContent = UPI.name;
  $("qr").innerHTML = qrSvg(upiLink(total));
  $("qr").setAttribute("aria-label", "UPI payment QR code for " + rupees(total));
  $("summary-total").textContent = rupees(total);
  $("summary").replaceChildren(
    ...cartLines().map((item) => {
      const qty = qtyOf(item.name);
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = qty + " × " + item.name;
      const amount = document.createElement("b");
      amount.textContent = rupees(item.price * qty);
      li.append(label, amount);
      return li;
    })
  );
  renderPayment();
  $("toast").hidden = true;
  $("menu-screen").hidden = true;
  $("pay-screen").hidden = false;
  window.scrollTo(0, 0);
}

function paymentState() {
  const total = cartTotal();
  const mode = document.querySelector('input[name="pay-mode"]:checked').value;
  const cash = Math.max(0, Number($("cash-received").value) || 0);
  const remaining = Math.round(Math.max(0, total - cash) * 100) / 100;
  const change = Math.round(Math.max(0, cash - total) * 100) / 100;
  return { total, mode, cash, remaining, change, settled: mode === "upi" || remaining === 0 };
}

function renderPayment() {
  const { total, mode, remaining, change, settled } = paymentState();
  const isCash = mode === "cash";
  $("pay-title").textContent = isCash ? "Collect cash" : "Scan & Pay";
  $("pay-amount").textContent = rupees(total);
  $("upi-panel").hidden = isCash;
  $("cash-panel").hidden = !isCash;

  const balance = $("cash-balance");
  balance.classList.toggle("is-due", remaining > 0);
  if (remaining > 0) balance.textContent = "Remaining to pay: " + rupees(remaining);
  else if (change > 0) balance.textContent = "Change to return: " + rupees(change);
  else balance.textContent = "Paid in full";

  $("payment-received").disabled = !settled;
}

function loadOrders() {
  try {
    const saved = JSON.parse(localStorage.getItem(ORDERS_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function acceptPayment() {
  const { total, mode, cash, change, settled } = paymentState();
  if (!settled || total === 0) return;

  const orders = loadOrders();
  const number = orders.reduce((max, order) => Math.max(max, order.number), 0) + 1;
  orders.push({
    number,
    customer: $("customer-name").value.trim(),
    items: cartLines().map((item) => ({ name: item.name, price: item.price, qty: qtyOf(item.name) })),
    total,
    mode,
    cashReceived: mode === "cash" ? cash : null,
    change: mode === "cash" ? change : null,
    createdAt: new Date().toISOString(),
    servedAt: null,
  });

  try {
    saveOrders(orders);
  } catch {
    // Keep the cart so the order isn't lost when the browser refuses to store it.
    alert("Could not save this order. Browser storage is full or blocked.");
    return;
  }

  resetOrderForm();
  showMenu();
  renderOrdersButton();
  showToast("Order #" + number + " saved");
}

function resetOrderForm() {
  cart.clear();
  activeTab = 0;
  $("customer-name").value = "";
  $("cash-received").value = "";
  document.querySelector('input[name="pay-mode"][value="upi"]').checked = true;
  renderTabs();
  renderItems();
  renderBar();
}

let toastTimer;
function showToast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 2500);
}

let ordersTab = "mine";

function renderOrdersButton() {
  $("orders-count").textContent = loadOrders().filter((order) => !order.servedAt).length;
}

function markServed(number) {
  const orders = loadOrders();
  const order = orders.find((candidate) => candidate.number === number);
  if (!order) return;
  order.servedAt = new Date().toISOString();
  try {
    saveOrders(orders);
  } catch {
    alert("Could not update this order. Browser storage is full or blocked.");
    return;
  }
  renderOrdersButton();
  renderOrders();
}

function textEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;
  return el;
}

function paymentText(order) {
  if (order.mode === "upi") return "UPI";
  return "Cash " + rupees(order.cashReceived) +
    (order.change > 0 ? " · change " + rupees(order.change) : "");
}

function formatTime(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}

function orderCard(order) {
  const card = document.createElement("article");
  card.className = "order";

  const head = document.createElement("div");
  head.className = "order-row";
  head.append(
    textEl("h3", "", "#" + order.number + (order.customer ? " · " + order.customer : "")),
    textEl("time", "order-time", formatTime(order.createdAt))
  );

  const lines = document.createElement("ul");
  order.items.forEach((item) => lines.append(textEl("li", "", item.qty + " × " + item.name)));

  const foot = document.createElement("div");
  foot.className = "order-row order-foot";
  const money = document.createElement("div");
  money.append(textEl("b", "", rupees(order.total)), textEl("span", "order-mode", paymentText(order)));
  foot.append(money);

  if (order.servedAt) {
    foot.append(textEl("span", "served-tag", "Served"));
  } else if (ordersTab === "mine") {
    const served = textEl("button", "served-btn", "Served");
    served.type = "button";
    served.setAttribute("aria-label", "Mark order " + order.number + " as served");
    served.addEventListener("click", () => markServed(order.number));
    foot.append(served);
  } else {
    foot.append(textEl("span", "pending-tag", "Not served"));
  }

  card.append(head, lines, foot);
  return card;
}

function billsSummary(orders) {
  const sum = (list) => list.reduce((total, order) => total + order.total, 0);
  const box = document.createElement("section");
  box.className = "bills";
  box.setAttribute("aria-label", "Total bills");
  const stat = (label, value) => {
    const cell = document.createElement("div");
    cell.append(textEl("span", "", label), textEl("b", "", value));
    return cell;
  };
  box.append(
    stat("Total bills", String(orders.length)),
    stat("Total amount", rupees(sum(orders))),
    stat("UPI", rupees(sum(orders.filter((order) => order.mode === "upi")))),
    stat("Cash", rupees(sum(orders.filter((order) => order.mode === "cash"))))
  );
  return box;
}

function renderOrders() {
  const orders = loadOrders();
  const isMine = ordersTab === "mine";
  $("tab-mine").setAttribute("aria-selected", String(isMine));
  $("tab-all").setAttribute("aria-selected", String(!isMine));

  // My Orders runs oldest first, the order they get served in. All Orders shows newest first.
  const shown = isMine ? orders.filter((order) => !order.servedAt) : [...orders].reverse();
  const nodes = shown.map(orderCard);
  if (!shown.length) {
    nodes.push(textEl("p", "orders-empty", isMine ? "No orders waiting to be served." : "No orders yet."));
  }
  if (!isMine) nodes.unshift(billsSummary(orders));
  $("orders-list").replaceChildren(...nodes);
}

function openOrders() {
  ordersTab = "mine";
  renderOrders();
  $("toast").hidden = true;
  $("orders-popup").showModal();
}

// With items in the cart the popup QR carries the total; with none, the customer types the amount.
function openQrPopup() {
  const total = cartTotal();
  $("qr-popup-amount").textContent = total > 0 ? rupees(total) : "Enter the amount in your UPI app";
  $("qr-popup-amount").classList.toggle("is-hint", total === 0);
  $("qr-popup-code").innerHTML = qrSvg(upiLink(total));
  $("qr-popup-name").textContent = UPI.name;
  $("qr-popup").showModal();
}

$("qr-open").addEventListener("click", openQrPopup);
$("qr-close").addEventListener("click", () => $("qr-popup").close());
$("qr-popup").addEventListener("click", (event) => {
  // A click landing on the dialog element itself is on the backdrop.
  if (event.target === $("qr-popup")) $("qr-popup").close();
});

$("next").addEventListener("click", showPay);
$("back").addEventListener("click", showMenu);
$("payment-received").addEventListener("click", acceptPayment);
$("cash-received").addEventListener("input", renderPayment);
document.querySelectorAll('input[name="pay-mode"]').forEach((radio) => {
  radio.addEventListener("change", renderPayment);
});

$("menu-open").addEventListener("click", () => {
  $("toast").hidden = true;
  $("menu-popup").showModal();
});
$("menu-close").addEventListener("click", () => $("menu-popup").close());
$("menu-popup").addEventListener("click", (event) => {
  if (event.target === $("menu-popup")) $("menu-popup").close();
});

$("orders-open").addEventListener("click", openOrders);
$("orders-close").addEventListener("click", () => $("orders-popup").close());
$("orders-popup").addEventListener("click", (event) => {
  if (event.target === $("orders-popup")) $("orders-popup").close();
});
$("tab-mine").addEventListener("click", () => { ordersTab = "mine"; renderOrders(); });
$("tab-all").addEventListener("click", () => { ordersTab = "all"; renderOrders(); });

renderTabs();
renderItems();
renderBar();
renderOrdersButton();

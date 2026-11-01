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
const rupees = (n) => "₹" + n;

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
  $("pay-amount").textContent = rupees(total);
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
  $("menu-screen").hidden = true;
  $("pay-screen").hidden = false;
  window.scrollTo(0, 0);
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
$("new-order").addEventListener("click", () => {
  cart.clear();
  activeTab = 0;
  renderTabs();
  renderItems();
  renderBar();
  showMenu();
});

renderTabs();
renderItems();
renderBar();

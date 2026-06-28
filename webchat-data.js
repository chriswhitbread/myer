/* Mock data for the Myer future-state webchat demo (no backend) */
window.MyerWebchat = (function () {
  const orders = {
    M1000001: { orderNumber: "M1000001", email: "jane@email.com", mobile: "0412 345 789", postcode: "3000", scenario: "A1", customerName: "Jane",
      data: { parts: [
        { item: "Country Road Wool Jacket", carrier: "Australia Post", status: "Out for delivery today", track: "#" },
        { item: "2 × Sheridan Homewares", carrier: "Australia Post", status: "Tracking for Thursday", track: "#" }
      ] } },
    M1000002: { orderNumber: "M1000002", email: "sam@email.com", mobile: "0423 111 222", postcode: "2000", scenario: "A2", customerName: "Sam",
      data: { carrier: "Couriers Please", status: "In transit", eta: "tomorrow", track: "#" } },
    M1000003: { orderNumber: "M1000003", email: "alex@email.com", mobile: "0433 222 333", postcode: "4000", scenario: "A3", customerName: "Alex",
      data: { status: "Delivered (disputed)" } },
    // M1000004 intentionally absent → ghost order (A4)
    M1000005: { orderNumber: "M1000005", email: "lee@email.com", mobile: "0444 333 444", postcode: "5000", scenario: "A5", customerName: "Lee",
      data: { location: "Your local post office", slip: "#" } },
    M2000001: { orderNumber: "M2000001", email: "priya@email.com", mobile: "0455 444 555", postcode: "3121", scenario: "B1", customerName: "Priya",
      data: { item: "Trenery Linen Top" } },
    M2000002: { orderNumber: "M2000002", email: "chris@email.com", mobile: "0466 555 666", postcode: "3141", scenario: "B2", customerName: "Chris",
      data: { item: "Nike Air Max Shoes" } },
    M2000003: { orderNumber: "M2000003", email: "mia@email.com", mobile: "0477 666 777", postcode: "3148", scenario: "B3", customerName: "Mia",
      data: { orderedOn: "12 May 2026", total: "$387.45", store: "Myer Chadstone",
        lineItems: [
          { product: "Trenery Suede Loafer", colour: "Tan", size: "8", price: "$199.95", thumb: "#c9a16b", img: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=400", keywords: ["loafer", "loafers", "shoe", "shoes", "suede", "trenery"], currentSize: "8", wantSize: "9" },
          { product: "Country Road Crew Knit", colour: "Oatmeal", size: "M", price: "$129.00", thumb: "#d8cdb8", keywords: ["knit", "jumper", "sweater", "crew", "country road"] },
          { product: "Sheridan Bath Towel", colour: "Stone", size: "", price: "$58.50", thumb: "#cfd2cc", keywords: ["towel", "bath", "sheridan"] }
        ] } },
    M2000004: { orderNumber: "M2000004", email: "dan@email.com", mobile: "0488 777 888", postcode: "6000", scenario: "B4", customerName: "Dan",
      data: { item: "Royal Doulton Dinner Set" } },
    M2000005: { orderNumber: "M2000005", email: "kim@email.com", mobile: "0499 888 999", postcode: "7000", scenario: "B5", customerName: "Kim",
      data: { item: "Marketplace BBQ" } },
    // Recent orders (past 90 days) for the same customer, surfaced as pills at
    // the start of the return flow. M2000003 is the shoes the demo returns.
    M2000006: { orderNumber: "M2000006", email: "mia@email.com", mobile: "0477 666 777", postcode: "3148", scenario: "B6", customerName: "Mia",
      data: { orderedOn: "2 Jun 2026", total: "$478.00", store: "Myer Chadstone",
        lineItems: [
          { product: "Country Road Wool Coat", colour: "Charcoal", size: "12", price: "$349.00", thumb: "#5b5b63", keywords: ["coat", "wool coat", "country road", "jacket"] },
          { product: "Seed Heritage Ankle Boot", colour: "Black", size: "37", price: "$129.00", thumb: "#3a3a3a", keywords: ["boot", "boots", "ankle", "seed"] }
        ] } },
    M2000007: { orderNumber: "M2000007", email: "mia@email.com", mobile: "0477 666 777", postcode: "3148", scenario: "B7", customerName: "Mia",
      data: { orderedOn: "21 Apr 2026", total: "$164.85", store: "Myer Chadstone",
        lineItems: [
          { product: "Sheridan Cotton Towel Set", colour: "White", size: "", price: "$89.95", thumb: "#e3ded4", keywords: ["towel", "towels", "towel set", "sheridan"] },
          { product: "Maxwell & Williams Mug Set", colour: "White", size: "", price: "$74.90", thumb: "#eceae6", keywords: ["mug", "mugs", "mug set", "cups"] }
        ] } }
  };

  const inventory = [
    { product: "Trenery Suede Loafer", size: "9", store: "Myer Chadstone", inStock: true },
    { product: "Trenery Suede Loafer", size: "9", store: "Myer Southland", inStock: true },
    { product: "Trenery Suede Loafer", size: "8", store: "Myer Chadstone", inStock: false }
  ];

  function maskEmail(email) {
    const [user, domain] = String(email).split("@");
    if (!domain) return email;
    return user.slice(0, 1) + "****@" + domain;
  }
  function maskMobile(mobile) {
    const digits = String(mobile).replace(/\s+/g, "");
    return "04** *** " + digits.slice(-3);
  }
  function lookupOrder(orderNumber) {
    return orders[String(orderNumber).trim().toUpperCase()] || null;
  }
  function checkInventory(product, size, store) {
    return inventory.some((i) => i.product === product && i.size === size && i.store === store && i.inStock);
  }
  // Fuzzy-match a free-text product description against the line items in an
  // order. Tries product-name substring first, then each item's keywords.
  // Falls back to the first line item so the demo always proceeds.
  function findLineItem(order, text) {
    const items = (order && order.data && order.data.lineItems) || [];
    if (!items.length) return null;
    const t = String(text || "").trim().toLowerCase();
    if (!t) return items[0];
    const byName = items.find((i) => {
      const name = i.product.toLowerCase();
      return name.includes(t) || t.includes(name);
    });
    if (byName) return byName;
    const byKeyword = items.find((i) => (i.keywords || []).some((k) => t.includes(k)));
    return byKeyword || items[0];
  }
  // Short product summary for an order, e.g. "Trenery Suede Loafer, Country Road
  // Crew Knit + 1 more". Used as the description line under an order pill.
  function orderSummary(order) {
    const items = (order && order.data && order.data.lineItems) || [];
    if (!items.length) return "";
    const names = items.map((i) => i.product);
    if (names.length <= 2) return names.join(", ");
    return names.slice(0, 2).join(", ") + " + " + (names.length - 2) + " more";
  }
  // Search every order belonging to a customer (matched by email) for a line
  // item matching free text. Returns { order, item } or null. Lets a user say
  // "tan shoes" without first picking which order it was in.
  function findItemAcrossOrders(email, text) {
    const t = String(text || "").trim().toLowerCase();
    if (!t) return null;
    const mine = Object.values(orders).filter(
      (o) => o.email && email && o.email.toLowerCase() === String(email).toLowerCase() &&
        o.data && o.data.lineItems
    );
    let fallback = null;
    for (const o of mine) {
      for (const i of o.data.lineItems) {
        const hay = (i.product + " " + (i.colour || "") + " " + (i.keywords || []).join(" ")).toLowerCase();
        const words = t.split(/\s+/).filter((w) => w.length > 2);
        // Strong match: every meaningful word in the query appears in the item.
        if (words.length && words.every((w) => hay.includes(w))) return { order: o, item: i };
        // Weak match: any keyword or the product name appears; keep as fallback.
        if (!fallback && ((i.keywords || []).some((k) => t.includes(k)) || t.includes(i.product.toLowerCase()))) {
          fallback = { order: o, item: i };
        }
      }
    }
    return fallback;
  }

  return { orders, inventory, maskEmail, maskMobile, lookupOrder, checkInventory, findLineItem, orderSummary, findItemAcrossOrders };
})();

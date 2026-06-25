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
      data: { product: "Seed Linen Dress", currentSize: "10", wantSize: "12", store: "Myer Chadstone" } },
    M2000004: { orderNumber: "M2000004", email: "dan@email.com", mobile: "0488 777 888", postcode: "6000", scenario: "B4", customerName: "Dan",
      data: { item: "Royal Doulton Dinner Set" } },
    M2000005: { orderNumber: "M2000005", email: "kim@email.com", mobile: "0499 888 999", postcode: "7000", scenario: "B5", customerName: "Kim",
      data: { item: "Marketplace BBQ" } }
  };

  const inventory = [
    { product: "Seed Linen Dress", size: "12", store: "Myer Chadstone", inStock: true },
    { product: "Seed Linen Dress", size: "14", store: "Myer Chadstone", inStock: false }
  ];

  /* ------------------------------------------------------------------
     Customer accounts keyed by email. Drives the email-first return
     flow: look up recent (delivered, returnable) orders + anything
     still in flight, let the shopper pick a product to return, then
     offer a size-up exchange with nearest in-stock store.
     ------------------------------------------------------------------ */
  const customers = {
    "chris@email.com": {
      name: "Chris",
      email: "chris@email.com",
      mobile: "0466 555 666",
      recent: [
        {
          id: "MYR-89421", product: "Seed Linen Dress", variant: "Navy", size: "10",
          price: 129.95, placed: "Placed 14 Jun", delivered: "Delivered 18 Jun",
          thumb: "#cdbfe0", returnable: true, apparel: true, sizeUp: "12",
          stores: [
            { name: "Myer Chadstone", km: 3.1, inStock: true },
            { name: "Myer Highpoint", km: 8.4, inStock: true },
            { name: "Myer Doncaster", km: 11.0, inStock: true }
          ]
        },
        {
          id: "MYR-89107", product: "Country Road Wool Coat", variant: "Camel", size: "M",
          price: 249.00, placed: "Placed 8 Jun", delivered: "Delivered 12 Jun",
          thumb: "#c9b89a", returnable: true, apparel: true, sizeUp: "L",
          stores: [
            { name: "Myer Chadstone", km: 3.1, inStock: true },
            { name: "Myer City (Bourke St)", km: 9.0, inStock: false }
          ]
        },
        {
          id: "MYR-88934", product: "Nike Air Max 90", variant: "White", size: "US 9",
          price: 180.00, placed: "Placed 1 Jun", delivered: "Delivered 5 Jun",
          thumb: "#dfe3e8", returnable: true, apparel: true, sizeUp: "US 10",
          stores: [
            { name: "Myer Chadstone", km: 3.1, inStock: false },
            { name: "Myer Highpoint", km: 8.4, inStock: true }
          ]
        }
      ],
      inflight: [
        { id: "MYR-90233", product: "2 × Sheridan Bath Towels", carrier: "Australia Post", status: "Out for delivery today", thumb: "#bcd3c8" },
        { id: "MYR-90118", product: "Dyson Airwrap Styler", carrier: "Couriers Please", status: "In transit — arriving Thu", thumb: "#e6d2da" }
      ]
    }
  };

  function lookupCustomer(email) {
    const key = String(email).trim().toLowerCase();
    // Demo: match a real record, otherwise fall back to the demo customer so
    // the email-first return flow always has orders to work with.
    return customers[key] || customers["chris@email.com"];
  }
  // Nearest store that has the size-up in stock, or null.
  function nearestInStock(item) {
    if (!item || !item.stores) return null;
    return item.stores.filter((s) => s.inStock).sort((a, b) => a.km - b.km)[0] || null;
  }

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

  return { orders, inventory, customers, maskEmail, maskMobile, lookupOrder, checkInventory, lookupCustomer, nearestInStock };
})();

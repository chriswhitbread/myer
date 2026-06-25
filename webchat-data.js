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
     flow: confirm by code, list the orders from the last month, let
     the shopper pick an order, then return the whole order or pick a
     line item — with a size-up exchange offer (nearest in-stock store).
     Each order carries 2-3 line items.
     ------------------------------------------------------------------ */
  const customers = {
    "chris@email.com": {
      name: "Chris",
      email: "chris@email.com",
      mobile: "0466 555 651", // masks to a phone ending 51
      orders: [
        {
          id: "MYR-89107", placed: "14 Jun", delivered: "Delivered 18 Jun",
          items: [
            { product: "Nike Air Max 90", variant: "White", size: "US 9", price: 180.00,
              thumb: "#dfe3e8", apparel: true, sizeUp: "US 10",
              stores: [
                { name: "Myer Chadstone", km: 3.1, inStock: true },
                { name: "Myer Highpoint", km: 8.4, inStock: true }
              ] },
            { product: "Country Road Wool Coat", variant: "Camel", size: "M", price: 249.00,
              thumb: "#c9b89a", apparel: true, sizeUp: "L",
              stores: [{ name: "Myer Chadstone", km: 3.1, inStock: true }] },
            { product: "Bonds Socks 3-pack", variant: "Black", size: "One size", price: 24.95,
              thumb: "#cfd3d8", apparel: false }
          ]
        },
        {
          id: "MYR-88934", placed: "8 Jun", delivered: "Delivered 12 Jun",
          items: [
            { product: "Seed Linen Dress", variant: "Navy", size: "10", price: 129.95,
              thumb: "#cdbfe0", apparel: true, sizeUp: "12",
              stores: [
                { name: "Myer Chadstone", km: 3.1, inStock: true },
                { name: "Myer Highpoint", km: 8.4, inStock: true },
                { name: "Myer Doncaster", km: 11.0, inStock: true }
              ] },
            { product: "Trenery Linen Top", variant: "White", size: "S", price: 89.95,
              thumb: "#e8e2d6", apparel: true, sizeUp: "M",
              stores: [
                { name: "Myer Chadstone", km: 3.1, inStock: false },
                { name: "Myer Highpoint", km: 8.4, inStock: true }
              ] }
          ]
        },
        {
          id: "MYR-88502", placed: "1 Jun", delivered: "Delivered 5 Jun",
          items: [
            { product: "Sheridan Bath Towels", variant: "Sand", size: "2-pack", price: 79.95,
              thumb: "#bcd3c8", apparel: false },
            { product: "Dyson Airwrap Styler", variant: "Nickel", size: "—", price: 549.00,
              thumb: "#e6d2da", apparel: false }
          ]
        }
      ]
    }
  };

  function lookupCustomer(email) {
    const key = String(email).trim().toLowerCase();
    // Demo: match a real record, otherwise fall back to the demo customer so
    // the email-first return flow always has orders to work with.
    return customers[key] || customers["chris@email.com"];
  }
  // Total value of an order (sum of its line items).
  function orderTotal(order) {
    return (order.items || []).reduce((sum, it) => sum + it.price, 0);
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

  return { orders, inventory, customers, maskEmail, maskMobile, lookupOrder, checkInventory, lookupCustomer, orderTotal, nearestInStock };
})();

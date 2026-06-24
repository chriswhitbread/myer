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

  return { orders, inventory, maskEmail, maskMobile, lookupOrder, checkInventory };
})();

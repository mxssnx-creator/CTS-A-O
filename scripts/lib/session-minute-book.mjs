/**
 * Lookup cache for a report book whose allocations and order fields are fixed.
 * This does not combine orders or change the order/arithmetic of minute sums.
 */
export function createMinuteBookCache(orders, { keyOf, unitOf, priceOf }) {
  const orderValues = new WeakMap();
  for (const order of orders) {
    if (orderValues.has(order)) continue;
    const key = keyOf(order);
    orderValues.set(order, Object.freeze({
      key,
      unit: unitOf(order, key),
      volume: order.vol ?? 1,
      positionKey: `${order.sym}|${order.side}`,
    }));
  }
  let minute, started = false;
  const prices = new Map();
  return Object.freeze({
    order(order) {
      const value = orderValues.get(order);
      if (!value) throw new Error("Minute book order was not prepared");
      return value;
    },
    price(symbol, t) {
      if (!started || !Object.is(t, minute)) {
        prices.clear(); minute = t; started = true;
      }
      // A missing price remains missing for every order: zero/null/undefined
      // must not be mistaken for a cache miss or remove an order's counter.
      if (!prices.has(symbol)) prices.set(symbol, priceOf(symbol, t));
      return prices.get(symbol);
    },
  });
}

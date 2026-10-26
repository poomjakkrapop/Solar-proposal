import type { Customer, Proposal } from "./workspace.ts";

// ID-linked proposals stay linked after a rename. Only older proposals without
// an ID use the same trimmed, case-insensitive name match as customerStats.
export function summarizeCustomers(
  customers: Customer[],
  proposals: Proposal[],
): Customer[] {
  const result = customers.map((customer) => ({
    ...customer,
    count: 0,
    value: 0,
  }));
  const byId = new Map<string, Customer[]>();
  const byName = new Map<string, Customer[]>();
  const index = (
    map: Map<string, Customer[]>,
    key: string,
    customer: Customer,
  ) => {
    const matches = map.get(key);
    if (matches) matches.push(customer);
    else map.set(key, [customer]);
  };
  for (const customer of result) {
    index(byId, customer.id, customer);
    index(byName, customer.name.trim().toLocaleLowerCase(), customer);
  }
  for (const proposal of proposals) {
    const matches = proposal.customerId
      ? byId.get(proposal.customerId)
      : byName.get(proposal.customer.trim().toLocaleLowerCase());
    if (!matches) continue;
    for (const customer of matches) {
      customer.count += 1;
      // Keep the original proposal order, including its exact numeric sum.
      customer.value += proposal.amount;
    }
  }
  return result;
}

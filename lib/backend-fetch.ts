/** Keep provider outages from holding server renders and mutations indefinitely. */
export const backendFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    signal: init?.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(12000)])
      : AbortSignal.timeout(12000),
  });

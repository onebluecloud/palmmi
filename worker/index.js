const TARGET_ORIGIN = "https://palmmi.pages.dev";

export default {
  async fetch(request) {
    const incomingUrl = new URL(request.url);
    const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, TARGET_ORIGIN);
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("authorization");

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    return fetch(targetUrl, init);
  },
};

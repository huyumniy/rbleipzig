// common “fetch + parse” helper
const doFetch = async (url, fetchOpts) => {
  let response,
    text = null,
    json = null,
    error = null;

  try {
    response = await fetch(url, fetchOpts);
    text = await response.text();

    try {
      json = JSON.parse(text);
    } catch {
      // not JSON or empty
    }

    if (!response.ok) {
      error = new Error(`HTTP ${response.status} ${response.statusText}`);
    }
  } catch (fetchErr) {
    error = fetchErr;
  }

  return {
    status: response?.status ?? null,
    text,
    json,
    error,
  };
};

// GET request
export const getData = async (url, options = {}) => {
  return doFetch(url, {
    ...options,
    method: "GET",
    headers: {
        ...options.headers,
        'x-secutix-secretkey': 'DUMMY',
        'x-secutix-host': 'tickets.rbleipzig.com',
    }
  });
};

// POST request
export const sendData = async (url, payload, options = {}) => {
  return doFetch(url, {
    ...options,
    method: "POST",
    body: payload,
    headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'x-secutix-secretkey': 'DUMMY',
        'x-secutix-host': 'tickets.rbleipzig.com',
    },
  });
};
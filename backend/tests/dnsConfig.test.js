import test from "node:test";
import assert from "node:assert/strict";
import { configureDnsServers, parseDnsServers } from "../config/dnsConfig.js";

test("configures both DNS servers from a comma-separated value", () => {
  const configured = [];
  const servers = configureDnsServers("8.8.8.8,1.1.1.1", {
    setServers: (value) => configured.push(value),
  });

  assert.deepEqual(servers, ["8.8.8.8", "1.1.1.1"]);
  assert.deepEqual(configured, [["8.8.8.8", "1.1.1.1"]]);
});

test("trims whitespace around DNS server addresses", () => {
  assert.deepEqual(parseDnsServers("8.8.8.8, 1.1.1.1"), [
    "8.8.8.8",
    "1.1.1.1",
  ]);
});

test("does not override system DNS when the value is omitted", () => {
  let setServersCalled = false;
  const servers = configureDnsServers(undefined, {
    setServers: () => {
      setServersCalled = true;
    },
  });

  assert.deepEqual(servers, []);
  assert.equal(setServersCalled, false);
});

test("does not override system DNS for an empty or whitespace-only value", () => {
  for (const value of ["", "   ", " , , "]) {
    let setServersCalled = false;
    const servers = configureDnsServers(value, {
      setServers: () => {
        setServersCalled = true;
      },
    });

    assert.deepEqual(servers, []);
    assert.equal(setServersCalled, false);
  }
});

test("ignores malformed entries without throwing or discarding valid servers", () => {
  const configured = [];
  const servers = configureDnsServers("not-an-ip, 8.8.8.8,999.999.999.999", {
    setServers: (value) => configured.push(value),
  });

  assert.deepEqual(servers, ["8.8.8.8"]);
  assert.deepEqual(configured, [["8.8.8.8"]]);
});

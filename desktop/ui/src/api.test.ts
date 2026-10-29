import { describe, expect, it } from "vitest";
import {
  applyServiceAction,
  checkPort,
  isDesktopRuntime,
  listProcesses,
  listServices,
  resolveHost,
  systemSnapshot,
} from "./api";

describe("browser mock contract", () => {
  it("detects the non-Tauri runtime", () => {
    expect(isDesktopRuntime).toBe(false);
  });

  it("returns the same snapshot shape as the Rust command", async () => {
    const snapshot = await systemSnapshot();
    expect(snapshot.hostname).toBe("OPS-WS-042");
    expect(snapshot.memoryTotal).toBeGreaterThan(snapshot.memoryUsed);
    expect(snapshot.disks.length).toBeGreaterThan(0);
    expect(snapshot.perCoreUsage.length).toBe(snapshot.logicalCores);
  });

  it("returns process and service collections", async () => {
    const processes = await listProcesses();
    const services = await listServices();

    expect(processes.length).toBeGreaterThan(0);
    expect(processes[0]).toHaveProperty("pid");
    expect(processes[0]).toHaveProperty("cpuUsage");
    expect(services.some((service) => service.status === "running")).toBe(true);
  });

  it("applies a service action in the mock store", async () => {
    const updated = await applyServiceAction("Dnscache", "stop");
    expect(updated.status).toBe("stopped");
  });

  it("returns port and DNS diagnostics", async () => {
    const port = await checkPort("127.0.0.1", 443);
    expect(port.open).toBe(true);
    expect(port.latencyMs).toBeGreaterThan(0);

    const dns = await resolveHost("github.com");
    expect(dns.addresses.length).toBeGreaterThan(0);
    expect(dns.error).toBeNull();
  });
});

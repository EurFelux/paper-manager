import { request } from "node:http";

const HYBRID_BACKEND_URL = "http://localhost:5002";
const HYBRID_PROBE_TIMEOUT_MS = 1500;

/** Check if the opendataloader hybrid backend is reachable at localhost:5002. */
export function isHybridBackendAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = request(
      HYBRID_BACKEND_URL,
      { method: "GET", timeout: HYBRID_PROBE_TIMEOUT_MS },
      (res) => {
        // Any response means the server is running
        res.resume();
        resolve(true);
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

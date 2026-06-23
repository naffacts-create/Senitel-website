import tls from "node:tls";

export type SslResult = {
  /** Certificate "not after" date, or null if it could not be read. */
  expiresAt: Date | null;
  error?: string;
};

/**
 * Opens a TLS connection and reads the leaf certificate's expiry.
 * Runs on the Node runtime only (uses node:tls), never Edge.
 */
export function checkSsl(
  hostname: string,
  port = 443,
  timeoutMs = 10_000,
): Promise<SslResult> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (r: SslResult) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };

    const socket = tls.connect(
      { host: hostname, port, servername: hostname, timeout: timeoutMs },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        if (!cert || !cert.valid_to) {
          done({ expiresAt: null, error: "No certificate presented" });
          return;
        }
        const expiresAt = new Date(cert.valid_to);
        if (Number.isNaN(expiresAt.getTime())) {
          done({ expiresAt: null, error: `Unparseable cert date: ${cert.valid_to}` });
          return;
        }
        done({ expiresAt });
      },
    );

    socket.on("error", (err: Error) => done({ expiresAt: null, error: err.message }));
    socket.on("timeout", () => {
      socket.destroy();
      done({ expiresAt: null, error: "TLS connection timed out" });
    });
  });
}

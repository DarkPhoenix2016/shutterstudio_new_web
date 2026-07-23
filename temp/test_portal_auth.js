const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Load .env.local variables manually
try {
  const envPath = path.join(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (match) {
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[match[1]] = val;
      }
    });
  }
} catch (e) {
  console.log("Could not load .env.local helper:", e.message);
}

// Setup key derived from the exact same secret used by the Next.js server
const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = crypto.createHash("sha256").update(
  process.env.TEXT_LK_API_TOKEN || "shutterstudio-portal-default-secret-key-2026"
).digest();

function decrypt(encryptedText) {
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 2) return null;
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    return null;
  }
}

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      "Content-Type": "application/json",
    };
    const reqOptions = {
      method: options.method || "GET",
      headers: { ...defaultHeaders, ...options.headers },
    };
    
    const req = http.request(url, reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
          });
        }
      });
    });
    
    req.on("error", reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTest() {
  const PORT = 3000;
  const baseUrl = `http://localhost:${PORT}`;
  const testPhone = "+94761806162";
  const studioId = "STU_ef48a2";

  console.log("=== STARTING CLIENT PORTAL END-TO-END VERIFICATION ===");
  console.log(`Target: ${baseUrl}`);
  console.log(`Phone: ${testPhone}`);
  console.log(`Studio ID: ${studioId}\n`);

  // 1. Request OTP
  console.log("Step 1: Requesting OTP via /api/client-portal/auth...");
  const authRes = await fetchJson(`${baseUrl}/api/client-portal/auth`, {
    method: "POST",
    body: { studioId, phone: testPhone },
  });

  if (authRes.status !== 200 || !authRes.body.success) {
    console.error("FAIL: OTP request failed:", authRes.body);
    process.exit(1);
  }

  const otpToken = authRes.body.otpToken;
  console.log("SUCCESS: OTP token received:", otpToken);

  // 2. Decrypt the OTP token to extract the code
  console.log("\nStep 2: Decrypting OTP token locally to bypass sending physical SMS...");
  const decrypted = decrypt(otpToken);
  if (!decrypted) {
    console.error("FAIL: Decryption returned null");
    process.exit(1);
  }

  const [phone, expiresStr, otpCode] = decrypted.split("|");
  console.log(`SUCCESS: Decrypted elements -> Phone: ${phone}, OTP Code: ${otpCode}`);

  // 3. Verify OTP
  console.log("\nStep 3: Verification call /api/client-portal/verify...");
  const verifyRes = await fetchJson(`${baseUrl}/api/client-portal/verify`, {
    method: "POST",
    body: { studioId, phone: testPhone, code: otpCode, otpToken },
  });

  if (verifyRes.status !== 200 || !verifyRes.body.success) {
    console.error("FAIL: Verification failed:", verifyRes.body);
    process.exit(1);
  }

  const sessionToken = verifyRes.body.sessionToken;
  console.log("SUCCESS: Session token generated:", sessionToken);

  // 4. Retrieve Events using Session token
  console.log("\nStep 4: Retrieve client events via /api/client-portal/events...");
  const eventsUrl = `${baseUrl}/api/client-portal/events?studioId=${studioId}&sessionToken=${sessionToken}`;
  const eventsRes = await fetchJson(eventsUrl);

  if (eventsRes.status !== 200 || !eventsRes.body.success) {
    console.error("FAIL: Querying events failed:", eventsRes.body);
    process.exit(1);
  }

  console.log(`SUCCESS: Received ${eventsRes.body.events.length} events!`);
  console.log("Studio Branding info:", JSON.stringify(eventsRes.body.studio, null, 2));
  
  if (eventsRes.body.events.length > 0) {
    console.log("\n--- Sample Event Returned ---");
    const e = eventsRes.body.events[0];
    console.log(`Event ID: ${e.id}`);
    console.log(`Event Name: ${e.coupleName}`);
    console.log(`Customer Mobile: ${e.customerMobile}`);
    console.log(`Inquiry Date: ${e.inquiryDate}`);
  }

  console.log("\n=== CONGRATULATIONS! ALL TESTS PASSED SUCCESSFULLY ===");
}

runTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

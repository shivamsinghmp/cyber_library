const crypto = require("crypto");
const { PrismaClient } = require('@prisma/client');
require("dotenv").config();

const ALGORITHM = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 16;
const TAG_LEN = 16;

function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  return crypto.scryptSync(secret, "razorpay-salt", KEY_LEN);
}

function decrypt(encrypted, iv) {
  const key = getEncryptionKey();
  const ivBuf = Buffer.from(iv, "base64url");
  const combined = Buffer.from(encrypted, "base64url");
  const tag = combined.subarray(-TAG_LEN);
  const enc = combined.subarray(0, -TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuf);
  decipher.setAuthTag(tag);
  return decipher.update(enc) + decipher.final("utf8");
}

const prisma = new PrismaClient();
prisma.razorpaySetting.findFirst().then(async row => {
    if(row) {
        const keyId = row.keyId.trim();
        const keySecret = decrypt(row.keySecretEncrypted, row.iv);
        
        console.log("Got Keys:", keyId);
        
        const res = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64"),
          },
          body: JSON.stringify({
            amount: 1000,
            currency: "INR",
            receipt: "rcpt_test",
          }),
        });

        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Response:", text);
    }
}).finally(() => process.exit(0));

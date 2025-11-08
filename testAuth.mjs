// testAuth.mjs
// A quick script to test your /api/auth endpoint from Node.js

const API_URL = "http://localhost:9002/api/auth";

async function testLogin() {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.com",
        password: "admin123"
      })
    });

    const data = await response.json();
    console.log("✅ Response:", data);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

testLogin();

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const admin = require("firebase-admin");
const { PrismaClient } = require("@prisma/client");

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// ---------------- Firebase Setup ----------------
admin.initializeApp({
  credential: admin.credential.cert({
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
  }),
  databaseURL: process.env.FIREBASE_DB_URL,
});




const db = admin.database();

// ---------------- Utility ----------------
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ---------------- Prisma APIs ----------------

// Get consumption data
app.get("/api/consumption", async (req, res) => {
  try {
    const data = await prisma.consumption.findMany({
      orderBy: { id: "asc" },
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ---------------- Firebase Device Control ----------------

// Get all devices
app.get("/devices", async (req, res) => {
  try {
    const snapshot = await db.ref("devices").once("value");
    res.json(snapshot.val() || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific device
app.get("/devices/:lightId", async (req, res) => {
  const lightId = req.params.lightId;
  try {
    const snapshot = await db.ref(`devices/${lightId}`).once("value");
    res.json({ [lightId]: snapshot.val() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle specific device
app.post("/devices/:lightId/toggle", async (req, res) => {
  const lightId = req.params.lightId;
  const { state } = req.body;

  if (!["ON", "OFF"].includes(state)) {
    return res.status(400).json({ error: "Invalid state, use ON or OFF" });
  }

  try {
    await db.ref(`devices/${lightId}`).set(state);
    res.json({ success: true, lightId, state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle all devices
app.post("/devices/toggleAll", async (req, res) => {
  const { state } = req.body;

  if (!["ON", "OFF"].includes(state)) {
    return res.status(400).json({ error: "Invalid state, use ON or OFF" });
  }

  try {
    const devicesSnapshot = await db.ref("devices").once("value");
    const devices = devicesSnapshot.val();

    const updates = {};
    Object.keys(devices).forEach((light) => {
      updates[light] = state;
    });

    await db.ref("devices").update(updates);
    res.json({ success: true, state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- Authentication APIs ----------------

// Send OTP
app.post("/auth/send-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone number is required" });

  try {
    const otp = generateOtp();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    let user = await prisma.user.findUnique({ where: { phoneNumber: phone } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          fullName: "User",
          email: `${crypto.randomBytes(4).toString("hex")}@example.com`,
          password: await bcrypt.hash("defaultpassword", 10),
          phoneNumber: phone,
          otp,
          otpExpiry: expiry,
        },
      });
    } else {
      await prisma.user.update({
        where: { phoneNumber: phone },
        data: { otp, otpExpiry: expiry },
      });
    }

    console.log(`OTP for ${phone}: ${otp}`); // 🔹 remove in production
    res.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error while sending OTP" });
  }
});

// Verify OTP
app.post("/auth/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: "Phone and OTP are required" });

  try {
    const user = await prisma.user.findUnique({ where: { phoneNumber: phone } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.otp !== otp) return res.status(401).json({ error: "Invalid OTP" });
    if (new Date() > user.otpExpiry) return res.status(401).json({ error: "OTP expired" });

    await prisma.user.update({
      where: { phoneNumber: phone },
      data: { otp: null, otpExpiry: null },
    });

    res.json({
      success: true,
      message: "OTP verified successfully",
      user: { id: user.id, phoneNumber: user.phoneNumber },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error while verifying OTP" });
  }
});

// Register
app.post("/register", async (req, res) => {
  const { fullName, email, password, phoneNumber } = req.body;

  if (!fullName || !email || !password || !phoneNumber) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { fullName, email, password: hashedPassword, phoneNumber },
    });

    res.json({
      message: "User registered successfully",
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Email or phone number already in use" });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    res.json({ message: "Login successful", user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// Profile
app.post("/profile", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, fullName: true, phoneNumber: true, createdAt: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "Profile fetched successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error fetching profile" });
  }
});

// ---------------- Energy recommendations API ----------------

// GET /api/recommendations
app.get("/api/recommendations", async (req, res) => {
  try {
    // Adjust the path to match your database structure
    const snapshot = await db.ref("ac_data/recommendations").once("value");

    // snapshot.val() will be an array (or object) depending on your DB
    const recommendations = snapshot.val();

    if (!recommendations) {
      return res.status(404).json({ error: "No recommendations found" });
    }

    res.json({ recommendations });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({ error: "Server error while fetching recommendations" });
  }
});

// ---------------- Forecasting API ----------------

// GET /api/forecast
app.get("/api/forecast", async (req, res) => {
  try {
    // fetch the single value from the path ac_data/predicted_next_month_kwh
    const snapshot = await db.ref("ac_data/predicted_next_month_kwh").once("value");
    const forecastValue = snapshot.val();

    if (forecastValue == null) {
      return res.status(404).json({ error: "No forecast value found" });
    }

    res.json({
      success: true,
      predicted_next_month_kwh: forecastValue
    });
  } catch (err) {
    console.error("Error fetching forecast:", err);
    res.status(500).json({ error: "Server error while fetching forecast" });
  }
});

// GET /api/dashboard-data
app.get("/api/dashboard-data", async (req, res) => {
  try {
    const monthlySnap = await db.ref("ac_data/monthly_consumption_kwh").once("value");
    const forecastSnap = await db.ref("ac_data/predicted_next_month_kwh").once("value");

    const monthly = monthlySnap.val();
    const forecast = forecastSnap.val();

    if (!monthly) {
      return res.status(404).json({ error: "No monthly data found" });
    }

    res.json({
      success: true,
      monthly_consumption_kwh: monthly,
      predicted_next_month_kwh: forecast
    });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).json({ error: "Server error while fetching dashboard data" });
  }
});

app.get("/api/alerts", async (req, res) => {
  try {
    const snapshot = await admin.database().ref("alerts").once("value");
    const data = snapshot.val() || {};

    // Convert object -> array of {id, ...fields}
    const alerts = Object.entries(data).map(([id, value]) => ({
      id,     // <-- alert_20250913_004730_zoneb
      ...value,
    }));

    res.json({ alerts });
  } catch (err) {
    console.error("Error fetching alerts:", err);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});


// ---------------- Start Server ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});


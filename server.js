require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "blood_donor_system",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Verify database connection
pool.getConnection()
  .then((conn) => {
    console.log("Connected to MySQL database");
    conn.release();
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });

// JWT Authentication Middleware
const authenticate = (role) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
      const [user] = await pool.query(
        `SELECT * FROM ${role}s WHERE id = ?`,
        [decoded.id]
      );
      
      if (!user.length) throw new Error();
      req.user = user[0];
      req.role = role;
      next();
    } catch (err) {
      res.status(401).json({ success: false, message: "Invalid token" });
    }
  };
};

// ======================
// DONOR ROUTES
// ======================

// Donor Registration
app.post("/api/donor/register", async (req, res) => {
  try {
    const { name, email, phone, blood_type, medical_history } = req.body;

    if (!name || !email || !phone || !blood_type) {
      return res.status(400).json({
        success: false,
        message: "Required fields: name, email, phone, blood_type"
      });
    }

    const [existing] = await pool.query(
      "SELECT id FROM donors WHERE email = ? OR phone = ?",
      [email, phone]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Donor with this email or phone already exists"
      });
    }

    const [result] = await pool.query(
      "INSERT INTO donors (name, email, phone, blood_type, medical_history) VALUES (?, ?, ?, ?, ?)",
      [name, email, phone, blood_type, medical_history || null]
    );

    const token = jwt.sign(
      { id: result.insertId, role: "donor" },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "8h" }
    );

    res.status(201).json({
      success: true,
      message: "Donor registered successfully",
      token,
      donor: { id: result.insertId, name, email, phone, blood_type }
    });
  } catch (error) {
    console.error("Donor registration error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Donor Login
app.post("/api/donor/login", async (req, res) => {
  try {
    const { email, phone } = req.body;
    
    if (!email || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and phone required" 
      });
    }

    const [donor] = await pool.query(
      "SELECT * FROM donors WHERE email = ? AND phone = ?",
      [email, phone]
    );

    if (!donor.length) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    const token = jwt.sign(
      { id: donor[0].id, role: "donor" },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "8h" }
    );

    res.json({
      success: true,
      token,
      donor: {
        id: donor[0].id,
        name: donor[0].name,
        email: donor[0].email,
        phone: donor[0].phone,
        blood_type: donor[0].blood_type
      }
    });
  } catch (error) {
    console.error("Donor login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get Donor Profile
app.get("/api/donor/profile", authenticate("donor"), async (req, res) => {
  try {
    res.json({ success: true, donor: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update Donor Profile
app.put("/api/donor/profile", authenticate("donor"), async (req, res) => {
  try {
    const { name, phone, medical_history } = req.body;
    await pool.query(
      "UPDATE donors SET name = ?, phone = ?, medical_history = ? WHERE id = ?",
      [name, phone, medical_history, req.user.id]
    );
    res.json({ success: true, message: "Profile updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

// ======================
// HOSPITAL ROUTES
// ======================

// Hospital Registration
app.post("/api/hospital/register", async (req, res) => {
  try {
    const { name, email, phone, address, contact_person } = req.body;

    if (!name || !email || !phone || !address || !contact_person) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const [existing] = await pool.query(
      "SELECT id FROM hospitals WHERE email = ? OR phone = ?",
      [email, phone]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Hospital with this email/phone exists"
      });
    }

    const [result] = await pool.query(
      "INSERT INTO hospitals (name, email, phone, address, contact_person) VALUES (?, ?, ?, ?, ?)",
      [name, email, phone, address, contact_person]
    );

    const token = jwt.sign(
      { id: result.insertId, role: "hospital" },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "8h" }
    );

    res.status(201).json({
      success: true,
      message: "Hospital registered",
      token,
      hospital: { id: result.insertId, name, email, phone, address }
    });
  } catch (error) {
    console.error("Hospital registration error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Hospital Login
app.post("/api/hospital/login", async (req, res) => {
  try {
    const { email, phone } = req.body;
    
    if (!email || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and phone required" 
      });
    }

    const [hospital] = await pool.query(
      "SELECT * FROM hospitals WHERE email = ? AND phone = ?",
      [email, phone]
    );

    if (!hospital.length) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    const token = jwt.sign(
      { id: hospital[0].id, role: "hospital" },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "8h" }
    );

    res.json({
      success: true,
      token,
      hospital: {
        id: hospital[0].id,
        name: hospital[0].name,
        email: hospital[0].email,
        phone: hospital[0].phone,
        address: hospital[0].address
      }
    });
  } catch (error) {
    console.error("Hospital login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get Hospital Profile
app.get("/api/hospital/profile", authenticate("hospital"), async (req, res) => {
  try {
    res.json({ success: true, hospital: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update Hospital Profile
app.put("/api/hospital/profile", authenticate("hospital"), async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    await pool.query(
      "UPDATE hospitals SET name = ?, phone = ?, address = ? WHERE id = ?",
      [name, phone, address, req.user.id]
    );
    res.json({ success: true, message: "Profile updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }


});
// Hospital Profile Update
app.put('/api/hospital/profile', authenticate('hospital'), async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    
    // Input validation
    if (!name || !phone || !address) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required'
      });
    }

    await pool.query(
      "UPDATE hospitals SET name = ?, phone = ?, address = ? WHERE id = ?",
      [name, phone, address, req.user.id]
    );
    
    res.json({ 
      success: true,
      message: 'Profile updated successfully',
      hospital: { name, phone, address }
    });
    
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Update failed'
    });
  }
});
// ======================
// BLOOD INVENTORY ROUTES
// ======================

// Get Blood Inventory (Hospital Auth Required)
app.get("/api/blood-inventory", authenticate("hospital"), async (req, res) => {
  try {
    const [inventory] = await pool.query(
      "SELECT blood_type, quantity, expiration_date FROM blood_inventory WHERE hospital_id = ?",
      [req.user.id]
    );
    res.json({ success: true, inventory });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ======================
// DONATION ROUTES
// ======================

// Record Donation (Hospital Auth Required)
app.post("/api/donations", authenticate("hospital"), async (req, res) => {
  try {
    const { donor_id, blood_type, quantity } = req.body;
    
    await pool.query(
      "INSERT INTO donations (hospital_id, donor_id, blood_type, quantity) VALUES (?, ?, ?, ?)",
      [req.user.id, donor_id, blood_type, quantity]
    );

    // Update inventory
    await pool.query(
      `INSERT INTO blood_inventory (hospital_id, blood_type, quantity)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
      [req.user.id, blood_type, quantity]
    );

    res.status(201).json({ success: true, message: "Donation recorded" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get Donation History (Donor Auth Required)
app.get("/api/donations", authenticate("donor"), async (req, res) => {
  try {
    const [donations] = await pool.query(
      `SELECT d.date, d.quantity, h.name AS hospital_name 
       FROM donations d
       JOIN hospitals h ON d.hospital_id = h.id
       WHERE d.donor_id = ?`,
      [req.user.id]
    );
    res.json({ success: true, donations });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
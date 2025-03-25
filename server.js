require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 3000;

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

// Test database connection
pool
  .getConnection()
  .then((conn) => {
    console.log("Connected to MySQL database");
    conn.release();
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });

// Routes

// Donor login
app.post("/api/donor/login", async (req, res) => {
  try {
    const { email, phone } = req.body;
    const [rows] = await pool.query(
      "SELECT * FROM donors WHERE email = ? AND phone = ?",
      [email, phone]
    );

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const donor = rows[0];
    res.json({ success: true, donor });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Donor registration
app.post("/api/donor/register", async (req, res) => {
  try {
    const { name, email, phone, blood_type, medical_history } = req.body;

    // Check if donor already exists
    const [existing] = await pool.query(
      "SELECT id FROM donors WHERE email = ? OR phone = ?",
      [email, phone]
    );
    if (existing.length > 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Donor with this email or phone already exists",
        });
    }

    // Insert new donor
    const [result] = await pool.query(
      "INSERT INTO donors (name, email, phone, blood_type, medical_history) VALUES (?, ?, ?, ?, ?)",
      [name, email, phone, blood_type, medical_history || null]
    );

    res.json({ success: true, donorId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin login

// Admin login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username and password are required' 
            });
        }

        // Debug log
        console.log(`Login attempt for username: ${username}`);

        const [rows] = await pool.query(
            'SELECT * FROM admins WHERE username = ?', 
            [username]
        );
        
        if (rows.length === 0) {
            console.log('No admin found with that username');
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }
        
        const admin = rows[0];
        console.log('Found admin:', admin);

        // For testing - compare plain text if bcrypt isn't working
        // if (password !== admin.password) {
        //     return res.status(401).json({ success: false, message: 'Invalid credentials' });
        // }

        // Proper bcrypt comparison
        const passwordMatch = await bcrypt.compare(password, admin.password);
        
        if (!passwordMatch) {
            console.log('Password does not match');
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }
        
        console.log('Login successful');
        res.json({ 
            success: true,
            admin: {
                id: admin.id,
                username: admin.username
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during login' 
        });
    }
});

// Get donor profile
app.get("/api/donor/:id", async (req, res) => {
  try {
    const donorId = req.params.id;
    const [rows] = await pool.query("SELECT * FROM donors WHERE id = ?", [
      donorId,
    ]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Donor not found" });
    }

    const [donations] = await pool.query(
      "SELECT * FROM donations WHERE donor_id = ? ORDER BY donation_date DESC",
      [donorId]
    );

    res.json({ success: true, donor: rows[0], donations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update donor profile
app.put("/api/donor/:id", async (req, res) => {
  try {
    const donorId = req.params.id;
    const { name, phone, medical_history } = req.body;

    await pool.query(
      "UPDATE donors SET name = ?, phone = ?, medical_history = ? WHERE id = ?",
      [name, phone, medical_history || null, donorId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin: Get all donors
app.get("/api/admin/donors", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM donors ORDER BY name");
    res.json({ success: true, donors: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin: Search donors
app.get("/api/admin/donors/search", async (req, res) => {
  try {
    const query = req.query.q;
    const [rows] = await pool.query(
      `
            SELECT * FROM donors 
            WHERE name LIKE ? OR email LIKE ? OR blood_type LIKE ?
            ORDER BY name
        `,
      [`%${query}%`, `%${query}%`, `%${query}%`]
    );

    res.json({ success: true, donors: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin: Update donor
app.put("/api/admin/donors/:id", async (req, res) => {
  try {
    const donorId = req.params.id;
    const { name, email, phone, blood_type, medical_history } = req.body;

    await pool.query(
      "UPDATE donors SET name = ?, email = ?, phone = ?, blood_type = ?, medical_history = ? WHERE id = ?",
      [name, email, phone, blood_type, medical_history || null, donorId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});



// test route to server.js
app.get('/api/test-bcrypt', async (req, res) => {
    const hash = await bcrypt.hash('admin123', 10);
    const match = await bcrypt.compare('admin123', hash);
    res.json({ hash, match });
});
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { execFile } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5000;

// Express Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Device-aware Route Handler for Landing Page
app.get('/', (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(ua);
  
  if (isMobile) {
    res.sendFile(path.join(__dirname, 'public', 'mobile.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'desktop.html'));
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// Connection to MongoDB (non-blocking at startup)
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('MongoDB Atlas Connected successfully at startup');
      seedData();
    })
    .catch(err => {
      console.error('MongoDB connection error at startup:', err);
    });
} else {
  console.warn('Warning: MONGODB_URI is not defined in environment variables.');
}

// ================= DATABASE SCHEMAS & MODELS =================

const AccountSchema = new mongoose.Schema({
  gmail: { type: String, required: true, unique: true },
  password: { type: String, default: '' },
  link_akses: { type: String, required: true },
  status: { type: String, enum: ['Aktif', 'Terpakai', 'Pending'], default: 'Aktif' },
  catatan_khusus: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

const Account = mongoose.model('Account', AccountSchema);

const SettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed
});

const Setting = mongoose.model('Setting', SettingSchema);

const PurchaseSchema = new mongoose.Schema({
  email: { type: String, required: true },
  ref_no: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  status: { type: String, enum: ['Pending', 'Success', 'Failed'], default: 'Pending' },
  gmail_assigned: { type: String, default: '' },
  password_assigned: { type: String, default: '' },
  link_assigned: { type: String, default: '' },
  accounts_assigned: [{
    gmail: String,
    link_akses: String
  }],
  timestamp: { type: Date, default: Date.now }
});

const Purchase = mongoose.model('Purchase', PurchaseSchema);

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// ================= DATA SEEDER =================
async function seedData() {
  try {
    // 1. Seed Accounts if empty
    const accountCount = await Account.countDocuments();
    if (accountCount === 0) {
      const initialAccounts = [
        { gmail: "rehan.premium1@gmail.com", password: "password1234", link_akses: "https://alight.link/activation1", status: "Aktif", catatan_khusus: "Durasi 1 Tahun" },
        { gmail: "fathir.alight@gmail.com", password: "fathir2026", link_akses: "https://alight.link/activation2", status: "Terpakai", catatan_khusus: "Buyer: fathir@gmail.com" },
        { gmail: "motion.pro99@gmail.com", password: "proalight99", link_akses: "https://alight.link/activation3", status: "Aktif", catatan_khusus: "Durasi 1 Bulan" },
        { gmail: "glowing.edit@gmail.com", password: "glowedit00", link_akses: "https://alight.link/activation4", status: "Pending", catatan_khusus: "Menunggu Transfer" },
        { gmail: "cc.alightx@gmail.com", password: "ccalightx", link_akses: "https://alight.link/activation5", status: "Terpakai", catatan_khusus: "Buyer: cc@gmail.com" }
      ];
      await Account.insertMany(initialAccounts);
      console.log('Seeded default Accounts data');
    }

    // 2. Seed Settings (Global Note & Steps) if empty
    const globalNoteSetting = await Setting.findOne({ key: 'global_note' });
    if (!globalNoteSetting) {
      await Setting.create({
        key: 'global_note',
        value: "Dilarang mengganti password atau mengedit informasi akun. Garansi hangus seketika jika melanggar ketentuan ini. Silakan gunakan link aktivasi di atas untuk langsung login."
      });
      console.log('Seeded default Global Note');
    }

    const loginStepsSetting = await Setting.findOne({ key: 'login_steps' });
    if (!loginStepsSetting) {
      await Setting.create({
        key: 'login_steps',
        value: [
          { id: "1", title: "Buka Aplikasi Alight Motion", description: "Pastikan Anda sudah mengunduh aplikasi Alight Motion versi terbaru dari Play Store atau App Store." },
          { id: "2", title: "Klik Link Aktivasi", description: "Buka Link Aktivasi/Akses yang kami kirim menggunakan peramban (browser) HP Anda untuk login otomatis." },
          { id: "3", title: "Selesai", description: "Masuk ke menu Profil untuk memeriksa apakah status premium Anda sudah aktif." }
        ]
      });
      console.log('Seeded default Login Steps');
    }

    // 3. Seed Purchases if empty (for the "10 Pembelian Terakhir" visual)
    // Clear legacy masked seeds if present
    await Purchase.deleteMany({ email: { $in: ["reha****@gmail.com", "fath****@gmail.com", "santi****@gmail.com", "dani****@gmail.com", "andi****@gmail.com"] } });
    
    const seededPurchasesCount = await Purchase.countDocuments({ ref_no: { $in: ["QR100001", "QR100002", "QR100003", "QR100004", "QR100005"] } });
    if (seededPurchasesCount === 0) {
      const initialPurchases = [
        { 
          email: "rehan.premium1@gmail.com", 
          ref_no: "QR100001", 
          amount: 3000, 
          status: "Success", 
          gmail_assigned: "rehan.premium1@gmail.com", 
          link_assigned: "https://alight.link/activation1",
          accounts_assigned: [{ gmail: "rehan.premium1@gmail.com", link_akses: "https://alight.link/activation1" }],
          timestamp: new Date(Date.now() - 30 * 1000) 
        },
        { 
          email: "fathir.alight@gmail.com", 
          ref_no: "QR100002", 
          amount: 3000, 
          status: "Success", 
          gmail_assigned: "fathir.alight@gmail.com", 
          link_assigned: "https://alight.link/activation2",
          accounts_assigned: [{ gmail: "fathir.alight@gmail.com", link_akses: "https://alight.link/activation2" }],
          timestamp: new Date(Date.now() - 180 * 1000) 
        },
        { 
          email: "motion.pro99@gmail.com", 
          ref_no: "QR100003", 
          amount: 3000, 
          status: "Success", 
          gmail_assigned: "motion.pro99@gmail.com", 
          link_assigned: "https://alight.link/activation3",
          accounts_assigned: [{ gmail: "motion.pro99@gmail.com", link_akses: "https://alight.link/activation3" }],
          timestamp: new Date(Date.now() - 420 * 1000) 
        },
        { 
          email: "glowing.edit@gmail.com", 
          ref_no: "QR100004", 
          amount: 3000, 
          status: "Success", 
          gmail_assigned: "glowing.edit@gmail.com", 
          link_assigned: "https://alight.link/activation4",
          accounts_assigned: [{ gmail: "glowing.edit@gmail.com", link_akses: "https://alight.link/activation4" }],
          timestamp: new Date(Date.now() - 720 * 1000) 
        },
        { 
          email: "cc.alightx@gmail.com", 
          ref_no: "QR100005", 
          amount: 3000, 
          status: "Success", 
          gmail_assigned: "cc.alightx@gmail.com", 
          link_assigned: "https://alight.link/activation5",
          accounts_assigned: [{ gmail: "cc.alightx@gmail.com", link_akses: "https://alight.link/activation5" }],
          timestamp: new Date(Date.now() - 1080 * 1000) 
        }
      ];
      await Purchase.insertMany(initialPurchases);
      console.log('Seeded default Purchases log');
    }
  } catch (err) {
    console.error('Error seeding data:', err);
  }
}

// ================= API ENDPOINTS =================

// Hashing Helpers using Node.js native crypto
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  try {
    const [salt, hash] = storedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  } catch (err) {
    return false;
  }
}

// Custom JWT Helpers using crypto
function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const stringifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = process.env.JWT_SECRET || 'ryuzosecretkey123';
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${stringifiedPayload}`).digest('base64url');
  return `${header}.${stringifiedPayload}.${signature}`;
}

function verifyToken(token) {
  try {
    const [header, payload, signature] = token.split('.');
    const secret = process.env.JWT_SECRET || 'ryuzosecretkey123';
    const verifySig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
    if (signature !== verifySig) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch (err) {
    return null;
  }
}

// User auth middleware
const requireUserAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token tidak ditemukan, silakan login kembali.' });
  }
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Sesi habis atau token tidak valid. Silakan login kembali.' });
  }
  req.user = decoded;
  next();
};

// Middleware to authenticate admin requests using X-Admin-Key header
const requireAdminAuth = (req, res, next) => {
  const adminKey = process.env.ADMIN_KEY || 'ryuzoadmin';
  const providedKey = req.headers['x-admin-key'];
  if (providedKey === adminKey) {
    next();
  } else {
    res.status(401).json({ error: 'Akses ditolak. Silakan login kembali sebagai admin.' });
  }
};

// Middleware to ensure MongoDB connection on every API request (important for Serverless/Vercel)
app.use('/api', async (req, res, next) => {
  if (!process.env.MONGODB_URI) {
    return res.status(500).json({ error: 'Konfigurasi database MONGODB_URI tidak ditemukan di server.' });
  }
  
  if (mongoose.connection.readyState !== 1) {
    console.log('MongoDB not connected. Re-connecting on-demand...');
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected successfully on-demand');
      await seedData();
    } catch (err) {
      console.error('MongoDB connection error on-demand:', err);
      return res.status(500).json({ error: 'Gagal terhubung ke database: ' + err.message });
    }
  }
  next();
});

// Health check endpoint for deployment debugging
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    vercel: !!process.env.VERCEL,
    hasMongoUri: !!process.env.MONGODB_URI,
    mongoState: mongoose.connection.readyState,
    mongoStateLabel: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]
  });
});

// --- ACCOUNTS API ---

// Get stock count (public)
app.get('/api/accounts/stock', async (req, res) => {
  try {
    const activeCount = await Account.countDocuments({ status: 'Aktif' });
    res.json({ count: activeCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all accounts
app.get('/api/accounts', requireAdminAuth, async (req, res) => {
  try {
    const list = await Account.find().sort({ created_at: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add account
app.post('/api/accounts', requireAdminAuth, async (req, res) => {
  try {
    const { gmail, password, link_akses, status, catatan_khusus } = req.body;
    const newAcc = new Account({ gmail, password, link_akses, status, catatan_khusus });
    await newAcc.save();
    res.json(newAcc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update account
app.put('/api/accounts/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Account.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete account
app.delete('/api/accounts/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await Account.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import accounts (Bulk insert)
app.post('/api/accounts/import', requireAdminAuth, async (req, res) => {
  try {
    const { items } = req.body; // Array of accounts
    let added = [];
    for (const item of items) {
      // Avoid duplicate emails
      const exists = await Account.findOne({ gmail: item.gmail.toLowerCase() });
      if (!exists) {
        const addedAcc = await Account.create({
          gmail: item.gmail,
          password: item.password,
          link_akses: item.link_akses,
          status: 'Aktif',
          catatan_khusus: ''
        });
        added.push(addedAcc);
      }
    }
    res.json({ success: true, count: added.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- SETTINGS API ---

// Get all settings (global note, steps)
app.get('/api/settings', async (req, res) => {
  try {
    const global_note = await Setting.findOne({ key: 'global_note' });
    const login_steps = await Setting.findOne({ key: 'login_steps' });
    res.json({
      global_note: global_note ? global_note.value : '',
      login_steps: login_steps ? login_steps.value : []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save global note
app.post('/api/settings/global-note', requireAdminAuth, async (req, res) => {
  try {
    const { note } = req.body;
    const updatedSetting = await Setting.findOneAndUpdate(
      { key: 'global_note' },
      { value: note },
      { upsert: true, new: true }
    );
    res.json({ success: true, value: updatedSetting.value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save login steps
app.post('/api/settings/login-steps', requireAdminAuth, async (req, res) => {
  try {
    const { steps } = req.body;
    const updatedSetting = await Setting.findOneAndUpdate(
      { key: 'login_steps' },
      { value: steps },
      { upsert: true, new: true }
    );
    res.json({ success: true, value: updatedSetting.value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- RECENT PURCHASES LOG API ---
app.get('/api/purchases', async (req, res) => {
  try {
    const list = await Purchase.find({ status: 'Success' })
      .sort({ timestamp: -1 })
      .limit(10);
    
    // Mask email for public viewing and format output
    const maskedList = list.map(item => {
      const parts = item.email.split('@');
      let maskedEmail = parts[0];
      if (parts[0].length > 4) {
        maskedEmail = parts[0].substring(0, 4) + '****';
      } else {
        maskedEmail = parts[0].substring(0, Math.max(1, parts[0].length - 1)) + '****';
      }
      maskedEmail += '@' + parts[1];

      // Format simple relative timestamp
      const diffMs = Date.now() - new Date(item.timestamp).getTime();
      const diffMins = Math.floor(diffMs / 1000 / 60);
      let timeText = 'baru saja';
      if (diffMins > 0 && diffMins < 60) {
        timeText = `${diffMins} menit lalu`;
      } else if (diffMins >= 60) {
        const hrs = Math.floor(diffMins / 60);
        timeText = `${hrs} jam lalu`;
      }

      return { email: maskedEmail, time: timeText };
    });

    res.json(maskedList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TOP PURCHASES (LEADERBOARD) API ---
app.get('/api/purchases/top', async (req, res) => {
  try {
    const topBuyers = await Purchase.aggregate([
      { $match: { status: 'Success' } },
      { $group: {
          _id: { $toLower: "$email" },
          total_qty: { $sum: { $ifNull: [ "$quantity", 1 ] } },
          total_spent: { $sum: "$amount" }
        }
      },
      { $sort: { total_qty: -1, total_spent: -1 } },
      { $limit: 5 }
    ]);

    const formattedList = topBuyers.map(item => {
      if (!item._id || !item._id.includes('@')) {
        return { email: 'unknown****@gmail.com', count: item.total_qty };
      }
      const parts = item._id.split('@');
      let maskedEmail = parts[0];
      if (parts[0].length > 4) {
        maskedEmail = parts[0].substring(0, 4) + '****';
      } else {
        maskedEmail = parts[0].substring(0, Math.max(1, parts[0].length - 1)) + '****';
      }
      maskedEmail += '@' + (parts[1] || 'gmail.com');

      return {
        email: maskedEmail,
        count: item.total_qty
      };
    });

    res.json(formattedList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PURCHASE HISTORY API ---
app.get('/api/purchases/history', async (req, res) => {
  try {
    const { search } = req.query;
    if (!search) {
      return res.status(400).json({ error: 'Email atau Ref ID pencarian wajib diisi.' });
    }

    const queryStr = search.trim();
    
    // Search by email (case-insensitive) or Ref ID
    const query = {
      status: 'Success',
      $or: [
        { ref_no: queryStr },
        { email: { $regex: new RegExp('^' + queryStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } }
      ]
    };

    const history = await Purchase.find(query).sort({ timestamp: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CUSTOMER AUTHENTICATION APIs ---

// Customer Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, phone } = req.body;
    if (!email || !email.includes('@') || !password || password.length < 6) {
      return res.status(400).json({ error: 'Format email tidak valid atau password kurang dari 6 karakter.' });
    }

    const emailNormalized = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: emailNormalized });
    if (existingUser) {
      return res.status(400).json({ error: 'Email sudah terdaftar.' });
    }

    const hashedPassword = hashPassword(password);
    const newUser = new User({
      email: emailNormalized,
      password: hashedPassword,
      phone: phone || ''
    });

    await newUser.save();
    
    // Generate JWT token
    const token = generateToken({ id: newUser._id, email: newUser.email });
    res.json({
      success: true,
      token,
      user: {
        email: newUser.email,
        phone: newUser.phone
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi.' });
    }

    const emailNormalized = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailNormalized });
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const token = generateToken({ id: user._id, email: user.email });
    res.json({
      success: true,
      token,
      user: {
        email: user.email,
        phone: user.phone
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Current User Profile
app.get('/api/auth/me', requireUserAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get User Purchases history (unmasked credentials)
app.get('/api/user/purchases', requireUserAuth, async (req, res) => {
  try {
    const history = await Purchase.find({
      email: req.user.email,
      status: 'Success'
    }).sort({ timestamp: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN GET ALL USERS API ---
app.get('/api/admin/users', requireAdminAuth, async (req, res) => {
  try {
    const users = await User.find().sort({ created_at: -1 });
    const userPurchaseStats = await Purchase.aggregate([
      { $match: { status: 'Success' } },
      { $group: {
          _id: { $toLower: "$email" },
          total_purchases: { $sum: 1 },
          total_qty: { $sum: { $ifNull: ["$quantity", 1] } }
        }
      }
    ]);

    const statsMap = {};
    userPurchaseStats.forEach(stat => {
      statsMap[stat._id] = stat;
    });

    const formattedUsers = users.map(u => {
      const uStats = statsMap[u.email.toLowerCase()] || { total_purchases: 0, total_qty: 0 };
      return {
        _id: u._id,
        email: u.email,
        phone: u.phone,
        created_at: u.created_at,
        total_purchases: uStats.total_purchases,
        total_qty: uStats.total_qty
      };
    });

    res.json(formattedUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN GET ALL PURCHASES API ---
app.get('/api/admin/purchases', requireAdminAuth, async (req, res) => {
  try {
    const list = await Purchase.find().sort({ timestamp: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN AUTH API ---
app.post('/api/admin/auth', (req, res) => {
  const { key } = req.body;
  const adminKey = process.env.ADMIN_KEY || 'ryuzoadmin';
  if (key === adminKey) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Kunci akses salah!' });
  }
});

// --- QRIS PAYMENT GATEWAY PROXY ---

// Create QRIS Transaction
app.post('/api/payment/create-qris', requireUserAuth, async (req, res) => {
  try {
    const email = req.user.email;
    const { quantity, save_only, ref_no, qr_url, payment_link, amount } = req.body;

    const qty = Math.max(1, parseInt(quantity) || 1);

    // Check stock count first
    const activeCount = await Account.countDocuments({ status: 'Aktif' });
    if (activeCount < qty) {
      return res.status(400).json({ error: `Stok tidak cukup. Hanya tersedia ${activeCount} akun.` });
    }

    const price = 3000 * qty; // Rp 3.000 per account
    const expiryMins = 30;

    // SAVE ONLY MODE (Client-side Bypass)
    if (save_only && ref_no) {
      // Save pending transaction in database
      const newPurchase = new Purchase({
        email: email,
        ref_no: ref_no,
        amount: amount || price,
        quantity: qty,
        status: 'Pending'
      });
      await newPurchase.save();

      return res.json({
        success: true,
        ref_no: ref_no,
        qr_url: qr_url,
        payment_link: payment_link,
        amount: amount || price
      });
    }

    // Call Mustika Payment API
    const params = new URLSearchParams();
    params.append('amount', price.toString());
    params.append('product_name', `Ryuzo Motion Premium 1 Tahun Qty ${qty}`);
    params.append('customer_name', email);
    params.append('expiry', expiryMins.toString());
    params.append('redirect_url', 'https://ryuzomotion.id');

    console.log(`Sending request to Mustika Payment for ${qty} account(s)...`);
    
    // Call Mustika Payment API using system curl via execFile (to bypass Cloudflare TLS fingerprints)
    const args = [
      '-s',
      '-X', 'POST',
      'https://mustikapayment.com/api/v1/create/qris',
      '-H', `X-Api-Key: ${process.env.MUSTIKA_API_KEY}`,
      '-H', 'Content-Type: application/x-www-form-urlencoded',
      '-H', 'User-Agent: curl/7.81.0'
    ];
    
    // Add parameters
    for (const [key, value] of params.entries()) {
      args.push('-d', `${key}=${value}`);
    }
    
    const mustikaData = await new Promise((resolve, reject) => {
      execFile('curl', args, (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`Curl error: ${error.message}. Stderr: ${stderr}`));
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (err) {
          reject(new Error(`Gagal parse respons gateway pembayaran sebagai JSON: ${stdout.substring(0, 500)}`));
        }
      });
    });

    if (mustikaData && mustikaData.status === 'success') {
      const { ref_no: resRefNo, qr_url: resQrUrl, payment_link: resPaymentLink, amount: resAmount } = mustikaData;

      // Save pending transaction in database
      const newPurchase = new Purchase({
        email: email,
        ref_no: resRefNo,
        amount: resAmount,
        quantity: qty,
        status: 'Pending'
      });
      await newPurchase.save();

      res.json({
        success: true,
        ref_no: resRefNo,
        qr_url: resQrUrl,
        payment_link: resPaymentLink,
        amount: resAmount
      });
    } else {
      throw new Error(mustikaData ? mustikaData.message : 'Gagal membuat tagihan QRIS dari gateway');
    }
  } catch (err) {
    console.warn('⚠️ MustikaPayment Gateway server call failed, sending WAF_BLOCKED to client:', err.message);
    const qty = Math.max(1, parseInt(req.body.quantity) || 1);
    res.json({
      status: 'waf_blocked',
      apiKey: process.env.MUSTIKA_API_KEY,
      amount: 3000 * qty,
      quantity: qty
    });
  }
});

// Check Status of QRIS & Dispense Account on success
app.get('/api/payment/check-status/:ref_no', requireUserAuth, async (req, res) => {
  try {
    const { ref_no } = req.params;
    const setSuccess = req.query.set_success === 'true';
    
    // Find transaction in DB
    const transaction = await Purchase.findOne({ ref_no });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }

    // Ensure the transaction belongs to the logged-in user
    if (transaction.email !== req.user.email) {
      return res.status(403).json({ error: 'Akses ditolak. Transaksi ini milik pengguna lain.' });
    }

    // If already marked success in DB, return accounts list immediately
    if (transaction.status === 'Success') {
      const accountsList = transaction.accounts_assigned && transaction.accounts_assigned.length > 0 
        ? transaction.accounts_assigned 
        : [{ gmail: transaction.gmail_assigned, link_akses: transaction.link_assigned }];
      return res.json({
        status: 'success',
        accounts: accountsList
      });
    }

    // If client tells us payment is success (client-side bypass)
    if (setSuccess && transaction.status === 'Pending') {
      const qty = transaction.quantity || 1;

      // Double check stock
      const accountsToDispense = await Account.find({ status: 'Aktif' }).limit(qty);
      if (accountsToDispense.length < qty) {
        transaction.status = 'Success';
        await transaction.save();
        return res.json({
          status: 'success_out_of_stock',
          message: 'Pembayaran sukses, namun stok lisensi mendadak habis. Harap hubungi admin dengan mengirimkan bukti ref_no: ' + ref_no
        });
      }

      const assigned = [];
      for (const acc of accountsToDispense) {
        acc.status = 'Terpakai';
        acc.catatan_khusus = `Buyer: ${transaction.email}`;
        await acc.save();
        assigned.push({
          gmail: acc.gmail,
          link_akses: acc.link_akses
        });
      }

      // Update Transaction
      transaction.status = 'Success';
      transaction.accounts_assigned = assigned;
      if (assigned[0]) {
        transaction.gmail_assigned = assigned[0].gmail;
        transaction.link_assigned = assigned[0].link_akses;
      }
      await transaction.save();

      return res.json({
        status: 'success',
        accounts: assigned
      });
    }

    // Call Mustika Payment status API using system curl via execFile (to bypass Cloudflare TLS fingerprints)
    const args = [
      '-s',
      '-X', 'GET',
      `https://mustikapayment.com/api/v1/check/qris?ref_no=${ref_no}`,
      '-H', `X-Api-Key: ${process.env.MUSTIKA_API_KEY}`,
      '-H', 'User-Agent: curl/7.81.0'
    ];

    const checkData = await new Promise((resolve, reject) => {
      execFile('curl', args, (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`Curl error: ${error.message}. Stderr: ${stderr}`));
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (err) {
          reject(new Error(`Gagal parse respons status gateway pembayaran: ${stdout.substring(0, 500)}`));
        }
      });
    });

    if (checkData && checkData.status === 'success') {
      const qty = transaction.quantity || 1;

      // Double check stock
      const accountsToDispense = await Account.find({ status: 'Aktif' }).limit(qty);
      if (accountsToDispense.length < qty) {
        // Fallback: If stock runs out in between, mark payment success but prompt user
        transaction.status = 'Success';
        await transaction.save();
        return res.json({
          status: 'success_out_of_stock',
          message: 'Pembayaran sukses, namun stok lisensi mendadak habis. Harap hubungi admin dengan mengirimkan bukti ref_no: ' + ref_no
        });
      }

      const assigned = [];
      for (const acc of accountsToDispense) {
        acc.status = 'Terpakai';
        acc.catatan_khusus = `Buyer: ${transaction.email}`;
        await acc.save();
        assigned.push({
          gmail: acc.gmail,
          link_akses: acc.link_akses
        });
      }

      // Update Transaction
      transaction.status = 'Success';
      transaction.accounts_assigned = assigned;
      if (assigned[0]) {
        transaction.gmail_assigned = assigned[0].gmail;
        transaction.link_assigned = assigned[0].link_akses;
      }
      await transaction.save();

      res.json({
        status: 'success',
        accounts: assigned
      });
    } else {
      res.json({ status: 'pending' });
    }
  } catch (err) {
    console.error('Check QRIS status error:', err.response ? err.response.data : err.message);
    // Silent fail and return pending status
    res.json({ status: 'pending' });
  }
});

// Fallback: Serve public HTML on any routing fallback based on device detection
app.get('*', (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(ua);
  
  if (isMobile) {
    res.sendFile(path.join(__dirname, 'public', 'mobile.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'desktop.html'));
  }
});

// Export app for serverless deployments (like Vercel)
module.exports = app;

// Start Server locally or on non-serverless hosts
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}


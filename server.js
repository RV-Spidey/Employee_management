const express = require('express');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 5000;

// PostgreSQL connection
if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    console.error('Please set DATABASE_URL in your .env file or environment variables');
    process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ensureDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS employees (
            id TEXT PRIMARY KEY,
            firstName TEXT NOT NULL,
            lastName TEXT NOT NULL,
            email TEXT NOT NULL,
            department TEXT NOT NULL,
            salary INTEGER NOT NULL
        );
    `);
    // Ensure per-user ownership and unique emails per user (case-insensitive)
    await pool.query(`
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS userId TEXT;
    `);
    // Drop old global unique index if present and create per-user + email unique index
    await pool.query(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'employees_email_lower_unique'
            ) THEN
                EXECUTE 'DROP INDEX employees_email_lower_unique';
            END IF;
        END $$;
    `);
    await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'employees_user_email_lower_unique'
            ) THEN
                CREATE UNIQUE INDEX employees_user_email_lower_unique ON employees (userId, LOWER(email));
            END IF;
        END $$;
    `);
    
    // Create users table for authentication
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function generateId() {
    return Math.random().toString(36).slice(2, 10);
}

// Simple auth helpers
function getUserIdFromCookie(req) {
    const cookieHeader = req.headers.cookie || '';
    const parts = cookieHeader.split(';').map(v => v.trim());
    for (const part of parts) {
        if (part.startsWith('uid=')) {
            return decodeURIComponent(part.slice(4));
        }
    }
    return null;
}

function authRequired(req, res, next) {
    const userId = getUserIdFromCookie(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    req.userId = userId;
    next();
}

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    try {
        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const id = generateId();
        const { rows } = await pool.query(
            'INSERT INTO users (id, name, email, password) VALUES ($1, $2, $3, $4) RETURNING id, name, email',
            [id, name, email, hashedPassword]
        );
        
        res.status(201).json({ message: 'Registration successful', user: rows[0] });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    try {
        // Find user
        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const user = rows[0];
        
        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Set a simple session cookie with the user id
        const isSecure = (req.protocol === 'https') || (req.headers['x-forwarded-proto'] === 'https');
        res.setHeader('Set-Cookie', `uid=${encodeURIComponent(user.id)}; HttpOnly; SameSite=Lax; Path=/` + (isSecure ? '; Secure' : ''));
        res.json({
            message: 'Login successful',
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Get current user
app.get('/api/auth/me', async (req, res) => {
    const userId = getUserIdFromCookie(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { rows } = await pool.query('SELECT id, name, email FROM users WHERE id=$1', [userId]);
        if (rows.length === 0) return res.status(401).json({ error: 'Unauthorized' });
        res.json({ user: rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    const isSecure = (req.protocol === 'https') || (req.headers['x-forwarded-proto'] === 'https');
    // Overwrite cookie with empty value and immediate expiry
    res.setHeader('Set-Cookie', `uid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0` + (isSecure ? '; Secure' : ''));
    res.status(204).end();
});

// API Routes
app.get('/api/employees', authRequired, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, firstname AS "firstName", lastname AS "lastName", email, department, salary FROM employees WHERE userid=$1 ORDER BY lastname, firstname',
            [req.userId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch employees' });
    }
});

app.post('/api/employees', authRequired, async (req, res) => {
    const { firstName, lastName, email, department, salary } = req.body;
    if (!firstName || !lastName || !email || !department || typeof salary !== 'number') {
        return res.status(400).json({ message: 'Invalid employee data' });
    }
    try {
        const id = generateId();
        const { rows } = await pool.query(
            'INSERT INTO employees (id, firstname, lastname, email, department, salary, userid) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, firstname AS "firstName", lastname AS "lastName", email, department, salary',
            [id, firstName, lastName, email, department, salary, req.userId]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err && err.code === '23505') { // unique_violation
            return res.status(409).json({ message: 'An employee with this email already exists.' });
        }
        res.status(500).json({ message: 'Failed to add employee' });
    }
});

app.put('/api/employees/:id', authRequired, async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email, department, salary } = req.body;
    if (!firstName || !lastName || !email || !department || typeof salary !== 'number') {
        return res.status(400).json({ message: 'Invalid employee data' });
    }
    try {
        const { rows } = await pool.query(
            'UPDATE employees SET firstname=$1, lastname=$2, email=$3, department=$4, salary=$5 WHERE id=$6 AND userid=$7 RETURNING id, firstname AS "firstName", lastname AS "lastName", email, department, salary',
            [firstName, lastName, email, department, salary, id, req.userId]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Employee not found' });
        res.json(rows[0]);
    } catch (err) {
        if (err && err.code === '23505') { // unique_violation
            return res.status(409).json({ message: 'An employee with this email already exists.' });
        }
        res.status(500).json({ message: 'Failed to update employee' });
    }
});

app.delete('/api/employees/:id', authRequired, async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await pool.query('DELETE FROM employees WHERE id=$1 AND userid=$2', [id, req.userId]);
        if (rowCount === 0) return res.status(404).json({ message: 'Employee not found' });
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete employee' });
    }
});

// Fallback to index.html for SPA-like behavior
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', async () => {
    try {
        await ensureDatabase();
        console.log(`Server is running on http://0.0.0.0:${PORT}`);
    } catch (err) {
        console.error('Failed to initialize database', err);
        process.exit(1);
    }
});



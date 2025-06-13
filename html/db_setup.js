// db_setup.js - Script to initialize the SQLite database for authentication

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Ensure backup of any existing database
const dbFile = './db.sqlite3';
if (fs.existsSync(dbFile)) {
    const backupFile = `./db.sqlite3.backup-${Date.now()}`;
    console.log(`Creating backup of existing database as ${backupFile}`);
    fs.copyFileSync(dbFile, backupFile);
}

// Create and connect to SQLite database
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        return;
    }
    console.log('Connected to the SQLite database.');
    
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
    
    // Create users table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        fullname TEXT,
        position TEXT,
        phone TEXT,
        bio TEXT,
        role TEXT DEFAULT 'user',
        last_login TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating users table:', err.message);
            return;
        }
        console.log('Users table created or already exists.');
        
        // Create login_logs table to track login attempts
        db.run(`CREATE TABLE IF NOT EXISTS login_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            login_time TEXT DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            success INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`, (err) => {
            if (err) {
                console.error('Error creating login_logs table:', err.message);
                return;
            }
            console.log('Login logs table created or already exists.');
        });
        
        // Check if admin user exists
        db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
            if (err) {
                console.error('Error checking for admin user:', err.message);
                return;
            }
            
            // If admin doesn't exist, create default admin account
            if (!row) {
                // Hash the default password
                const salt = bcrypt.genSaltSync(10);
                const hash = bcrypt.hashSync('@Phucadmin', salt);
                
                // Insert default admin user
                db.run('INSERT INTO users (username, password, email, fullname, position, phone, bio, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
                    ['admin', hash, 'phucadmin@gmail.com', 'Nguyễn Minh Phúc', 'Kỹ sư Khoa Học Máy tính', '0123456789', 'Đam mê quản trị hệ thống, AI, bảo mật và phân tích dữ liệu.', 'admin'], function(err) {
                        if (err) {
                            console.error('Error creating admin account:', err.message);
                            return;
                        }
                        console.log('Default admin account created with ID:', this.lastID);
                    }
                );
            } else {
                console.log('Admin account already exists.');
                
                // Cập nhật thông tin cho tài khoản admin nếu tài khoản đã tồn tại
                db.run('UPDATE users SET email = ?, fullname = ?, position = ?, phone = ?, bio = ? WHERE username = ?',
                    ['phucadmin@gmail.com', 'Nguyễn Minh Phúc', 'Kỹ sư Khoa Học Máy tính', '0123456789', 'Đam mê quản trị hệ thống, AI, bảo mật và phân tích dữ liệu.', 'admin'],
                    function(err) {
                        if (err) {
                            console.error('Error updating admin info:', err.message);
                        } else {
                            console.log('Admin account information updated.');
                        }
                    }
                );
            }
        });
    });
});

// Close the database connection after setup
setTimeout(() => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
            return;
        }
        console.log('Database connection closed.');
    });
}, 2000); 
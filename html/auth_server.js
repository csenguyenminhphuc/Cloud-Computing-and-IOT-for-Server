// auth_server.js - Authentication server for handling login requests with JWT

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Initialize Express app
const app = express();
const port = 3300;

// JWT Secret Key - In a production environment, this should be stored in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'ateamiuh-secure-jwt-key-2023';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

// Maximum login attempts before temporary lockout
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Connect to SQLite database
const db = new sqlite3.Database('./db.sqlite3', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Helper function to get client IP address
const getClientIp = (req) => {
    return req.headers['x-forwarded-for'] || 
        req.connection.remoteAddress || 
        req.socket.remoteAddress || 
        req.connection.socket.remoteAddress;
};

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(403).json({
            success: false,
            message: 'No token provided'
        });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Invalid or expired token'
            });
        }
        
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    });
};

// Routes
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const ipAddress = getClientIp(req);
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Username and password are required' 
        });
    }
    
    // Check for failed login attempts from this IP
    db.get('SELECT COUNT(*) as count FROM login_logs WHERE ip_address = ? AND success = 0 AND login_time > datetime("now", "-15 minutes")', 
        [ipAddress], (err, result) => {
            if (err) {
                console.error('Database error:', err.message);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Internal server error' 
                });
            }
            
            if (result.count >= MAX_LOGIN_ATTEMPTS) {
                return res.status(429).json({
                    success: false,
                    message: 'Too many failed login attempts. Please try again later.'
                });
            }
            
            // Find user in database
            db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
                if (err) {
                    console.error('Database error:', err.message);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Internal server error' 
                    });
                }
                
                // Log the login attempt
                const logLoginAttempt = (userId, success) => {
                    db.run('INSERT INTO login_logs (user_id, ip_address, success) VALUES (?, ?, ?)',
                        [userId || null, ipAddress, success ? 1 : 0], function(err) {
                            if (err) {
                                console.error('Error logging login attempt:', err.message);
                            }
                        });
                };
                
                if (!user) {
                    logLoginAttempt(null, false);
                    return res.status(401).json({ 
                        success: false, 
                        message: 'Invalid username or password' 
                    });
                }
                
                // Compare passwords
                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if (err) {
                        console.error('Password comparison error:', err.message);
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Internal server error' 
                        });
                    }
                    
                    if (isMatch) {
                        // Password is correct, generate JWT token
                        const token = jwt.sign(
                            { id: user.id, username: user.username, role: user.role }, 
                            JWT_SECRET, 
                            { expiresIn: JWT_EXPIRES_IN }
                        );
                        
                        // Generate refresh token (optional)
                        const refreshToken = jwt.sign(
                            { id: user.id }, 
                            JWT_SECRET + user.password.substring(0, 10), 
                            { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
                        );
                        
                        // Update last login time
                        db.run('UPDATE users SET last_login = datetime("now") WHERE id = ?', [user.id]);
                        
                        // Log successful login
                        logLoginAttempt(user.id, true);
                        
                        // Authentication successful
                        return res.json({ 
                            success: true, 
                            token: token,
                            refreshToken: refreshToken,
                            user: { 
                                id: user.id, 
                                username: user.username, 
                                email: user.email,
                                fullname: user.fullname,
                                position: user.position,
                                phone: user.phone,
                                bio: user.bio,
                                role: user.role
                            } 
                        });
                    } else {
                        // Password is incorrect, log failed attempt
                        logLoginAttempt(user.id, false);
                        
                        return res.status(401).json({ 
                            success: false, 
                            message: 'Invalid username or password' 
                        });
                    }
                });
            });
        });
});

// Route to refresh token
app.post('/api/refresh-token', (req, res) => {
    const { refreshToken, userId } = req.body;
    
    if (!refreshToken || !userId) {
        return res.status(400).json({ 
            success: false, 
            message: 'Refresh token and user ID are required' 
        });
    }
    
    // Find user in database
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid refresh token' 
            });
        }
        
        // Verify refresh token
        try {
            jwt.verify(refreshToken, JWT_SECRET + user.password.substring(0, 10));
            
            // Generate new access token
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role }, 
                JWT_SECRET, 
                { expiresIn: JWT_EXPIRES_IN }
            );
            
            // Return new token
            return res.json({ 
                success: true, 
                token: token
            });
        } catch (err) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid or expired refresh token' 
            });
        }
    });
});

// Protected route - example
app.get('/api/profile', verifyToken, (req, res) => {
    db.get('SELECT id, username, email, fullname, position, phone, bio, role, last_login, created_at FROM users WHERE id = ?', [req.userId], (err, user) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user: user
        });
    });
});

// Update user profile information
app.put('/api/profile', verifyToken, (req, res) => {
    const { email, fullname, position, phone, bio } = req.body;
    
    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Email is required'
        });
    }
    
    // Update user information
    db.run('UPDATE users SET email = ?, fullname = ?, position = ?, phone = ?, bio = ? WHERE id = ?', 
        [email, fullname, position, phone, bio, req.userId], 
        function(err) {
            if (err) {
                console.error('Error updating profile:', err.message);
                return res.status(500).json({
                    success: false,
                    message: 'Error updating profile information'
                });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            res.json({
                success: true,
                message: 'Profile updated successfully'
            });
        }
    );
});

// Change user password
app.put('/api/change-password', verifyToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Current and new passwords are required'
        });
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'New password must be at least 6 characters long'
        });
    }
    
    // First, get the user to verify current password
    db.get('SELECT * FROM users WHERE id = ?', [req.userId], (err, user) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Verify current password
        bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
            if (err) {
                console.error('Password verification error:', err.message);
                return res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
            
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }
            
            // Hash the new password
            bcrypt.genSalt(10, (err, salt) => {
                if (err) {
                    console.error('Error generating salt:', err.message);
                    return res.status(500).json({
                        success: false,
                        message: 'Internal server error'
                    });
                }
                
                bcrypt.hash(newPassword, salt, (err, hash) => {
                    if (err) {
                        console.error('Error hashing password:', err.message);
                        return res.status(500).json({
                            success: false,
                            message: 'Internal server error'
                        });
                    }
                    
                    // Update the password in the database
                    db.run('UPDATE users SET password = ? WHERE id = ?', 
                        [hash, req.userId], 
                        function(err) {
                            if (err) {
                                console.error('Error updating password:', err.message);
                                return res.status(500).json({
                                    success: false,
                                    message: 'Error updating password'
                                });
                            }
                            
                            res.json({
                                success: true,
                                message: 'Password changed successfully'
                            });
                        }
                    );
                });
            });
        });
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running' });
});

// Start server
app.listen(port, () => {
    console.log(`Auth server running at http://localhost:${port}`);
}); 
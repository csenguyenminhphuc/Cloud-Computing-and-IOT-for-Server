document.addEventListener('DOMContentLoaded', function() {
    // Form submit handling
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const adminDashboard = document.getElementById('admin-dashboard');
    
    // API URL - Update this to match your server address
    const API_URL = 'http://localhost:3300/api';
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // Show loading state
            const loginBtn = loginForm.querySelector('.login-btn');
            const originalBtnText = loginBtn.innerHTML;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
            loginBtn.disabled = true;
            
            // Authenticate using the API
            fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            })
            .then(response => response.json())
            .then(data => {
                // Reset button state
                loginBtn.innerHTML = originalBtnText;
                loginBtn.disabled = false;
                
                if (data.success) {
                    // Login successful
                    loginForm.reset();
                    loginError.textContent = '';
                    
                    // Save login state, user info and tokens to session storage
                    sessionStorage.setItem('isLoggedIn', 'true');
                    sessionStorage.setItem('user', JSON.stringify(data.user));
                    sessionStorage.setItem('token', data.token);
                    if (data.refreshToken) {
                        sessionStorage.setItem('refreshToken', data.refreshToken);
                    }
                    
                    // Show dashboard
                    document.querySelector('.login-container').style.display = 'none';
                    adminDashboard.classList.remove('hidden');
                    
                    // Update UI with user info
                    updateUserInterface(data.user);
                } else {
                    // Login failed
                    loginError.textContent = data.message || 'Tên đăng nhập hoặc mật khẩu không đúng!';
                    // Shake animation for error
                    loginForm.classList.add('shake');
                    setTimeout(() => {
                        loginForm.classList.remove('shake');
                    }, 500);
                }
            })
            .catch(error => {
                // Handle API error
                console.error('Login error:', error);
                loginBtn.innerHTML = originalBtnText;
                loginBtn.disabled = false;
                loginError.textContent = 'Lỗi kết nối đến máy chủ! Vui lòng thử lại sau.';
                
                // For development/demo ONLY - fallback to hardcoded credentials 
                // WARNING: REMOVE THIS IN PRODUCTION!
                if (username === 'admin' && password === '@Phucadmin') {
                    console.log('Using fallback authentication');
                    loginForm.reset();
                    loginError.textContent = '';
                    
                    // Save login state to session storage
                    const mockUser = {
                        id: 1,
                        username: 'admin',
                        email: 'admin@ateamweb.com',
                        role: 'admin'
                    };
                    
                    sessionStorage.setItem('isLoggedIn', 'true');
                    sessionStorage.setItem('user', JSON.stringify(mockUser));
                    sessionStorage.setItem('token', 'mock-jwt-token');
                    
                    // Show dashboard
                    document.querySelector('.login-container').style.display = 'none';
                    adminDashboard.classList.remove('hidden');
                    
                    // Update UI with user info
                    updateUserInterface(mockUser);
                }
            });
        });
    }
    
    // Function to update user interface with user info
    function updateUserInterface(user) {
        // Update username display if it exists
        const userDisplay = document.querySelector('.user-display');
        if (userDisplay && user) {
            userDisplay.textContent = user.username;
        }
        
        // Cập nhật thông tin người dùng trên trang tổng quan
        if (user) {
            const adminFullname = document.getElementById('admin-fullname');
            const adminPosition = document.getElementById('admin-position');
            const adminBio = document.getElementById('admin-bio');
            const adminEmail = document.getElementById('admin-email');
            const adminPhone = document.getElementById('admin-phone');
            
            if (adminFullname) adminFullname.textContent = user.fullname || 'Nguyễn Minh Phúc';
            if (adminPosition) adminPosition.textContent = user.position || 'Kỹ sư Khoa Học Máy tính';
            if (adminBio) adminBio.textContent = user.bio || 'Đam mê quản trị hệ thống, AI, bảo mật và phân tích dữ liệu.';
            if (adminEmail) adminEmail.textContent = user.email || 'phucadmin@gmail.com';
            if (adminPhone) adminPhone.textContent = user.phone || '0123456789';
        }
        
        // Update role-based UI elements
        if (user && user.role === 'admin') {
            // Show admin-only elements
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'block';
            });
        }
    }
    
    // Function to check token validity and refresh if needed
    function checkAndRefreshToken() {
        const token = sessionStorage.getItem('token');
        const refreshToken = sessionStorage.getItem('refreshToken');
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        
        if (!token || !refreshToken || !user.id) return false;
        
        // Check if token is expired (this is a simplified check)
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000; // Convert to milliseconds
            
            if (Date.now() >= expiry) {
                // Token expired, try to refresh
                fetch(`${API_URL}/refresh-token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        refreshToken: refreshToken,
                        userId: user.id
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update token in session storage
                        sessionStorage.setItem('token', data.token);
                        return true;
                    } else {
                        // Refresh failed, logout
                        performLogout();
                        return false;
                    }
                })
                .catch(error => {
                    console.error('Token refresh error:', error);
                    return false;
                });
            }
            return true;
        } catch (e) {
            console.error('Token validation error:', e);
            return false;
        }
    }
    
    // Function to handle logout
    function performLogout() {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
        window.location.href = 'login.html';
    }
    
    // Check if user is already logged in
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        const loginContainer = document.querySelector('.login-container');
        if (loginContainer) {
            loginContainer.style.display = 'none';
        }
        if (adminDashboard) {
            adminDashboard.classList.remove('hidden');
            
            // Verify token is valid
            if (!checkAndRefreshToken()) {
                // Token invalid and couldn't be refreshed
                performLogout();
            } else {
                // Update UI with user info
                const user = JSON.parse(sessionStorage.getItem('user') || '{}');
                updateUserInterface(user);
            }
        }
    }
    
    // Toggle password visibility
    const togglePassword = document.querySelector('.toggle-password');
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle eye icon
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }
    
    // Dashboard functionality
    const dashboardLinks = document.querySelectorAll('.dashboard-menu a');
    const dashboardPanels = document.querySelectorAll('.dashboard-panel');
    
    // Lưu URL cho các dịch vụ
    const serviceUrls = {
        'dashboard-nodered': 'https://ateamiuh.me:9999',
        'dashboard-ui': 'https://ateamiuh.me:9999/ui',
        'dashboard-influxdb': 'https://ateamiuh.me:8086',
        'dashboard-grafana': 'https://ateamiuh.me:3000'
    };
    
    dashboardLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetPanel = this.getAttribute('data-target');
            
            // Update active state for links
            dashboardLinks.forEach(link => {
                link.parentElement.classList.remove('active');
            });
            this.parentElement.classList.add('active');
            
            // Show the correct panel with a smooth transition
            dashboardPanels.forEach(panel => {
                panel.classList.remove('active');
                panel.style.opacity = '0';
            });
            
            const targetElement = document.getElementById(targetPanel);
            if (targetElement) {
                targetElement.classList.add('active');
                // Add a small delay for a smoother transition
                setTimeout(() => {
                    targetElement.style.opacity = '1';
                }, 50);
                
                // Check if this panel has an iframe and handle loading state
                const iframe = targetElement.querySelector('iframe');
                if (iframe) {
                    const iframeContainer = iframe.closest('.iframe-container');
                    if (iframeContainer) {
                        iframeContainer.classList.remove('loaded');
                        
                        // Kiểm tra xem iframe có cần được tải lại URL không
                        const serviceUrl = serviceUrls[targetPanel];
                        if (serviceUrl && iframe.src !== serviceUrl) {
                            iframe.src = serviceUrl;
                        }
                        
                        // Add load event to iframe if not already added
                        if (!iframe.dataset.listenerAdded) {
                            iframe.addEventListener('load', function() {
                                iframeContainer.classList.add('loaded');
                            });
                            iframe.dataset.listenerAdded = 'true';
                        }
                        
                        // If iframe already loaded, add loaded class
                        if (iframe.complete) {
                            iframeContainer.classList.add('loaded');
                        }
                    }
                }
            }
        });
    });
    
    // Service buttons functionality
    const serviceButtons = document.querySelectorAll('.service-btn, .btn[data-service]');
    
    serviceButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetPanel = this.getAttribute('data-service');
            if (!targetPanel) return;
            
            // Find the corresponding menu item and simulate a click
            const menuLink = document.querySelector(`.dashboard-menu a[data-target="${targetPanel}"]`);
            if (menuLink) {
                menuLink.click();
            }
        });
    });
    
    // Initialize iframe loading indicators
    document.querySelectorAll('.iframe-container iframe').forEach(iframe => {
        const container = iframe.closest('.iframe-container');
        const isNodeRed = iframe.src.includes('9999') && !iframe.src.includes('/ui');
        
        if (!iframe.dataset.listenerAdded) {
            iframe.addEventListener('load', function() {
                container.classList.add('loaded');
                
                // Special handling for Node-RED interface
                if (isNodeRed) {
                    try {
                        // Access the iframe content and modify it
                        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
                        
                        // Create a style element to hide unwanted elements
                        const style = document.createElement('style');
                        style.textContent = `
                            body { padding-top: 0 !important; margin: 0 !important; }
                            header, .header, #header, .headerShadow { display: none !important; }
                            .red-ui-header { display: none !important; }
                            .red-ui-editor-navigation, .red-ui-palette-header, .red-ui-palette-search, .red-ui-palette-spinner, .red-ui-palette-container { display: none !important; }
                            .red-ui-workspace { top: 0 !important; }
                            .red-ui-workspace-toolbar { display: none !important; }
                            .red-ui-tabs { display: none !important; }
                            .red-ui-workspaces { display: none !important; }
                            .red-ui-editor-stack { top: 0 !important; }
                            #workspace { padding-top: 0 !important; }
                        `;
                        
                        // Inject the style
                        iframeDocument.head.appendChild(style);
                    } catch (e) {
                        console.log('Could not modify Node-RED interface:', e);
                    }
                }
            });
            
            iframe.dataset.listenerAdded = 'true';
            
            // If iframe already loaded
            if (iframe.complete) {
                const event = new Event('load');
                iframe.dispatchEvent(event);
            }
        }
    });
    
    // Enhanced browser navigation for iframe
    const setupBrowserControls = () => {
        const backButtons = document.querySelectorAll('.back-btn');
        const forwardButtons = document.querySelectorAll('.forward-btn');
        const refreshButtons = document.querySelectorAll('.refresh-btn');
        
        // Handle back button clicks
        backButtons.forEach(button => {
            button.addEventListener('click', function() {
                const panel = this.closest('.dashboard-panel');
                const iframe = panel.querySelector('iframe');
                if (iframe) {
                    try {
                        iframe.contentWindow.history.back();
                    } catch (e) {
                        console.error('Could not go back in iframe:', e);
                    }
                }
            });
        });
        
        // Handle forward button clicks
        forwardButtons.forEach(button => {
            button.addEventListener('click', function() {
                const panel = this.closest('.dashboard-panel');
                const iframe = panel.querySelector('iframe');
                if (iframe) {
                    try {
                        iframe.contentWindow.history.forward();
                    } catch (e) {
                        console.error('Could not go forward in iframe:', e);
                    }
                }
            });
        });
        
        // Handle refresh button clicks
        refreshButtons.forEach(button => {
            button.addEventListener('click', function() {
                const panel = this.closest('.dashboard-panel');
                const iframe = panel.querySelector('iframe');
                if (iframe) {
                    const iframeContainer = iframe.closest('.iframe-container');
                    if (iframeContainer) {
                        iframeContainer.classList.remove('loaded');
                    }
                    iframe.src = iframe.src;
                }
            });
        });
    };
    
    // Initialize browser controls
    setupBrowserControls();
    
    // Logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            // Show confirmation dialog
            if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
                // Clear session storage
                sessionStorage.removeItem('isLoggedIn');
                sessionStorage.removeItem('user');
                sessionStorage.removeItem('token');
                
                // Redirect to login page
                window.location.href = 'login.html';
            }
        });
    }
    
    // Add shaking animation for wrong login
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
            20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        .shake {
            animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        
        .dashboard-panel {
            transition: opacity 0.3s ease;
        }
        
        .service-link-container {
            margin-top: 20px;
            display: flex;
            justify-content: center;
        }
        
        .dashboard-header .logo-container {
            border: 1px solid #3498db;
            padding: 10px;
            border-radius: 8px;
            background-color: white;
        }
    `;
    document.head.appendChild(style);
    
    // Settings functionality
    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    const profileUpdateMessage = document.getElementById('profile-update-message');
    const passwordUpdateMessage = document.getElementById('password-update-message');
    
    // Populate user info in settings form
    function populateUserInfo() {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        const usernameField = document.getElementById('settings-username');
        const emailField = document.getElementById('settings-email');
        const fullnameField = document.getElementById('settings-fullname');
        const positionField = document.getElementById('settings-position');
        const phoneField = document.getElementById('settings-phone');
        const bioField = document.getElementById('settings-bio');
        
        if (user && usernameField && emailField) {
            usernameField.value = user.username || '';
            emailField.value = user.email || 'phucadmin@gmail.com';
            
            // Nếu user không có các trường này, sử dụng giá trị mặc định
            if (fullnameField) fullnameField.value = user.fullname || 'Nguyễn Minh Phúc';
            if (positionField) positionField.value = user.position || 'Kỹ sư Khoa Học Máy tính';
            if (phoneField) phoneField.value = user.phone || '0123456789';
            if (bioField) bioField.value = user.bio || 'Đam mê quản trị hệ thống, AI, bảo mật và phân tích dữ liệu.';
        }
    }
    
    // Handle dashboard tab changes to populate user info when settings tab is shown
    document.querySelectorAll('.dashboard-menu a').forEach(link => {
        link.addEventListener('click', function() {
            const targetPanel = this.getAttribute('data-target');
            if (targetPanel === 'dashboard-settings') {
                populateUserInfo();
            }
        });
    });
    
    // If user is already logged in and viewing dashboard, populate settings
    if (sessionStorage.getItem('isLoggedIn') === 'true' && adminDashboard && !adminDashboard.classList.contains('hidden')) {
        populateUserInfo();
    }
    
    // Handle profile update form submission
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('settings-email').value;
            const fullname = document.getElementById('settings-fullname').value;
            const position = document.getElementById('settings-position').value;
            const phone = document.getElementById('settings-phone').value;
            const bio = document.getElementById('settings-bio').value;
            const token = sessionStorage.getItem('token');
            
            if (!token) {
                profileUpdateMessage.textContent = 'Bạn cần đăng nhập lại để thực hiện hành động này';
                profileUpdateMessage.className = 'update-message error';
                return;
            }
            
            // Show loading state
            const updateBtn = profileForm.querySelector('button');
            const originalBtnText = updateBtn.innerHTML;
            updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
            updateBtn.disabled = true;
            
            // Make API call to update profile
            fetch(`${API_URL}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email, fullname, position, phone, bio })
            })
            .then(response => response.json())
            .then(data => {
                // Reset button state
                updateBtn.innerHTML = originalBtnText;
                updateBtn.disabled = false;
                
                if (data.success) {
                    // Show success message
                    profileUpdateMessage.textContent = 'Cập nhật thông tin thành công!';
                    profileUpdateMessage.className = 'update-message success';
                    
                    // Update user info in session storage
                    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
                    user.email = email;
                    user.fullname = fullname;
                    user.position = position;
                    user.phone = phone;
                    user.bio = bio;
                    sessionStorage.setItem('user', JSON.stringify(user));
                } else {
                    // Show error message
                    profileUpdateMessage.textContent = data.message || 'Lỗi cập nhật thông tin';
                    profileUpdateMessage.className = 'update-message error';
                }
                
                // Clear message after 5 seconds
                setTimeout(() => {
                    profileUpdateMessage.className = 'update-message';
                }, 5000);
            })
            .catch(error => {
                console.error('Profile update error:', error);
                updateBtn.innerHTML = originalBtnText;
                updateBtn.disabled = false;
                
                // Show error message
                profileUpdateMessage.textContent = 'Lỗi kết nối đến máy chủ! Vui lòng thử lại sau.';
                profileUpdateMessage.className = 'update-message error';
                
                // Clear message after 5 seconds
                setTimeout(() => {
                    profileUpdateMessage.className = 'update-message';
                }, 5000);
                
                // For development/demo ONLY - fallback
                if (!API_URL.includes('localhost')) return;
                
                console.log('Using fallback profile update');
                
                // Update user info in session storage
                const user = JSON.parse(sessionStorage.getItem('user') || '{}');
                user.email = email;
                user.fullname = fullname;
                user.position = position;
                user.phone = phone;
                user.bio = bio;
                sessionStorage.setItem('user', JSON.stringify(user));
                
                // Show mock success message
                profileUpdateMessage.textContent = 'Cập nhật thông tin thành công! Chúc mừng BÉ';
                profileUpdateMessage.className = 'update-message success';
                
                // Clear message after 5 seconds
                setTimeout(() => {
                    profileUpdateMessage.className = 'update-message';
                }, 5000);
            });
        });
    }
    
    // Handle password change form submission
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const token = sessionStorage.getItem('token');
            
            // Validate passwords
            if (newPassword !== confirmPassword) {
                passwordUpdateMessage.textContent = 'Mật khẩu mới không khớp với mật khẩu xác nhận';
                passwordUpdateMessage.className = 'update-message error';
                return;
            }
            
            if (newPassword.length < 6) {
                passwordUpdateMessage.textContent = 'Mật khẩu mới phải có ít nhất 6 ký tự';
                passwordUpdateMessage.className = 'update-message error';
                return;
            }
            
            if (!token) {
                passwordUpdateMessage.textContent = 'Bạn cần đăng nhập lại để thực hiện hành động này';
                passwordUpdateMessage.className = 'update-message error';
                return;
            }
            
            // Show loading state
            const updateBtn = passwordForm.querySelector('button');
            const originalBtnText = updateBtn.innerHTML;
            updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
            updateBtn.disabled = true;
            
            // Make API call to change password
            fetch(`${API_URL}/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    currentPassword,
                    newPassword
                })
            })
            .then(response => response.json())
            .then(data => {
                // Reset button state
                updateBtn.innerHTML = originalBtnText;
                updateBtn.disabled = false;
                
                if (data.success) {
                    // Reset form
                    passwordForm.reset();
                    
                    // Show success message
                    passwordUpdateMessage.textContent = 'Đổi mật khẩu thành công!';
                    passwordUpdateMessage.className = 'update-message success';
                } else {
                    // Show error message
                    passwordUpdateMessage.textContent = data.message || 'Lỗi đổi mật khẩu';
                    passwordUpdateMessage.className = 'update-message error';
                }
                
                // Clear message after 5 seconds
                setTimeout(() => {
                    passwordUpdateMessage.className = 'update-message';
                }, 5000);
            })
            .catch(error => {
                console.error('Password change error:', error);
                updateBtn.innerHTML = originalBtnText;
                updateBtn.disabled = false;
                
                // Show error message
                passwordUpdateMessage.textContent = 'Lỗi kết nối đến máy chủ! Vui lòng thử lại sau.';
                passwordUpdateMessage.className = 'update-message error';
                
                // Clear message after 5 seconds
                setTimeout(() => {
                    passwordUpdateMessage.className = 'update-message';
                }, 5000);
                
                // For development/demo ONLY - fallback
                if (!API_URL.includes('localhost') || currentPassword !== 'admin123') return;
                
                console.log('Using fallback password change');
                passwordForm.reset();
                
                // Show mock success message
                passwordUpdateMessage.textContent = 'Đổi mật khẩu thành công! Chúc mừng BÉ';
                passwordUpdateMessage.className = 'update-message success';
                
                // Clear message after 5 seconds
                setTimeout(() => {
                    passwordUpdateMessage.className = 'update-message';
                }, 5000);
            });
        });
    }
}); 
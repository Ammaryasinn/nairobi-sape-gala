// Staff Authentication Handler
// Handles login, logout, and session management for staff portal

// Check if user is already logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication state
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // User is signed in - redirect to staff check-in portal
                console.log('✅ User authenticated:', user.email);
                if (window.location.pathname.includes('staff-login.html')) {
                    window.location.href = 'staff-checkin.html';
                }
            } else {
                // User is signed out
                console.log('ℹ️ User not authenticated');
                // If on staff-checkin page, redirect to login
                if (window.location.pathname.includes('staff-checkin.html')) {
                    window.location.href = 'staff-login.html';
                }
            }
        });
    }

    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Handle logout button
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
});

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const loginButton = document.getElementById('loginButton');
    const errorMessage = document.getElementById('errorMessage');
    
    // Clear previous errors
    errorMessage.classList.remove('show');
    errorMessage.textContent = '';
    
    // Disable button and show loading
    loginButton.disabled = true;
    loginButton.textContent = 'Signing In...';
    
    try {
        // Check if Firebase Auth is initialized
        if (typeof firebase === 'undefined' || !firebase.auth) {
            throw new Error('Firebase Authentication is not initialized. Please check your Firebase configuration.');
        }
        
        // Attempt to sign in
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('✅ Login successful:', user.email);
        
        // Redirect to staff check-in portal
        window.location.href = 'staff-checkin.html';
        
    } catch (error) {
        console.error('❌ Login error:', error);
        
        // Display user-friendly error messages
        let errorText = 'Login failed. Please try again.';
        
        switch (error.code) {
            case 'auth/invalid-email':
                errorText = 'Invalid email address format.';
                break;
            case 'auth/user-disabled':
                errorText = 'This account has been disabled. Contact the administrator.';
                break;
            case 'auth/user-not-found':
                errorText = 'No account found with this email address.';
                break;
            case 'auth/wrong-password':
                errorText = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-credential':
                errorText = 'Invalid email or password. Please check your credentials.';
                break;
            case 'auth/too-many-requests':
                errorText = 'Too many failed attempts. Please try again later.';
                break;
            case 'auth/network-request-failed':
                errorText = 'Network error. Please check your internet connection.';
                break;
            default:
                errorText = error.message || 'An error occurred during login.';
        }
        
        // Show error message
        errorMessage.textContent = errorText;
        errorMessage.classList.add('show');
        
        // Re-enable button
        loginButton.disabled = false;
        loginButton.textContent = 'Sign In';
        
        // Clear password field
        document.getElementById('password').value = '';
    }
}

// Handle logout
async function handleLogout() {
    try {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            await firebase.auth().signOut();
            console.log('✅ Logout successful');
            window.location.href = 'staff-login.html';
        }
    } catch (error) {
        console.error('❌ Logout error:', error);
        alert('Error logging out. Please try again.');
    }
}

// Get current authenticated user
function getCurrentUser() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        return firebase.auth().currentUser;
    }
    return null;
}

// Check if user is authenticated
function isAuthenticated() {
    return getCurrentUser() !== null;
}

// Require authentication (call this on protected pages)
function requireAuth() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (!user) {
                // Not logged in - redirect to login page
                window.location.href = 'staff-login.html';
            }
        });
    } else {
        console.warn('⚠️ Firebase Auth not available - authentication check skipped');
    }
}

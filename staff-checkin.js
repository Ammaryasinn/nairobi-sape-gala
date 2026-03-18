// Staff Check-In System
// Nairobi SAPE Gala 2026

let html5QrCode = null;
let currentFilter = 'all';
let allTickets = [];

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Firebase Auth will automatically redirect if not logged in (via staff-auth.js)
    requireAuth();
    
    // Wait for auth state to be confirmed before loading dashboard
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // User is authenticated - show interface and load data
                showCheckInInterface();
            }
        });
    }
});

function showCheckInInterface() {
    // Interface is already visible (no login screen to hide)
    // Just initialize dashboard
    loadDashboardData();
    
    // Start auto-refresh every 10 seconds
    setInterval(loadDashboardData, 10000);
}

function logout() {
    // Use Firebase Auth logout (from staff-auth.js)
    handleLogout();
}

// Dashboard Data Loading
async function loadDashboardData() {
    try {
        // Get statistics
        const statsResult = await TicketDB.getStats();
        if (statsResult.success) {
            updateDashboardStats(statsResult.stats);
        }
        
        // Get all tickets
        const ticketsResult = await TicketDB.getAllTickets();
        if (ticketsResult.success) {
            allTickets = ticketsResult.tickets;
            updateGuestList(allTickets);
            updateFilterCounts();
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateDashboardStats(stats) {
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statCheckedIn').textContent = stats.checkedIn;
    document.getElementById('statRemaining').textContent = stats.remaining;
}

function updateFilterCounts() {
    const checkedIn = allTickets.filter(t => t.checkedIn).length;
    const notCheckedIn = allTickets.filter(t => !t.checkedIn).length;
    
    document.getElementById('filterCountAll').textContent = allTickets.length;
    document.getElementById('filterCountChecked').textContent = checkedIn;
    document.getElementById('filterCountNotChecked').textContent = notCheckedIn;
}

// QR Code Scanner
async function startScanning() {
    const qrReader = document.getElementById('qrReader');
    const startButton = document.getElementById('startScanButton');
    const stopButton = document.getElementById('stopScanButton');
    
    qrReader.style.display = 'block';
    startButton.style.display = 'none';
    stopButton.style.display = 'block';
    
    html5QrCode = new Html5Qrcode("qrReader");
    
    try {
        await html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            onScanSuccess,
            onScanFailure
        );
    } catch (error) {
        console.error('Error starting scanner:', error);
        alert('❌ Unable to access camera. Please check permissions.');
        stopScanning();
    }
}

async function stopScanning() {
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
            html5QrCode.clear();
        } catch (error) {
            console.error('Error stopping scanner:', error);
        }
    }
    
    document.getElementById('qrReader').style.display = 'none';
    document.getElementById('startScanButton').style.display = 'block';
    document.getElementById('stopScanButton').style.display = 'none';
}

function onScanSuccess(decodedText, decodedResult) {
    console.log(`QR Code detected: ${decodedText}`);
    
    // Stop scanning after successful scan
    stopScanning();
    
    // Validate the ticket
    validateTicket(decodedText);
}

function onScanFailure(error) {
    // Silent fail - this is called constantly while scanning
}

// Manual Search
async function searchTicket(event) {
    event.preventDefault();
    
    const searchInput = document.getElementById('searchInput').value.trim();
    if (!searchInput) return;
    
    // Search by ticket ID or name
    const ticket = allTickets.find(t => 
        t.ticketId.toLowerCase() === searchInput.toLowerCase() ||
        t.fullName.toLowerCase().includes(searchInput.toLowerCase())
    );
    
    if (ticket) {
        validateTicket(ticket.ticketId);
    } else {
        showValidationResult('invalid', null);
    }
    
    // Clear search input
    document.getElementById('searchInput').value = '';
}

// Ticket Validation
async function validateTicket(ticketId) {
    try {
        const result = await TicketDB.getTicket(ticketId);
        
        if (result.success) {
            const ticket = result.data;
            
            if (ticket.checkedIn) {
                // Already checked in
                showValidationResult('already-checked', ticket);
            } else {
                // Valid ticket, not yet checked in
                showValidationResult('valid', ticket);
            }
        } else {
            // Ticket not found
            showValidationResult('invalid', null);
        }
    } catch (error) {
        console.error('Error validating ticket:', error);
        showValidationResult('error', null);
    }
}

function showValidationResult(status, ticketData) {
    const validationResult = document.getElementById('validationResult');
    const validationCard = document.getElementById('validationCard');
    
    validationResult.style.display = 'block';
    
    // Scroll to result
    validationResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    let html = '';
    
    if (status === 'valid') {
        // Valid ticket - show check-in button
        html = `
            <div class="validation-status validation-valid">
                <div class="status-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <h3 class="status-title">✅ VALID TICKET</h3>
            </div>
            <div class="ticket-details">
                <div class="detail-row">
                    <span class="detail-label">Guest Name:</span>
                    <span class="detail-value">${escapeHtml(ticketData.fullName)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Ticket ID:</span>
                    <span class="detail-value">${escapeHtml(ticketData.ticketId)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Ticket Type:</span>
                    <span class="detail-value">${escapeHtml(ticketData.ticketType)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${escapeHtml(ticketData.email)}</span>
                </div>
            </div>
            <button class="checkin-button" onclick="performCheckIn('${escapeHtml(ticketData.ticketId)}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>Check In Now</span>
            </button>
        `;
    } else if (status === 'already-checked') {
        // Already checked in
        const checkInDate = new Date(ticketData.checkInTime);
        const timeString = checkInDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        html = `
            <div class="validation-status validation-warning">
                <div class="status-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <h3 class="status-title">⚠️ ALREADY CHECKED IN</h3>
            </div>
            <div class="ticket-details">
                <div class="detail-row">
                    <span class="detail-label">Guest Name:</span>
                    <span class="detail-value">${escapeHtml(ticketData.fullName)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Ticket ID:</span>
                    <span class="detail-value">${escapeHtml(ticketData.ticketId)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Check-In Time:</span>
                    <span class="detail-value">${escapeHtml(timeString)}</span>
                </div>
            </div>
            <p class="warning-message">This ticket was already used and cannot be checked in again.</p>
        `;
    } else if (status === 'invalid') {
        // Invalid ticket
        html = `
            <div class="validation-status validation-invalid">
                <div class="status-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                <h3 class="status-title">❌ INVALID TICKET</h3>
            </div>
            <p class="error-message">This ticket was not found in the system. Please verify the ticket ID or contact support.</p>
        `;
    } else {
        // Error
        html = `
            <div class="validation-status validation-invalid">
                <div class="status-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <h3 class="status-title">❌ ERROR</h3>
            </div>
            <p class="error-message">An error occurred while validating the ticket. Please try again.</p>
        `;
    }
    
    validationCard.innerHTML = html;
    
    // Auto-hide after 10 seconds for non-valid statuses
    if (status !== 'valid') {
        setTimeout(() => {
            validationResult.style.display = 'none';
        }, 10000);
    }
}

// Check-In Action
async function performCheckIn(ticketId) {
    try {
        const result = await TicketDB.checkInTicket(ticketId);
        
        if (result.success) {
            // Show success message
            const validationCard = document.getElementById('validationCard');
            validationCard.innerHTML = `
                <div class="validation-status validation-success">
                    <div class="status-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                    <h3 class="status-title">✅ CHECK-IN SUCCESSFUL!</h3>
                </div>
                <p class="success-message">Guest has been successfully checked in. Welcome to the gala!</p>
            `;
            
            // Refresh dashboard data
            await loadDashboardData();
            
            // Hide result after 5 seconds
            setTimeout(() => {
                document.getElementById('validationResult').style.display = 'none';
            }, 5000);
        } else {
            throw new Error(result.error || 'Check-in failed');
        }
    } catch (error) {
        console.error('Error performing check-in:', error);
        alert('❌ Error performing check-in. Please try again.');
    }
}

// Guest List Management
function updateGuestList(tickets) {
    const tbody = document.getElementById('guestTableBody');
    
    if (tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No tickets found.</td></tr>';
        return;
    }
    
    // Filter based on current filter
    let filteredTickets = tickets;
    if (currentFilter === 'checked') {
        filteredTickets = tickets.filter(t => t.checkedIn);
    } else if (currentFilter === 'not-checked') {
        filteredTickets = tickets.filter(t => !t.checkedIn);
    }
    
    if (filteredTickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No tickets match this filter.</td></tr>';
        return;
    }
    
    let html = '';
    filteredTickets.forEach(ticket => {
        const checkInTime = ticket.checkedIn 
            ? new Date(ticket.checkInTime).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })
            : '-';
        
        const statusBadge = ticket.checkedIn
            ? '<span class="status-badge status-checked">✓ Checked In</span>'
            : '<span class="status-badge status-pending">Pending</span>';
        
        const actionButton = ticket.checkedIn
            ? '<button class="table-action-btn" disabled>Checked In</button>'
            : `<button class="table-action-btn" onclick="validateTicket('${escapeHtml(ticket.ticketId)}')">Check In</button>`;
        
        html += `
            <tr>
                <td>${escapeHtml(ticket.fullName)}</td>
                <td><code>${escapeHtml(ticket.ticketId)}</code></td>
                <td>${escapeHtml(ticket.ticketType)}</td>
                <td>${statusBadge}</td>
                <td>${escapeHtml(checkInTime)}</td>
                <td>${actionButton}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function filterGuests(filter) {
    currentFilter = filter;
    
    // Update active button
    document.querySelectorAll('.filter-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    // Update table
    updateGuestList(allTickets);
}

// Export function for table action buttons
window.performCheckIn = performCheckIn;
window.validateTicket = validateTicket;
window.filterGuests = filterGuests;
window.startScanning = startScanning;
window.stopScanning = stopScanning;
window.searchTicket = searchTicket;
window.logout = logout;

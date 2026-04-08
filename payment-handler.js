// Payment Handler - Ticket Generation System
// Nairobi SAPE Gala 2026

let currentTicketData = null;
let allGeneratedTickets = []; // Store all tickets from multi-ticket purchase
const TICKET_LOGO_SRC = 'images/sape-logo.png';
const INTASEND_PUBLIC_KEY = 'ISPubKey_live_017c47ee-a538-4039-85f1-cbfb26023df3';

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhone(value) {
    return value.replace(/\s+/g, '');
}

function loadTicketLogo() {
    return new Promise((resolve) => {
        const existingLogo = document.querySelector('.logo-image-small, .logo-image');
        if (existingLogo && existingLogo.complete && existingLogo.naturalWidth > 0) {
            resolve(existingLogo);
            return;
        }

        const logo = new Image();
        logo.onload = () => resolve(logo);
        logo.onerror = () => resolve(null);
        logo.src = TICKET_LOGO_SRC;
    });
}

async function checkPendingOrderRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const hasSuccessParam = urlParams.get('status') === 'success';
    const pendingOrderStr = localStorage.getItem('sapePendingOrder');

    // --- Case 1: IntaSend redirected back with ?status=success ---
    if (hasSuccessParam && pendingOrderStr) {
        await _processAndGenerateTickets(pendingOrderStr);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    // Clean dangling ?status=success with no order
    if (hasSuccessParam && !pendingOrderStr) {
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    // --- Case 2: Mobile didn't redirect back — stuck on IntaSend's page ---
    // pendingOrder still in localStorage but no ?status=success in URL
    if (!hasSuccessParam && pendingOrderStr) {
        _showPendingOrderRecoveryBanner(pendingOrderStr);
    }
}

// Shared logic: save ticket, show modal, send email
async function _processAndGenerateTickets(pendingOrderStr, spinnerContainer = null) {
    try {
        const orderData = JSON.parse(pendingOrderStr);

        const container = spinnerContainer || document.querySelector('.payment-form-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:4rem 2rem;">
                    <div style="margin:0 auto 1.5rem;width:56px;height:56px;border:4px solid var(--gold);border-top-color:transparent;border-radius:50%;animation:spin 0.9s linear infinite;"></div>
                    <h2 style="color:var(--gold);margin-bottom:1rem;font-family:'Playfair Display',serif;font-size:2rem;">Generating your tickets…</h2>
                    <p style="color:var(--text-tertiary);">Please wait — do not close this page.</p>
                </div>
                <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
            `;
        }

        allGeneratedTickets = [];
        const saveResult = await TicketDB.saveTicket(orderData);

        if (!saveResult.success || !Array.isArray(saveResult.tickets) || saveResult.tickets.length === 0) {
            throw new Error(saveResult.error || 'Failed to create tickets');
        }

        const savedTickets = saveResult.tickets;
        allGeneratedTickets = savedTickets;
        currentTicketData = savedTickets[0];

        displayAllTickets(savedTickets);

        const successModal = document.getElementById('successModal');
        if (successModal) {
            successModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        console.log(`✅ ${savedTickets.length} ticket(s) generated successfully`);

        // Send emails in background
        sendMultiTicketEmail(savedTickets, orderData.email, orderData.guestEmails).catch(e => {
            console.error('Error sending emails in background:', e);
        });

    } catch (err) {
        console.error('Error generating tickets:', err);
        alert(err.message || 'There was an error generating your tickets. Please contact support at sapegalanairobi@gmail.com');
    } finally {
        localStorage.removeItem('sapePendingOrder');
    }
}

// Banner shown when payment was made on mobile but user never came back
function _showPendingOrderRecoveryBanner(pendingOrderStr) {
    let orderData;
    try { orderData = JSON.parse(pendingOrderStr); } catch { return; }

    // Don't show banner if the saved order is older than 2 hours (likely stale / abandoned)
    const savedAt = orderData._savedAt || 0;
    if (savedAt && (Date.now() - savedAt) > 2 * 60 * 60 * 1000) {
        localStorage.removeItem('sapePendingOrder');
        return;
    }

    const banner = document.createElement('div');
    banner.id = 'pendingOrderBanner';
    banner.style.cssText = `
        position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
        background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
        border-top: 2px solid #c59b64;
        padding: 1.25rem 1.5rem;
        display: flex; align-items: center; justify-content: space-between; gap: 1rem;
        flex-wrap: wrap;
        box-shadow: 0 -4px 24px rgba(0,0,0,0.5);
        animation: slideUp 0.4s ease;
    `;
    banner.innerHTML = `
        <style>@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}</style>
        <div style="flex:1;min-width:200px;">
            <p style="margin:0 0 0.25rem;color:#c59b64;font-weight:600;font-size:1rem;font-family:'Playfair Display',serif;">
                💳 Did you just pay?
            </p>
            <p style="margin:0;color:#aaa;font-size:0.85rem;line-height:1.4;">
                It looks like your M-Pesa payment went through but you weren't redirected back. Click the button to generate your ${orderData.ticketQuantity > 1 ? orderData.ticketQuantity + ' tickets' : 'ticket'} now.
            </p>
        </div>
        <div style="display:flex;gap:0.75rem;align-items:center;flex-shrink:0;">
            <button id="recoverTicketBtn" style="
                background: linear-gradient(135deg, #c59b64, #a07840);
                color: #fff; border: none; border-radius: 8px;
                padding: 0.75rem 1.4rem; font-size: 0.95rem; font-weight: 600;
                cursor: pointer; white-space: nowrap;
            ">✅ Get My Ticket</button>
            <button id="dismissBannerBtn" style="
                background: transparent; color: #666; border: 1px solid #444;
                border-radius: 8px; padding: 0.75rem 1rem;
                font-size: 0.85rem; cursor: pointer; white-space: nowrap;
            ">I didn't pay</button>
        </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('recoverTicketBtn').addEventListener('click', async () => {
        banner.remove();
        const currentPending = localStorage.getItem('sapePendingOrder');
        if (currentPending) {
            await _processAndGenerateTickets(currentPending);
        }
    });

    document.getElementById('dismissBannerBtn').addEventListener('click', () => {
        localStorage.removeItem('sapePendingOrder');
        banner.remove();
    });
}

window.addEventListener('pageshow', (event) => {
    // Determine if page is loaded from cache (e.g. Back button) or if IntaSend left artifacts
    if (event.persisted || performance.getEntriesByType("navigation")[0]?.type === "back_forward") {
        // Find and destroy any IntaSend full-screen iframes or overlays
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            if (iframe.src && iframe.src.includes('intasend')) {
                iframe.remove();
            }
        });
        
        // Remove IntaSend overlay divs that block the UI
        const overlays = document.querySelectorAll('div[class*="intasend"], div[id*="intasend"]');
        overlays.forEach(el => el.remove());
        
        document.body.style.overflow = '';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Check for redirect success from IntaSend mobile layout
    checkPendingOrderRedirect();

    // Fade in page on load
    document.body.classList.remove('transitioning');
    
    // Handle navigation with transitions
    const links = document.querySelectorAll('a[href^="index.html"]');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.add('transitioning');
            
            setTimeout(() => {
                window.location.href = link.getAttribute('href');
            }, 600);
        });
    });

    // Initialize payment page functionality
    initializePaymentPage();
});

function initializePaymentPage() {
    // Ticket type and quantity selection
    const ticketTypeSelect = document.getElementById('ticketType');
    const ticketQuantitySelect = document.getElementById('ticketQuantity');
    const totalAmountEl = document.getElementById('totalAmount');
    const additionalNamesSection = document.getElementById('additionalNamesSection');
    const additionalNamesContainer = document.getElementById('additionalNamesContainer');
    
    // Update total price when ticket type or quantity changes
    function updateTotalPrice() {
        const price = parseInt(ticketTypeSelect.value);
        const quantity = parseInt(ticketQuantitySelect.value);
        const total = price * quantity;
        totalAmountEl.textContent = `KES ${total.toLocaleString()}`;
    }
    
    // Generate additional name + email input fields per guest
    function updateAdditionalNameFields() {
        const quantity = parseInt(ticketQuantitySelect.value);
        
        if (quantity > 1) {
            additionalNamesSection.style.display = 'block';
            additionalNamesContainer.innerHTML = '';
            
            for (let i = 2; i <= quantity; i++) {
                const fieldGroup = document.createElement('div');
                fieldGroup.style.marginBottom = '1.5rem';
                fieldGroup.innerHTML = `
                    <p style="color: var(--gold); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08rem; margin-bottom: 0.8rem;">Ticket ${i}</p>
                    <div class="form-group" style="margin-bottom: 0.8rem;">
                        <label for="additionalName${i}" class="form-label">Guest Name (Optional)</label>
                        <input type="text" id="additionalName${i}" class="form-input" placeholder="Leave blank to use primary contact name">
                    </div>
                    <div class="form-group">
                        <label for="additionalEmail${i}" class="form-label">Guest Email (Optional)</label>
                        <input type="email" id="additionalEmail${i}" class="form-input" placeholder="Leave blank to send to primary contact email">
                    </div>
                `;
                additionalNamesContainer.appendChild(fieldGroup);
            }
        } else {
            additionalNamesSection.style.display = 'none';
            additionalNamesContainer.innerHTML = '';
        }
    }
    
    if (ticketTypeSelect) {
        ticketTypeSelect.addEventListener('change', updateTotalPrice);
    }
    
    if (ticketQuantitySelect) {
        ticketQuantitySelect.addEventListener('change', () => {
            updateTotalPrice();
            updateAdditionalNameFields();
        });
    }
    
    // Early Bird Automation
    const LAUNCH_DATE_STR = '2026-04-01T00:00:00Z'; // Placeholder: update with actual launch date
    const LAUNCH_DATE = new Date(LAUNCH_DATE_STR);
    const EARLY_BIRD_DEADLINE = new Date(LAUNCH_DATE.getTime() + (9 * 24 * 60 * 60 * 1000));
    
    if (new Date() > EARLY_BIRD_DEADLINE && ticketTypeSelect) {
        Array.from(ticketTypeSelect.options).forEach(option => {
            if (option.text.includes('Early Bird')) {
                ticketTypeSelect.removeChild(option);
            }
        });
    }

    // Organizer Access Code logic
    const accessCodeInput = document.getElementById('accessCode');
    const orgOption = document.getElementById('orgOption');
    if (accessCodeInput && orgOption && ticketTypeSelect) {
        accessCodeInput.addEventListener('input', (e) => {
            if (e.target.value.trim().toUpperCase() === 'SAPE-ORG-2026') {
                orgOption.hidden = false;
                orgOption.disabled = false;
                ticketTypeSelect.value = "0";
            } else {
                orgOption.hidden = true;
                orgOption.disabled = true;
                if (ticketTypeSelect.value === "0") {
                    ticketTypeSelect.value = "5000"; // Reset to standard
                }
            }
            if (typeof updateTotalPrice === 'function') updateTotalPrice();
        });
    }
    
    // Form submission
    const paymentForm = document.getElementById('paymentForm');
    
    if (paymentForm) {
        paymentForm.addEventListener('submit', handlePaymentSubmit);
    }
    
    // Close modal on overlay click
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', () => {
            const successModal = document.getElementById('successModal');
            successModal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // Input formatters
    setupInputFormatters();
}

async function handlePaymentSubmit(e) {
    e.preventDefault();

    // Read form values
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = normalizePhone(document.getElementById('phone').value.trim());
    const ticketTypeSelect = document.getElementById('ticketType');
    const ticketType = ticketTypeSelect.options[ticketTypeSelect.selectedIndex].text;
    const ticketPrice = Number(ticketTypeSelect.value);
    const ticketQuantity = parseInt(document.getElementById('ticketQuantity').value);
    const accessCode = document.getElementById('accessCode') ? document.getElementById('accessCode').value.trim().toUpperCase() : '';
    const totalAmount = ticketPrice * ticketQuantity;
    const isComplimentary = ticketPrice === 0;

    // Basic validation
    if (!fullName || !email || !phone) {
        alert('Please fill in all required fields.');
        return;
    }
    if (!isValidEmail(email)) {
        alert('Please enter a valid email address.');
        return;
    }
    if (!/^\+?[0-9]{10,15}$/.test(phone)) {
        alert('Please enter a valid phone number.');
        return;
    }

    // Collect guest names & emails for multi-ticket orders
    const guestNames = [fullName];
    const guestEmails = [email];
    if (ticketQuantity > 1) {
        for (let i = 2; i <= ticketQuantity; i++) {
            const nameEl = document.getElementById(`additionalName${i}`);
            const emailEl = document.getElementById(`additionalEmail${i}`);
            const gName = nameEl ? nameEl.value.trim() : '';
            const gEmail = emailEl ? emailEl.value.trim() : '';
            guestNames.push(gName || fullName);
            guestEmails.push((gEmail && isValidEmail(gEmail)) ? gEmail : email);
        }
    }

    const submitButton = e.target.querySelector('.submit-button');
    const originalButtonText = submitButton.innerHTML;

    // Helper: save ticket + send email after confirmed payment
    async function finaliseOrder(paymentMethod) {
        submitButton.innerHTML = '<span>Generating tickets...</span>';
        submitButton.disabled = true;
        try {
            allGeneratedTickets = [];
            const saveResult = await TicketDB.saveTicket({
                fullName, email, phone,
                ticketType,
                ticketPrice,
                ticketQuantity,
                paymentMethod,
                guestNames,
                guestEmails,
                accessCode
            });

            if (!saveResult.success || !Array.isArray(saveResult.tickets) || saveResult.tickets.length === 0) {
                throw new Error(saveResult.error || 'Failed to create tickets');
            }

            const savedTickets = saveResult.tickets;
            allGeneratedTickets = savedTickets;
            currentTicketData = savedTickets[0];

            displayAllTickets(savedTickets);

            const successModal = document.getElementById('successModal');
            successModal.classList.add('active');
            document.body.style.overflow = 'hidden';

            document.getElementById('paymentForm').reset();
            document.getElementById('totalAmount').textContent = 'KES 5,000';
            document.getElementById('ticketQuantity').value = '1';
            document.getElementById('additionalNamesSection').style.display = 'none';

            console.log(`✅ ${savedTickets.length} ticket(s) generated successfully`);

            // Send emails in background without blocking UI
            sendMultiTicketEmail(savedTickets, email, guestEmails).catch(e => {
                console.error('Error sending emails in background:', e);
            });
        } catch (err) {
            console.error('Error generating tickets:', err);
            alert(err.message || 'There was an error completing your order. Please try again.');
        } finally {
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    }

    // --- Complimentary (organizer) tickets skip payment ---
    if (isComplimentary) {
        await finaliseOrder('complimentary');
        return;
    }

    // --- IntaSend M-Pesa STK Push ---
    submitButton.innerHTML = '<span>Opening M-Pesa...</span>';
    submitButton.disabled = true;

    try {
        if (!window.intaSendInstance) {
            window.intaSendInstance = new window.IntaSend({
                publicAPIKey: INTASEND_PUBLIC_KEY,
                live: true
            })
            .on('COMPLETE', async (response) => {
                console.log('✅ IntaSend payment complete:', response);
                if (window.currentPaymentFinaliseCallback) {
                    await window.currentPaymentFinaliseCallback('intasend-mpesa');
                }
            })
            .on('FAILED', (response) => {
                console.error('❌ IntaSend payment failed:', response);
                alert('Payment failed or was cancelled. Please try again.');
                const submitBtn = document.getElementById('payNowBtn');
                if (submitBtn) {
                    submitBtn.innerHTML = `
                        <span>Pay with M-Pesa</span>
                        <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>`;
                    submitBtn.disabled = false;
                }
            });
        }

        // Store the callback for desktop inline usage
        window.currentPaymentFinaliseCallback = finaliseOrder;

        // Store the order data in localStorage in case of a mobile redirect
        const pendingOrder = {
            fullName, email, phone, ticketType, ticketPrice, ticketQuantity, paymentMethod: 'intasend-mpesa', guestNames, guestEmails, accessCode,
            _savedAt: Date.now()
        };
        localStorage.setItem('sapePendingOrder', JSON.stringify(pendingOrder));

        // Update IntaSend hidden button attributes and click it
        const hiddenBtn = document.getElementById('hiddenIntaSendBtn');
        if (hiddenBtn) {
            hiddenBtn.dataset.amount = totalAmount.toString();
            hiddenBtn.dataset.currency = "KES";
            hiddenBtn.dataset.email = email;
            hiddenBtn.dataset.phone_number = phone.replace('+', '');
            hiddenBtn.dataset.first_name = fullName;
            // On mobile devices, IntaSend redirects the entire page. Let's make sure it comes back here.
            hiddenBtn.dataset.redirect_url = window.location.origin + window.location.pathname + "?status=success";
            hiddenBtn.click();

            // Provide a manual fallback for mobile users who don't get redirected automatically
            // or who press the "Back" button on their browser.
            setTimeout(() => {
                const btn = document.getElementById('payNowBtn');
                if (btn) {
                    btn.innerHTML = `
                        <span>Paid? Click to Get Tickets</span>
                        <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    `;
                    btn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
                    btn.disabled = false;
                    
                    // Replace the form submission to just finalize
                    const form = document.getElementById('paymentForm');
                    form.onsubmit = async (ev) => {
                        ev.preventDefault();
                        await finaliseOrder('intasend-mpesa');
                    };
                }
            }, 5000);
        } else {
            throw new Error("Hidden IntaSend button not found. Please refresh.");
        }
    } catch (err) {
        console.error('IntaSend error:', err);
        alert('Could not launch payment. Please refresh and try again.');
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
    }
}

function generateQRCode(ticketId) {
    // Clear previous QR code
    const qrcodeContainer = document.getElementById('qrcodeContainer');
    qrcodeContainer.innerHTML = '';
    
    // Generate new QR code
    new QRCode(qrcodeContainer, {
        text: ticketId,
        width: 200,
        height: 200,
        colorDark: "#0a0a0a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

function displayTicketInfo(ticketData) {
    document.getElementById('displayTicketId').textContent = ticketData.ticketId;
    document.getElementById('displayGuestName').textContent = ticketData.fullName;
    document.getElementById('displayEmail').textContent = ticketData.email;
    document.getElementById('displayTicketType').textContent = ticketData.ticketType;
}

// Display all tickets in the modal
function displayAllTickets(tickets) {
    const ticketsContainer = document.getElementById('ticketsContainer');
    const successMessage = document.getElementById('successMessage');
    const downloadButton = document.getElementById('downloadButton');
    
    ticketsContainer.innerHTML = '';
    
    if (tickets.length > 1) {
        successMessage.textContent = `${tickets.length} tickets have been generated and sent to your email address.`;
        downloadButton.querySelector('span').textContent = `Download All Tickets (${tickets.length})`;
    } else {
        successMessage.textContent = 'Your ticket has been generated and sent to your email address.';
        downloadButton.querySelector('span').textContent = 'Download Ticket';
    }
    
    tickets.forEach((ticketData, index) => {
        // Create container for each ticket
        const ticketElement = document.createElement('div');
        ticketElement.className = 'ticket-display';
        ticketElement.style.marginBottom = tickets.length > 1 ? '2rem' : '0';

        const ticketLogo = document.createElement('img');
        ticketLogo.src = TICKET_LOGO_SRC;
        ticketLogo.alt = 'SAPE Gala Logo';
        ticketLogo.width = 56;
        ticketLogo.height = 56;
        ticketLogo.style.cssText = 'display:block; margin:0 auto 0.5rem; object-fit:contain;';
        ticketElement.appendChild(ticketLogo);
        
        if (tickets.length > 1) {
            const ticketHeader = document.createElement('h4');
            ticketHeader.style.cssText = 'font-family: "Playfair Display", serif; color: var(--gold); margin-bottom: 1rem; font-size: 1.2rem;';
            ticketHeader.textContent = `Ticket ${index + 1} of ${tickets.length}`;
            ticketElement.appendChild(ticketHeader);
        }
        
        // Create QR code container
        const qrContainer = document.createElement('div');
        qrContainer.className = 'ticket-qr';
        qrContainer.id = `qrcode-${index}`;
        
        // Generate QR code
        new QRCode(qrContainer, {
            text: ticketData.ticketId,
            width: 200,
            height: 200,
            colorDark: "#0a0a0a",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        
        // Create ticket info
        const ticketInfo = document.createElement('div');
        ticketInfo.className = 'ticket-info';
        ticketInfo.innerHTML = `
            <div class="ticket-field">
                <span class="ticket-field-label">Ticket ID</span>
                <span class="ticket-field-value">${escapeHtml(ticketData.ticketId)}</span>
            </div>
            <div class="ticket-field">
                <span class="ticket-field-label">Guest Name</span>
                <span class="ticket-field-value">${escapeHtml(ticketData.fullName)}</span>
            </div>
            <div class="ticket-field">
                <span class="ticket-field-label">Email</span>
                <span class="ticket-field-value">${escapeHtml(ticketData.email)}</span>
            </div>
            <div class="ticket-field">
                <span class="ticket-field-label">Ticket Type</span>
                <span class="ticket-field-value">${escapeHtml(ticketData.ticketType)}</span>
            </div>
        `;
        
        ticketElement.appendChild(qrContainer);
        ticketElement.appendChild(ticketInfo);
        ticketsContainer.appendChild(ticketElement);
        
        // Add separator between tickets
        if (index < tickets.length - 1) {
            const separator = document.createElement('div');
            separator.style.cssText = 'border-top: 1px solid var(--border-color); margin: 2rem 0;';
            ticketsContainer.appendChild(separator);
        }
    });
}

// Download all tickets
function downloadAllTickets() {
    if (allGeneratedTickets.length === 0) {
        alert('No tickets available to download');
        return;
    }
    
    // Download each ticket with a small delay between downloads
    allGeneratedTickets.forEach((ticketData, index) => {
        setTimeout(() => {
            downloadSingleTicket(ticketData, index);
        }, index * 500); // 500ms delay between downloads
    });
}

// Download a single ticket (modified from downloadTicket)
async function downloadSingleTicket(ticketData, qrIndex = 0) {
    if (!ticketData) {
        alert('No ticket data available');
        return;
    }
    
    // Determine ticket category and colors
    let ticketCategory = 'STANDARD';
    let bgColor = '#5e1c2b'; // Burgundy for Standard
    let ticketLabel = 'TICKET';
    
    if (ticketData.ticketType.includes('Early Bird')) {
        ticketCategory = 'EARLY BIRD';
        bgColor = '#1a3a2e'; // Dark green for Early Bird
    } else if (ticketData.ticketType.includes('Organizer')) {
        ticketCategory = 'ORGANIZER';
        bgColor = '#2d2d2d'; // Dark gray
        ticketLabel = 'COMPLIMENTARY';
    } else if (ticketData.ticketType.includes('VVIP')) {
        ticketCategory = 'VVIP';
        bgColor = '#000000'; // Black for VVIP
        ticketLabel = '— VVIP —';
    } else if (ticketData.ticketType.includes('VIP')) {
        ticketCategory = 'VIP';
        bgColor = '#1a3a2e'; // Dark green for VIP
        ticketLabel = '— VIP —';
    }
    
    // Create a canvas to draw the ticket (landscape orientation)
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 380;
    const ctx = canvas.getContext('2d');
    
    // Background with gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, bgColor);
    gradient.addColorStop(0.5, bgColor);
    gradient.addColorStop(1, bgColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add subtle pattern/texture
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let i = 0; i < canvas.width; i += 60) {
        ctx.fillRect(i, 0, 1, canvas.height);
    }
    for (let i = 0; i < canvas.height; i += 60) {
        ctx.fillRect(0, i, canvas.width, 1);
    }
    
    // Perforated edges (torn ticket effect)
    ctx.fillStyle = '#ffffff';
    const perfSize = 12;
    const perfGap = perfSize * 2;
    
    // Left edge perforations
    for (let y = 0; y < canvas.height; y += perfGap) {
        ctx.beginPath();
        ctx.arc(0, y, perfSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Right edge perforations
    for (let y = 0; y < canvas.height; y += perfGap) {
        ctx.beginPath();
        ctx.arc(canvas.width, y, perfSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Vertical dividing lines with perforations (creating 3 sections)
    const section1Width = 310;
    const section2Width = 630;
    
    // First divider (after left section)
    ctx.strokeStyle = 'rgba(197, 155, 100, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(section1Width, 0);
    ctx.lineTo(section1Width, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Perforations on first divider
    ctx.fillStyle = '#ffffff';
    for (let y = 0; y < canvas.height; y += perfGap) {
        ctx.beginPath();
        ctx.arc(section1Width, y, perfSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Second divider (after middle section)
    ctx.strokeStyle = 'rgba(197, 155, 100, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(section1Width + section2Width, 0);
    ctx.lineTo(section1Width + section2Width, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Perforations on second divider
    ctx.fillStyle = '#ffffff';
    for (let y = 0; y < canvas.height; y += perfGap) {
        ctx.beginPath();
        ctx.arc(section1Width + section2Width, y, perfSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // === LEFT SECTION: Branding ===
    const leftX = section1Width / 2;
    const ticketLogo = await loadTicketLogo();

    // Draw larger logo image if available, otherwise fallback initials
    if (ticketLogo) {
        const logoWidth = 124;
        const logoHeight = 124;
        const logoX = leftX - (logoWidth / 2);
        const logoY = 14;
        ctx.drawImage(ticketLogo, logoX, logoY, logoWidth, logoHeight);
    } else {
        ctx.fillStyle = '#c59b64';
        ctx.font = 'bold 34px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SG', leftX, 76);
    }
    
    // Left section text block
    ctx.fillStyle = '#c59b64';
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px serif';
    ctx.fillText('NAIROBI SAPE GALA', leftX, 168);
    
    ctx.font = '12px serif';
    ctx.fillText('2026 EDITION', leftX, 188);
    
    // Decorative line
    ctx.strokeStyle = '#c59b64';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftX - 78, 202);
    ctx.lineTo(leftX + 78, 202);
    ctx.stroke();
    
    // Ticket category badge
    if (ticketCategory === 'VVIP') {
        ctx.fillStyle = 'rgba(197, 155, 100, 0.2)';
        ctx.fillRect(leftX - 98, 220, 196, 76);
        
        ctx.fillStyle = '#c59b64';
        ctx.font = 'bold 14px serif';
        ctx.fillText('— VVIP —', leftX, 244);
        ctx.font = '18px serif';
        ctx.fillText('KES 20,000', leftX, 276);
    } else if (ticketCategory === 'VIP') {
        ctx.fillStyle = 'rgba(197, 155, 100, 0.2)';
        ctx.fillRect(leftX - 98, 220, 196, 76);
        
        ctx.fillStyle = '#c59b64';
        ctx.font = 'bold 14px serif';
        ctx.fillText('— VIP —', leftX, 244);
        ctx.font = '18px serif';
        ctx.fillText('KES 10,000', leftX, 276);
    } else if (ticketCategory === 'ORGANIZER') {
        ctx.fillStyle = 'rgba(197, 155, 100, 0.2)';
        ctx.fillRect(leftX - 98, 220, 196, 76);
        
        ctx.fillStyle = '#c59b64';
        ctx.font = 'bold 12px serif';
        ctx.fillText('— ORGANIZER —', leftX, 244);
        ctx.font = '16px serif';
        ctx.fillText('COMPLIMENTARY', leftX, 276);
    } else {
        ctx.fillStyle = '#c59b64';
        ctx.font = 'bold 30px serif';
        ctx.fillText(ticketCategory, leftX, 258);
    }
    
    // === MIDDLE SECTION: Event Details ===
    const midX = section1Width + 40;
    let midY = 50;
    
    // Header
    ctx.fillStyle = '#c59b64';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('NAIROBI', midX, midY);
    
    ctx.font = 'bold 48px serif';
    midY += 55;
    ctx.fillText('SAPE GALA', midX, midY);
    
    ctx.font = '20px serif';
    midY += 30;
    ctx.fillText('— 2026 EDITION —', midX, midY);
    
    // Divider
    ctx.strokeStyle = 'rgba(197, 155, 100, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    midY += 20;
    ctx.moveTo(midX, midY);
    ctx.lineTo(midX + 550, midY);
    ctx.stroke();
    
    // Event details
    ctx.fillStyle = '#e8d4b0';
    ctx.font = 'bold 22px serif';
    midY += 35;
    ctx.fillText(ticketCategory, midX, midY);
    
    ctx.fillStyle = '#c59b64';
    ctx.font = '18px sans-serif';
    midY += 35;
    ctx.fillText('23 MAY 2026 | DOORS OPEN AT 3PM', midX, midY);
    
    // Venue
    midY += 35;
    ctx.fillText('EMARA OLE-SERENI, NAIROBI', midX, midY);
    
    // === RIGHT SECTION: Ticket Info & QR ===
    const rightX = section1Width + section2Width + 20;
    const rightCenterX = section1Width + section2Width + (canvas.width - section1Width - section2Width) / 2;
    
    // "TICKET" header
    ctx.fillStyle = '#c59b64';
    ctx.font = 'bold 28px serif';
    ctx.textAlign = 'center';
    ctx.fillText(ticketLabel === '— VIP —' || ticketLabel === '— VVIP —' ? ticketLabel : 'TICKET', rightCenterX, 45);
    
    // Decorative line
    ctx.strokeStyle = '#c59b64';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rightCenterX - 80, 55);
    ctx.lineTo(rightCenterX + 80, 55);
    ctx.stroke();
    
    // Price
    ctx.fillStyle = '#e8d4b0';
    ctx.font = 'bold 36px serif';
    let price = parseInt(ticketData.ticketPrice).toLocaleString();
    ctx.fillText(`KES ${price}`, rightCenterX, 95);
    
    // QR Code - Get from specific container using qrIndex
    const qrcodeCanvas = document.querySelector(`#qrcode-${qrIndex} canvas`);
    if (qrcodeCanvas) {
        const qrSize = 100;
        const qrX = rightCenterX - qrSize / 2;
        const qrY = 120;
        
        // White background for QR
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);
        
        // Draw QR code
        ctx.drawImage(qrcodeCanvas, qrX, qrY, qrSize, qrSize);
    }
    
    // Decorative line
    ctx.strokeStyle = '#c59b64';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rightCenterX - 80, 245);
    ctx.lineTo(rightCenterX + 80, 245);
    ctx.stroke();
    
    // Ticket number
    ctx.fillStyle = '#c59b64';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NO. ' + ticketData.ticketId.split('-')[1], rightCenterX, 270);
    
    // Guest name
    ctx.fillStyle = '#e8d4b0';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    const maxNameWidth = 200;
    let guestName = ticketData.fullName.toUpperCase();
    if (ctx.measureText(guestName).width > maxNameWidth) {
        ctx.font = '12px sans-serif';
    }
    ctx.fillText(guestName, rightCenterX, 295);
    
    // Event date & time
    ctx.fillStyle = '#c59b64';
    ctx.font = '10px sans-serif';
    ctx.fillText('23 MAY 2026 | 3PM', rightCenterX, 320);
    
    ctx.fillText('EMARA OLE-SERENI, NAIROBI', rightCenterX, 335);
    
    // Border around entire ticket
    ctx.strokeStyle = 'rgba(197, 155, 100, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    
    // Convert to image and download with guest name in filename
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = ticketData.fullName.replace(/\s+/g, '-');
        a.download = `SAPE2026-Ticket-${ticketData.ticketId}-${safeName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

// Send individual email confirmation to each guest
async function sendMultiTicketEmail(tickets, primaryEmail, guestEmails = []) {
    console.log(`Preparing to send ${tickets.length} ticket email(s)`);
    
    try {
        const functionUrl = 'https://us-central1-sape-gala-2026.cloudfunctions.net/sendTicketEmail';
        
        // Send one individual email per ticket to the guest's own email address sequentially
        const results = [];
        for (let index = 0; index < tickets.length; index++) {
            const ticket = tickets[index];
            const recipientEmail = guestEmails[index] || primaryEmail;
            
            const ticketData = {
                name: ticket.fullName,
                email: recipientEmail,
                ticketType: ticket.ticketType,
                ticketId: ticket.ticketId,
                totalAmount: ticket.ticketPrice,
                purchaseDate: ticket.purchaseDate,
                ticketPrice: ticket.ticketPrice,
                qrCode: ticket.ticketId
            };
            
            try {
                const response = await fetch(functionUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data: {
                            to: recipientEmail,
                            ticketData: ticketData,
                            qrCode: ticket.ticketId
                        }
                    })
                });
                const resJson = await response.json();
                results.push(resJson);
            } catch (err) {
                console.error(`Failed to send email to ${recipientEmail}:`, err);
                results.push({ success: false, error: err.message });
            }
            
            // Wait 1 second between requests to prevent hitting Resend's API rate limit (2 req/sec)
            if (index < tickets.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log('All ticket emails processed:', results);
        return { success: true, message: 'Emails sent successfully' };
        
    } catch (error) {
        console.error('Failed to send emails:', error);
        return { success: false, error: error.message };
    }
}

function setupInputFormatters() {
    // Format phone number input
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.startsWith('254')) {
                value = '+' + value;
            } else if (value.startsWith('0')) {
                value = '+254' + value.substring(1);
            }
            e.target.value = value;
        });
    }
    

    // Format card number
    const cardNumber = document.getElementById('cardNumber');
    if (cardNumber) {
        cardNumber.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });
    }
    
    // Format expiry date
    const expiryInput = document.getElementById('expiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }
    
    // Limit CVV to 3 digits
    const cvvInput = document.getElementById('cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 3);
        });
    }
}

// Add loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});

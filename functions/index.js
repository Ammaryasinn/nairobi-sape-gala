/**
 * Firebase Cloud Functions for SAPE Gala 2026
 *
 * Required environment variables:
 * - BREVO_API_KEY  (Brevo / Sendinblue transactional email API key)
 * Optional environment variables:
 * - ALLOWED_ORIGINS (comma-separated list of trusted site origins)
 */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const crypto = require('crypto');

admin.initializeApp();

const db = admin.firestore();

const DEFAULT_ALLOWED_ORIGINS = [
    'https://sapegalanairobi.com',
    'https://www.sapegalanairobi.com',
    'https://sape-gala-2026.web.app',
    'https://sape-gala-2026.firebaseapp.com',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8042',
    'http://127.0.0.1:8042',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

const TICKET_TYPES = {
    'Early Bird — KES 3,000 (Available for 9 days only)': 3000,
    'Standard — KES 5,000': 5000,
    'VIP — KES 10,000': 10000,
    'VVIP — KES 20,000': 20000,
    'Organizer (Complimentary) — KES 0': 0,
    'Test Ticket (Admin Only) — KES 10': 10
};

const LAUNCH_DATE_STR = '2026-04-01T00:00:00Z'; // Placeholder: update with actual launch date

const PUBLIC_LOGO_URL = process.env.PUBLIC_LOGO_URL || 'https://sapegalanairobi.com/images/sape-logo.png';

function getAllowedOrigins() {
    const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);

    return configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS;
}

function setCorsHeaders(req, res) {
    const origin = req.get('origin') || '';
    if (origin && getAllowedOrigins().includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
        res.set('Vary', 'Origin');
    }

    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Cache-Control', 'no-store');
}

function handlePreflight(req, res) {
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return true;
    }

    return false;
}

function ensureAllowedOrigin(req, res) {
    const origin = req.get('origin') || '';

    if (!origin || !getAllowedOrigins().includes(origin)) {
        setCorsHeaders(req, res);
        res.status(403).json({
            error: {
                message: 'Request origin is not allowed.'
            }
        });
        return false;
    }

    setCorsHeaders(req, res);
    return true;
}

function getBrevoApiKey() {
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
        throw new Error('BREVO_API_KEY is not configured. Set it before deploying email functions.');
    }

    return apiKey.trim();
}

function getClientIp(req) {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
        return forwardedFor.split(',')[0].trim();
    }

    return req.ip || 'unknown';
}

async function enforceRateLimit(req, action, maxRequests, windowMs) {
    const ip = getClientIp(req);
    const docId = `${action}:${ip.replace(/[^a-zA-Z0-9:.-]/g, '_')}`;
    const docRef = db.collection('_rate_limits').doc(docId);
    const now = Date.now();

    await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(docRef);
        const data = snapshot.exists ? snapshot.data() : null;
        const windowStart = data && typeof data.windowStart === 'number' ? data.windowStart : now;
        const expired = now - windowStart >= windowMs;
        const count = expired ? 0 : (data && typeof data.count === 'number' ? data.count : 0);

        if (count >= maxRequests) {
            const error = new Error('Too many requests. Please try again later.');
            error.statusCode = 429;
            throw error;
        }

        transaction.set(docRef, {
            action,
            ip,
            count: count + 1,
            windowStart: expired ? now : windowStart,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    });
}

function parsePayload(req) {
    return req.body && typeof req.body === 'object'
        ? (req.body.data || req.body)
        : {};
}

function sanitizeText(value, fieldName, maxLength = 120) {
    if (typeof value !== 'string') {
        const error = new Error(`${fieldName} must be a string.`);
        error.statusCode = 400;
        throw error;
    }

    const trimmed = value.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
        const error = new Error(`${fieldName} is required.`);
        error.statusCode = 400;
        throw error;
    }

    if (trimmed.length > maxLength) {
        const error = new Error(`${fieldName} is too long.`);
        error.statusCode = 400;
        throw error;
    }

    return trimmed;
}

function validateEmail(value) {
    const email = sanitizeText(value, 'Email address', 160).toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        const error = new Error('Email address is invalid.');
        error.statusCode = 400;
        throw error;
    }

    return email;
}

function validatePhone(value) {
    const phone = sanitizeText(value, 'Phone number', 20).replace(/\s+/g, '');
    const phonePattern = /^\+?[0-9]{10,15}$/;

    if (!phonePattern.test(phone)) {
        const error = new Error('Phone number is invalid.');
        error.statusCode = 400;
        throw error;
    }

    return phone;
}

function validatePaymentMethod(value) {
    const allowed = ['bank', 'intasend-mpesa', 'complimentary'];
    if (!allowed.includes(value)) {
        const error = new Error('Invalid payment method.');
        error.statusCode = 400;
        throw error;
    }

    return value;
}

function validateTicketType(ticketType, ticketPrice, accessCode) {
    const normalizedType = sanitizeText(ticketType, 'Ticket type', 60);
    const normalizedPrice = Number(ticketPrice);

    if (!Number.isInteger(normalizedPrice) || TICKET_TYPES[normalizedType] !== normalizedPrice) {
        const error = new Error('Ticket type or ticket price is invalid.');
        error.statusCode = 400;
        throw error;
    }

    if (normalizedType.includes('Early Bird')) {
        const launchDate = new Date(LAUNCH_DATE_STR);
        const earlyBirdDeadline = new Date(launchDate.getTime() + (9 * 24 * 60 * 60 * 1000));
        if (new Date() > earlyBirdDeadline) {
            const error = new Error('Early Bird tickets are no longer available.');
            error.statusCode = 400;
            throw error;
        }
    }

    if (normalizedType.includes('Organizer')) {
        if (typeof accessCode !== 'string' || accessCode.trim().toUpperCase() !== 'SAPE-ORG-2026') {
            const error = new Error('Invalid or missing access code for complimentary tickets.');
            error.statusCode = 403;
            throw error;
        }
    }

    return {
        ticketType: normalizedType,
        ticketPrice: normalizedPrice
    };
}

function validateQuantity(value) {
    const quantity = Number(value);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        const error = new Error('Ticket quantity must be between 1 and 10.');
        error.statusCode = 400;
        throw error;
    }

    return quantity;
}

function validateGuestNames(guestNames, quantity, fullName) {
    if (!Array.isArray(guestNames) || guestNames.length !== quantity) {
        const error = new Error('Guest names are invalid.');
        error.statusCode = 400;
        throw error;
    }

    return guestNames.map((name, index) => {
        const fallbackName = index === 0 ? fullName : fullName;
        const safeName = typeof name === 'string' && name.trim() ? name : fallbackName;
        return sanitizeText(safeName, `Guest name ${index + 1}`, 120);
    });
}

function generateTicketId() {
    return `SAPE2026-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatPurchaseDate(value) {
    const parsedDate = value ? new Date(value) : new Date();

    return parsedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function buildTicketEmailHtml(ticketData, qrCode, tickets = null) {
    const ticketsToRender = (tickets && Array.isArray(tickets) && tickets.length > 0) 
        ? tickets 
        : [{ ...ticketData, ticketId: qrCode }];

    const primaryTicket = ticketsToRender[0];
    const primaryName = escapeHtml(primaryTicket.name || primaryTicket.fullName || 'Guest');
    
    const ticketCardsHtml = ticketsToRender.map(ticket => {
        const qr = ticket.ticketId || ticket.qrCode || qrCode;
        const url = `https://quickchart.io/qr?text=${encodeURIComponent(qr)}&size=200&margin=1&dark=0a0a0a&light=ffffff&ecLevel=H`;
        const name = escapeHtml(ticket.name || ticket.fullName || ticket.guestName || primaryName);
        const email = escapeHtml(ticket.email || primaryTicket.email || '');
        const type = escapeHtml(ticket.ticketType || 'General Admission');
        const amount = Number(ticket.totalAmount || ticket.ticketPrice || 0).toLocaleString();
        const date = formatPurchaseDate(ticket.purchaseDate);
        
        return `
            <div class="ticket-card">
                <div class="qr-section">
                    <img src="${url}" alt="Ticket QR Code" />
                    <p class="qr-label">Scan this code at the entrance</p>
                </div>
                <div class="divider"></div>
                <div class="ticket-row">
                    <div class="ticket-label">Ticket ID</div>
                    <div class="ticket-value ticket-id">${escapeHtml(qr)}</div>
                </div>
                <div class="ticket-row">
                    <div class="ticket-label">Name</div>
                    <div class="ticket-value">${name}</div>
                </div>
                <div class="ticket-row">
                    <div class="ticket-label">Ticket Type</div>
                    <div class="ticket-value">${type}</div>
                </div>
                <div class="ticket-row">
                    <div class="ticket-label">Amount Paid</div>
                    <div class="ticket-value">KES ${amount}</div>
                </div>
                <div class="ticket-row">
                    <div class="ticket-label">Purchase Date</div>
                    <div class="ticket-value">${date}</div>
                </div>
            </div>
        `;
    }).join("");

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Nairobi SAPE Gala Tickets</title>
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f3ef; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); padding: 40px 20px; text-align: center; }
        .logo { width: 170px; margin: 0 auto 20px; }
        .logo img { width: 100%; height: auto; object-fit: contain; display: block; }
        .header h1 { color: #fdfbf7; font-size: 2rem; margin: 10px 0; font-family: Georgia, serif; }
        .header p { color: #c59b64; font-size: 1.1rem; font-style: italic; margin: 10px 0; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 1.2rem; color: #2d2d2d; margin-bottom: 20px; }
        .ticket-card { background: #fdfbf7; border: 2px solid #c59b64; border-radius: 15px; padding: 30px; margin: 30px 0; }
        .qr-section { text-align: center; margin-bottom: 30px; }
        .qr-section img { width: 200px; height: 200px; border: 3px solid #c59b64; border-radius: 10px; }
        .qr-label { color: #c59b64; font-size: 0.9rem; text-transform: uppercase; margin-top: 10px; }
        .ticket-row { padding: 15px 0; border-bottom: 1px solid #e0e0e0; }
        .ticket-row:last-child { border-bottom: none; }
        .ticket-label { color: #c59b64; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px; }
        .ticket-value { color: #2d2d2d; font-weight: 500; font-size: 1.1rem; margin-top: 5px; }
        .ticket-id { font-family: 'Courier New', monospace; font-size: 1.2rem; font-weight: 700; color: #c59b64; }
        .event-details { background: #1a1a1a; padding: 30px; border-radius: 10px; margin: 30px 0; color: #fdfbf7; }
        .event-details h3 { color: #c59b64; text-align: center; margin-bottom: 20px; font-size: 1.5rem; font-family: Georgia, serif; }
        .event-info { margin-bottom: 15px; line-height: 1.6; }
        .event-info strong { color: #c59b64; display: block; margin-bottom: 5px; font-size: 0.9rem; }
        .instructions { background: #fffbf5; border-left: 4px solid #c59b64; padding: 20px; margin: 30px 0; }
        .instructions h4 { color: #c59b64; margin-top: 0; }
        .instructions ul { margin: 10px 0; padding-left: 20px; }
        .instructions li { margin: 8px 0; color: #2d2d2d; }
        .footer { background: #f5f3ef; padding: 30px; text-align: center; color: #6b6662; }
        .footer p { margin: 8px 0; font-size: 0.9rem; }
        .footer a { color: #c59b64; text-decoration: none; }
        .divider { height: 2px; background: linear-gradient(90deg, transparent, #c59b64, transparent); margin: 30px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <img src="${PUBLIC_LOGO_URL}" alt="SAPE Gala Logo">
            </div>
            <h1>Nairobi SAPE Gala 2026</h1>
            <p>Style, Culture & Opportunity</p>
        </div>

        <div class="content">
            <p class="greeting">Dear ${primaryName},</p>
            <p style="font-size: 1.1rem; line-height: 1.8; color: #2d2d2d;">
                Thank you for your order. Your ${ticketsToRender.length > 1 ? 'tickets' : 'ticket'} for the <strong>Nairobi SAPE Gala 2026</strong> ${ticketsToRender.length > 1 ? 'are' : 'is'} confirmed.
            </p>

            ${ticketCardsHtml}

            <div class="event-details">
                <h3>Event Details</h3>
                <div class="event-info">
                    <strong>DATE &amp; TIME</strong>
                    Saturday, May 23, 2026<br>
                    3:00 PM - 9:00 PM (EAT)
                </div>
                <div class="event-info">
                    <strong>VENUE</strong>
                    Emara Ole-Sereni<br>
                    Mombasa Road, Nairobi, Kenya
                </div>
                <div class="event-info">
                    <strong>DRESS CODE</strong>
                    Fashion-forward formal / Sapologie inspired<br>
                    Think elegant tailoring, bold details, and sophisticated dresses
                </div>
            </div>

            <div class="instructions">
                <h4>Important Information:</h4>
                <ul>
                    <li><strong>Save this email</strong> - You'll need to present your QR code at the entrance</li>
                    <li><strong>Arrive early</strong> - Red carpet opens at 6:00 PM</li>
                    <li><strong>Bring a valid ID</strong> - For verification purposes</li>
                    <li><strong>Parking available</strong> - At Emara Ole-Sereni</li>
                    <li><strong>One entry only</strong> - Each ticket is valid for single entry</li>
                </ul>
            </div>
        </div>

        <div class="footer">
            <p><strong>Nairobi SAPE Gala 2026</strong></p>
            <p>Questions? Contact us at <a href="mailto:events.sapegala@gmail.com">events.sapegala@gmail.com</a></p>
            <p>+254 710 283584</p>
            <div class="divider" style="max-width: 200px; margin: 20px auto;"></div>
            <p style="font-size: 0.85rem; color: #9d9690;">© 2026 Nairobi SAPE Gala. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
}

async function sendEmailThroughBrevo({ to, subject, html }) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key': getBrevoApiKey(),
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            sender: { name: 'Nairobi SAPE Gala', email: 'tickets@sapegalanairobi.com' },
            to: [{ email: to }],
            replyTo: { email: 'events.sapegala@gmail.com' },
            subject,
            htmlContent: html
        })
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(`Brevo API error: ${result.message || JSON.stringify(result)}`);
    }

    // Normalize response to expose a consistent `id` field
    return { id: result.messageId || result.id || 'sent' };
}

exports.createTicket = functions.runWith({ secrets: ['BREVO_API_KEY'] }).https.onRequest(async (req, res) => {
    try {
        if (handlePreflight(req, res)) {
            return;
        }

        if (!ensureAllowedOrigin(req, res)) {
            return;
        }

        if (req.method !== 'POST') {
            res.status(405).json({ error: { message: 'Method not allowed.' } });
            return;
        }

        await enforceRateLimit(req, 'create-ticket', 15, 60 * 1000);

        const payload = parsePayload(req);
        const fullName = sanitizeText(payload.fullName, 'Full name');
        const email = validateEmail(payload.email);
        const phone = validatePhone(payload.phone);
        const paymentMethod = validatePaymentMethod(payload.paymentMethod);
        const quantity = validateQuantity(payload.ticketQuantity);
        const { ticketType, ticketPrice } = validateTicketType(payload.ticketType, payload.ticketPrice, payload.accessCode);
        const guestNames = validateGuestNames(payload.guestNames, quantity, fullName);
        // Accept optional per-guest emails; fall back to primary email if not provided
        const rawGuestEmails = Array.isArray(payload.guestEmails) ? payload.guestEmails : [];
        const guestEmails = guestNames.map((_, i) => {
            const ge = rawGuestEmails[i];
            try { return ge && ge.trim() ? validateEmail(ge.trim()) : email; }
            catch { return email; }
        });

        const batch = db.batch();
        const purchaseDate = new Date().toISOString();
        const tickets = guestNames.map((guestName, index) => {
            const ticketId = generateTicketId();
            const ticket = {
                ticketId,
                fullName: guestName,
                email: guestEmails[index] || email, // use guest's own email if provided
                phone,
                ticketType,
                ticketPrice,
                paymentMethod,
                purchaseDate,
                checkedIn: false,
                checkInTime: null,
                groupSize: quantity,
                ticketNumber: index + 1
            };

            batch.set(db.collection('tickets').doc(ticketId), ticket);
            return ticket;
        });

        await batch.commit();

        res.status(200).json({
            result: {
                success: true,
                tickets
            }
        });
    } catch (error) {
        console.error('❌ Error creating ticket:', error);
        res.status(error.statusCode || 500).json({
            error: {
                message: error.message || 'Failed to create ticket.'
            }
        });
    }
});

exports.sendTicketEmail = functions.runWith({ secrets: ['BREVO_API_KEY'] }).https.onRequest(async (req, res) => {
    try {
        if (handlePreflight(req, res)) {
            return;
        }

        if (!ensureAllowedOrigin(req, res)) {
            return;
        }

        if (req.method !== 'POST') {
            res.status(405).json({ error: { message: 'Method not allowed.' } });
            return;
        }

        await enforceRateLimit(req, 'send-ticket-email', 10, 60 * 1000);

        const { to, ticketData, qrCode, tickets } = parsePayload(req);
        const email = validateEmail(to);
        const safeQrCode = sanitizeText(qrCode, 'QR code', 64);

        if ((!ticketData || typeof ticketData !== 'object') && (!tickets || !Array.isArray(tickets) || tickets.length === 0)) {
            const validationError = new Error('Ticket data or tickets array is required.');
            validationError.statusCode = 400;
            throw validationError;
        }

        const subjectSuffix = (tickets && tickets.length > 1) 
            ? `${tickets.length} Tickets` 
            : safeQrCode;

        const message = await sendEmailThroughBrevo({
            to: email,
            subject: `Your Ticket Confirmation - Nairobi SAPE Gala 2026 | ${subjectSuffix}`,
            html: buildTicketEmailHtml(ticketData, safeQrCode, tickets)
        });

        res.status(200).json({
            result: {
                success: true,
                messageId: message.id,
                message: 'Ticket confirmation email sent successfully.'
            }
        });
    } catch (error) {
        console.error('❌ Error sending email:', error);
        res.status(error.statusCode || 500).json({
            error: {
                message: error.message || 'Failed to send ticket email.'
            }
        });
    }
});

exports.sendEventReminders = functions.runWith({ secrets: ['BREVO_API_KEY'] }).pubsub
    .schedule('0 18 * * *')
    .timeZone('Africa/Nairobi')
    .onRun(async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const eventDate = new Date('2026-05-23');
        eventDate.setHours(0, 0, 0, 0);

        if (tomorrow.getTime() !== eventDate.getTime()) {
            return null;
        }

        const ticketsSnapshot = await db.collection('tickets')
            .where('checkedIn', '==', false)
            .get();

        for (const doc of ticketsSnapshot.docs) {
            const ticket = doc.data();
            const reminderHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background: #f5f3ef; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; }
        .header { text-align: center; margin-bottom: 30px; }
        h1 { color: #c59b64; font-size: 2rem; margin: 0; }
        .content { color: #2d2d2d; line-height: 1.8; }
        .highlight { background: #fffbf5; border-left: 4px solid #c59b64; padding: 20px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Tomorrow is the Big Day!</h1>
        </div>
        <div class="content">
            <p>Dear ${escapeHtml(ticket.fullName || 'Guest')},</p>
            <p>This is a friendly reminder that the <strong>Nairobi SAPE Gala 2026</strong> is tomorrow.</p>
            <div class="highlight">
                <strong>Date:</strong> Saturday, May 23, 2026<br>
                <strong>Time:</strong> 3:00 PM - 9:00 PM<br>
                <strong>Venue:</strong> Emara Ole-Sereni, Nairobi<br>
                <strong>Your Ticket ID:</strong> ${escapeHtml(ticket.ticketId)}
            </div>
            <p><strong>What to bring:</strong></p>
            <ul>
                <li>Your ticket QR code from your confirmation email</li>
                <li>Valid ID for verification</li>
                <li>Your best Sapologie-inspired outfit</li>
            </ul>
            <p style="margin-top: 30px;">See you on the red carpet!<br><strong>The SAPE Gala Team</strong></p>
        </div>
    </div>
</body>
</html>`;

            try {
                await sendEmailThroughBrevo({
                    to: validateEmail(ticket.email),
                    subject: '🎉 Tomorrow: Nairobi SAPE Gala 2026 - See You on the Red Carpet!',
                    html: reminderHtml
                });
                console.log(`✅ Reminder sent to ${ticket.email}`);
            } catch (error) {
                console.error(`❌ Failed to send reminder to ${ticket.email}:`, error);
            }
        }

        console.log(`📧 Sent ${ticketsSnapshot.size} reminder emails`);
        return null;
    });

// ─────────────────────────────────────────────────────────────────────────────
// savePendingOrder — called by the browser BEFORE launching IntaSend payment.
// Stores full order details (ticket type, guests, etc.) in Firestore so the
// webhook can retrieve them without relying on localStorage or browser redirects.
// ─────────────────────────────────────────────────────────────────────────────
exports.savePendingOrder = functions.runWith({ secrets: ['BREVO_API_KEY'] }).https.onRequest(async (req, res) => {
    try {
        if (handlePreflight(req, res)) return;
        if (!ensureAllowedOrigin(req, res)) return;

        if (req.method !== 'POST') {
            res.status(405).json({ error: { message: 'Method not allowed.' } });
            return;
        }

        const payload = parsePayload(req);
        const fullName  = sanitizeText(payload.fullName, 'Full name');
        const email     = validateEmail(payload.email);
        const phone     = validatePhone(payload.phone);
        const quantity  = validateQuantity(payload.ticketQuantity);
        const { ticketType, ticketPrice } = validateTicketType(payload.ticketType, payload.ticketPrice, payload.accessCode);
        const guestNames = validateGuestNames(payload.guestNames || [fullName], quantity, fullName);
        const rawGuestEmails = Array.isArray(payload.guestEmails) ? payload.guestEmails : [];
        const guestEmails = guestNames.map((_, i) => {
            const ge = rawGuestEmails[i];
            try { return ge && ge.trim() ? validateEmail(ge.trim()) : email; }
            catch { return email; }
        });

        // Use phone+email as document id so the webhook can look it up easily.
        // Format: "<normalised_phone>_<email>"
        const normalizedPhone = phone.replace(/^\+/, '').replace(/\D/g, '');
        const orderId = `${normalizedPhone}_${email}`.replace(/[^a-zA-Z0-9_@.]/g, '_');

        const orderDoc = {
            orderId,
            fullName,
            email,
            phone,
            ticketType,
            ticketPrice,
            ticketQuantity: quantity,
            guestNames,
            guestEmails,
            accessCode: payload.accessCode || '',
            paymentMethod: 'intasend-mpesa',
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2-hour TTL
        };

        await db.collection('pending_orders').doc(orderId).set(orderDoc);
        console.log(`✅ Pending order saved: ${orderId}`);

        res.status(200).json({ result: { success: true, orderId } });
    } catch (error) {
        console.error('❌ Error saving pending order:', error);
        res.status(error.statusCode || 500).json({ error: { message: error.message || 'Failed to save pending order.' } });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// intasendWebhook — receives payment notifications directly from IntaSend.
// This fires server-to-server the moment a payment completes, with no browser
// involved. It looks up the matching pending order and issues tickets + email.
//
// Register this URL in IntaSend Dashboard → Settings → Webhooks:
//   https://us-central1-sape-gala-2026.cloudfunctions.net/intasendWebhook
// ─────────────────────────────────────────────────────────────────────────────
exports.intasendWebhook = functions.runWith({ secrets: ['BREVO_API_KEY'] }).https.onRequest(async (req, res) => {
    // IntaSend sends POST with JSON body. Respond 200 quickly so IntaSend
    // doesn't retry (we process asynchronously after responding)./
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }

    const body = req.body || {};

    // ── Verify the IntaSend Challenge secret ──────────────────────────────────
    // This must match exactly what you entered in the IntaSend webhook form.
    const WEBHOOK_CHALLENGE = 'SapeGala2026-Webhook-Secret-K3nya';
    const receivedChallenge = body.challenge || body.Challenge || '';
    if (receivedChallenge !== WEBHOOK_CHALLENGE) {
        console.warn('⛔ Webhook rejected — invalid or missing challenge:', receivedChallenge);
        res.status(403).json({ error: 'Invalid challenge' });
        return;
    }

    // Acknowledge immediately — IntaSend expects a 200 fast
    res.status(200).json({ received: true });

    try {
        const body = req.body || {};
        const state = (body.state || body.status || '').toUpperCase();

        console.log('📩 IntaSend webhook received:', JSON.stringify(body));

        // Only process COMPLETE payments
        if (state !== 'COMPLETE') {
            console.log(`⏭️ Ignoring webhook with state: ${state}`);
            return;
        }

        const rawEmail   = (body.account || body.email || '').trim().toLowerCase();
        const rawPhone   = (body.phone_number || body.phone || '').trim().replace(/^\+/, '').replace(/\D/g, '');
        const amountPaid = Number(body.net_amount || body.amount || 0);

        console.log(`💰 Payment complete — email: ${rawEmail}, phone: ${rawPhone}, amount: ${amountPaid}`);

        if (!rawPhone && !rawEmail) {
            console.error('❌ Webhook missing both email and phone — cannot match order');
            return;
        }

        // Look up pending order — try phone+email first, then phone alone, then email alone
        let orderSnap = null;
        const ordersRef = db.collection('pending_orders');

        if (rawPhone && rawEmail) {
            const orderId = `${rawPhone}_${rawEmail}`.replace(/[^a-zA-Z0-9_@.]/g, '_');
            const docRef = ordersRef.doc(orderId);
            const doc = await docRef.get();
            if (doc.exists && doc.data().status === 'pending') {
                orderSnap = doc;
            }
        }

        // Fallback: search by phone
        if (!orderSnap && rawPhone) {
            const qSnap = await ordersRef
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();
            qSnap.forEach(doc => {
                if (!orderSnap) {
                    const d = doc.data();
                    const storedPhone = (d.phone || '').replace(/^\+/, '').replace(/\D/g, '');
                    if (storedPhone === rawPhone) orderSnap = doc;
                }
            });
        }

        // Fallback: search by email
        if (!orderSnap && rawEmail) {
            const qSnap = await ordersRef
                .where('email', '==', rawEmail)
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .limit(3)
                .get();
            if (!qSnap.empty) orderSnap = qSnap.docs[0];
        }

        if (!orderSnap) {
            console.error(`❌ No matching pending order found for phone=${rawPhone}, email=${rawEmail}`);
            return;
        }

        const order = orderSnap.data();

        // Mark as processing to prevent duplicate ticket creation on retries
        await orderSnap.ref.update({ status: 'processing' });

        // Create tickets in Firestore
        const batch = db.batch();
        const purchaseDate = new Date().toISOString();
        const tickets = order.guestNames.map((guestName, index) => {
            const ticketId = generateTicketId();
            const ticket = {
                ticketId,
                fullName: guestName,
                email: order.guestEmails[index] || order.email,
                phone: order.phone,
                ticketType: order.ticketType,
                ticketPrice: order.ticketPrice,
                paymentMethod: 'intasend-mpesa',
                purchaseDate,
                checkedIn: false,
                checkInTime: null,
                groupSize: order.ticketQuantity,
                ticketNumber: index + 1,
                webhookProcessed: true
            };
            batch.set(db.collection('tickets').doc(ticketId), ticket);
            return ticket;
        });

        await batch.commit();
        console.log(`✅ ${tickets.length} ticket(s) created via webhook`);

        // Mark pending order as completed
        await orderSnap.ref.update({ status: 'completed', completedAt: admin.firestore.FieldValue.serverTimestamp() });

        // Send confirmation emails (one per guest)
        for (let i = 0; i < tickets.length; i++) {
            const ticket = tickets[i];
            const recipientEmail = order.guestEmails[i] || order.email;
            try {
                await sendEmailThroughBrevo({
                    to: recipientEmail,
                    subject: `Your Ticket Confirmation - Nairobi SAPE Gala 2026 | ${ticket.ticketId}`,
                    html: buildTicketEmailHtml(
                        { name: ticket.fullName, email: recipientEmail, ticketType: ticket.ticketType, ticketPrice: ticket.ticketPrice, purchaseDate },
                        ticket.ticketId
                    )
                });
                console.log(`📧 Email sent to ${recipientEmail} for ticket ${ticket.ticketId}`);
            } catch (emailErr) {
                console.error(`❌ Failed to email ${recipientEmail}:`, emailErr.message);
            }
            // Rate limit: 1 email/sec
            if (i < tickets.length - 1) {
                await new Promise(r => setTimeout(r, 1100));
            }
        }

        console.log(`🎉 Webhook processing complete for order ${orderSnap.id}`);

    } catch (err) {
        console.error('❌ Webhook processing error:', err);
        // Don't re-throw — we already sent 200 to IntaSend
    }
});


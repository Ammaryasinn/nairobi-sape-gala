/**
 * Firebase Cloud Function for sending ticket confirmation emails
 * 
 * Setup Instructions:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Initialize functions: firebase init functions
 * 3. Install dependencies: 
 *    cd functions
 *    npm install nodemailer
 * 4. Replace this file content in functions/index.js
 * 5. Configure email service (see below)
 * 6. Deploy: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configure your email service
// Option 1: Gmail (for testing)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com',  // Replace with your Gmail
        pass: 'your-app-password'       // Use App Password, not regular password
    }
});

// Option 2: SendGrid (recommended for production)
/*
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(functions.config().sendgrid.key);
*/

// Option 3: Other email services (Mailgun, AWS SES, etc.)
/*
const transporter = nodemailer.createTransport({
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    auth: {
        user: 'your-username',
        pass: 'your-password'
    }
});
*/

/**
 * Send ticket confirmation email
 * 
 * Called from payment-handler.js after successful ticket purchase
 */
exports.sendTicketEmail = functions.https.onCall(async (data, context) => {
    try {
        const { to, ticketData, qrCode } = data;

        // Validate input
        if (!to || !ticketData || !qrCode) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Missing required fields: to, ticketData, or qrCode'
            );
        }

        // Format purchase date
        const purchaseDate = new Date(ticketData.purchaseDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Email HTML content
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Nairobi SAPE Gala Ticket</title>
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f3ef; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: #fdfbf7; font-size: 2rem; margin: 10px 0; }
        .header p { color: #c59b64; font-size: 1.1rem; font-style: italic; }
        .content { padding: 40px 30px; }
        .ticket-card { background: #f9f9f9; border: 2px solid #c59b64; border-radius: 15px; padding: 30px; margin: 30px 0; }
        .qr-section { text-align: center; margin-bottom: 30px; }
        .qr-section img { width: 200px; height: 200px; border: 3px solid #c59b64; border-radius: 10px; }
        .ticket-row { padding: 12px 0; border-bottom: 1px solid #e0e0e0; }
        .ticket-label { color: #c59b64; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; }
        .ticket-value { color: #2d2d2d; font-weight: 500; font-size: 1rem; margin-top: 5px; }
        .ticket-id { font-family: 'Courier New', monospace; font-size: 1.1rem; font-weight: 700; color: #c59b64; }
        .event-details { background: #1a1a1a; padding: 30px; border-radius: 10px; margin: 30px 0; color: #fdfbf7; }
        .event-details h3 { color: #c59b64; text-align: center; margin-bottom: 20px; }
        .event-info { margin-bottom: 15px; }
        .event-info strong { color: #c59b64; display: block; margin-bottom: 5px; }
        .instructions { background: #fffbf5; border-left: 4px solid #c59b64; padding: 20px; margin: 30px 0; }
        .footer { background: #1a1a1a; padding: 30px 20px; text-align: center; color: #f5f3ef; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Nairobi SAPE Gala</h1>
            <p>2026 Edition</p>
        </div>
        
        <div class="content">
            <h2 style="text-align: center; color: #4caf50;">Ticket Confirmed!</h2>
            <p style="text-align: center; color: #666;">Your purchase was successful. See you at the gala!</p>
            
            <div class="ticket-card">
                <div class="qr-section">
                    <img src="${qrCode}" alt="Ticket QR Code" />
                    <p style="margin-top: 15px; color: #c59b64; font-weight: 600;">Scan for Check-In</p>
                </div>
                
                <div class="ticket-row">
                    <div class="ticket-label">Ticket ID</div>
                    <div class="ticket-value"><span class="ticket-id">${ticketData.ticketId}</span></div>
                </div>
                <div class="ticket-row">
                    <div class="ticket-label">Guest Name</div>
                    <div class="ticket-value">${ticketData.fullName}</div>
                </div>
                <div class="ticket-row">
                    <div class="ticket-label">Email</div>
                    <div class="ticket-value">${ticketData.email}</div>
                </div>
                <div class="ticket-row">
                    <div class="ticket-label">Ticket Type</div>
                    <div class="ticket-value">${ticketData.ticketType}</div>
                </div>
                <div class="ticket-row">
                    <div class="ticket-label">Purchase Date</div>
                    <div class="ticket-value">${purchaseDate}</div>
                </div>
            </div>
            
            <div class="event-details">
                <h3>Event Information</h3>
                <div class="event-info">
                    Saturday, May 23, 2026<br>
                    3:00 PM - 9:00 PM (EAT)
                </div>
                <div class="event-info">
                    <strong>Venue</strong>
                    Emara Ole-Sereni, Mombasa Road, Nairobi, Kenya
                </div>
                <div class="event-info">
                    <strong>Theme</strong>
                    Investing in Kenya & DRC — Style, Culture & Opportunity
                </div>
            </div>
            
            <div class="instructions">
                <h4>How to Check In</h4>
                <ul>
                    <li>Save this email or download the ticket</li>
                    <li>Present the QR code at check-in desk</li>
                    <li>Staff will scan for instant verification</li>
                    <li>Arrive 30 minutes early</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Nairobi SAPE Gala 2026</strong></p>
            <p>Style, Culture & Opportunity</p>
            <p style="margin-top: 20px; font-size: 0.75rem;">© 2026 Nairobi SAPE Gala. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `;

        // Email options
        const mailOptions = {
            from: '"Nairobi SAPE Gala" <noreply@sapegala.com>',  // Update with your email
            to: to,
            subject: `Your SAPE Gala Ticket - ${ticketData.ticketId}`,
            html: htmlContent,
            attachments: [
                {
                    filename: 'qr-code.png',
                    content: qrCode.split('base64,')[1],
                    encoding: 'base64'
                }
            ]
        };

        // Send email
        await transporter.sendMail(mailOptions);

        console.log('Email sent successfully to:', to);

        return {
            success: true,
            message: 'Email sent successfully'
        };

    } catch (error) {
        console.error('Error sending email:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to send email',
            error.message
        );
    }
});

/**
 * Optional: Scheduled function to send event reminders
 * Runs daily at 9 AM
 */
exports.sendEventReminders = functions.pubsub
    .schedule('0 9 * * *')
    .timeZone('Africa/Nairobi')
    .onRun(async (context) => {
        const eventDate = new Date('2026-05-16');
        const today = new Date();
        const daysUntilEvent = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

        // Send reminders 7 days before and 1 day before
        if (daysUntilEvent === 7 || daysUntilEvent === 1) {
            const ticketsSnapshot = await admin.firestore()
                .collection('tickets')
                .where('checkedIn', '==', false)
                .get();

            const reminderPromises = [];
            
            ticketsSnapshot.forEach(doc => {
                const ticket = doc.data();
                
                const mailOptions = {
                    from: '"Nairobi SAPE Gala" <noreply@sapegala.com>',
                    to: ticket.email,
                    subject: `Reminder: SAPE Gala in ${daysUntilEvent} day${daysUntilEvent > 1 ? 's' : ''}!`,
                    html: `
                        <h2>Don't forget!</h2>
                        <p>Hi ${ticket.fullName},</p>
                        <p>The Nairobi SAPE Gala 2026 is coming up in ${daysUntilEvent} day${daysUntilEvent > 1 ? 's' : ''}!</p>
                        <p><strong>Date:</strong> Saturday, May 23, 2026, 3:00 PM - 9:00 PM</p>
                        <p><strong>Venue:</strong> Emara Ole-Sereni, Nairobi</p>
                        <p><strong>Your Ticket ID:</strong> ${ticket.ticketId}</p>
                        <p>We can't wait to see you there!</p>
                    `
                };
                
                reminderPromises.push(transporter.sendMail(mailOptions));
            });

            await Promise.all(reminderPromises);
            console.log(`Sent ${reminderPromises.length} reminder emails`);
        }

        return null;
    });

/**
 * Optional: HTTP endpoint to manually test email sending
 */
exports.testEmail = functions.https.onRequest(async (req, res) => {
    const testEmail = {
        to: 'test@example.com',
        ticketData: {
            ticketId: 'TEST-12345678',
            fullName: 'Test User',
            email: 'test@example.com',
            ticketType: 'VIP - KES 5,000',
            purchaseDate: new Date().toISOString()
        },
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    };

    try {
        await exports.sendTicketEmail.run(testEmail);
        res.send('Test email sent successfully!');
    } catch (error) {
        res.status(500).send('Error sending test email: ' + error.message);
    }
});

/**
 * Additional Notes:
 * 
 * Gmail Setup:
 * 1. Enable 2-factor authentication on Gmail
 * 2. Generate App Password: https://myaccount.google.com/apppasswords
 * 3. Use the 16-character app password in the auth.pass field
 * 
 * SendGrid Setup:
 * 1. Sign up at https://sendgrid.com
 * 2. Get API key from Settings > API Keys
 * 3. Set config: firebase functions:config:set sendgrid.key="YOUR_KEY"
 * 4. Install: npm install @sendgrid/mail
 * 
 * For production, use a dedicated email service with better deliverability.
 */

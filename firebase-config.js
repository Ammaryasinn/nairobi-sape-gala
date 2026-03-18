// Firebase Configuration
// Ticket creation is handled by Cloud Functions.
// Firestore reads and updates are restricted to authenticated staff only.

const firebaseConfig = {
  apiKey: "AIzaSyD82el7ygcNrK2YwRtgz7mz77jPTqDgvOE",
  authDomain: "sape-gala-2026.firebaseapp.com",
  projectId: "sape-gala-2026",
  storageBucket: "sape-gala-2026.firebasestorage.app",
  messagingSenderId: "472127903822",
  appId: "1:472127903822:web:98a060f3b63a747af4cb1f",
  measurementId: "G-SXRT23RQMF"
};

let db = null;
let firebaseReady = false;
const functionsBaseUrl = 'https://us-central1-sape-gala-2026.cloudfunctions.net';

try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firebaseReady = true;
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    firebaseReady = false;
    db = null;
    console.error('❌ Firebase initialization error:', error);
}

function requireFirebase() {
    if (!firebaseReady || !db) {
        throw new Error('Secure backend is unavailable. Verify Firebase is configured correctly.');
    }
}

async function postToFunction(endpoint, payload) {
    const response = await fetch(`${functionsBaseUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: payload })
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error?.message || 'Request failed.');
    }

    return result.result || result;
}

const TicketDB = {
    async saveTicket(ticketData) {
        try {
            const result = await postToFunction('createTicket', ticketData);
            return {
                success: true,
                ticket: result.ticket || null,
                tickets: result.tickets || []
            };
        } catch (error) {
            console.error('Error creating ticket:', error);
            return { success: false, error: error.message };
        }
    },

    async getTicket(ticketId) {
        try {
            requireFirebase();
            const doc = await db.collection('tickets').doc(ticketId).get();
            if (doc.exists) {
                return { success: true, data: doc.data() };
            }
            return { success: false, error: 'Ticket not found' };
        } catch (error) {
            console.error('Error getting ticket:', error);
            return { success: false, error: error.message };
        }
    },

    async checkInTicket(ticketId) {
        const checkInTime = new Date().toISOString();

        try {
            requireFirebase();
            await db.collection('tickets').doc(ticketId).update({
                checkedIn: true,
                checkInTime
            });
            return { success: true, checkInTime };
        } catch (error) {
            console.error('Error checking in ticket:', error);
            return { success: false, error: error.message };
        }
    },

    async getAllTickets() {
        try {
            requireFirebase();
            const snapshot = await db.collection('tickets').orderBy('purchaseDate', 'desc').get();
            const tickets = [];
            snapshot.forEach(doc => {
                tickets.push(doc.data());
            });
            return { success: true, tickets };
        } catch (error) {
            console.error('Error getting all tickets:', error);
            return { success: false, error: error.message };
        }
    },

    async getStats() {
        try {
            requireFirebase();
            const snapshot = await db.collection('tickets').get();
            let checkedIn = 0;
            const total = snapshot.size;

            snapshot.forEach(doc => {
                if (doc.data().checkedIn) {
                    checkedIn++;
                }
            });

            return {
                success: true,
                stats: {
                    total,
                    checkedIn,
                    remaining: total - checkedIn
                }
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return { success: false, error: error.message };
        }
    }
};

function generateTicketId() {
    const bytes = new Uint8Array(4);
    window.crypto.getRandomValues(bytes);
    const suffix = Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    return `SAPE2026-${suffix}`;
}

async function sendTicketEmail(ticketData, qrCodeDataUrl) {
    try {
        return await postToFunction('sendTicketEmail', {
            to: ticketData.email,
            ticketData,
            qrCode: qrCodeDataUrl
        });
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
}

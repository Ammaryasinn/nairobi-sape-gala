// Page Transition Effect
document.addEventListener('DOMContentLoaded', () => {
    // Fade in page on load
    document.body.classList.remove('transitioning');
    
    // Handle navigation with transitions
    const links = document.querySelectorAll('a[href^="index.html"], a[href^="payment.html"], a[href^="faq.html"], a[href^="gallery.html"]');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            
            // Don't prevent default for anchor links
            if (href.includes('#')) return;
            
            e.preventDefault();
            document.body.classList.add('transitioning');
            
            setTimeout(() => {
                window.location.href = href;
            }, 600);
        });
    });
});

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for Animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards
const featureCards = document.querySelectorAll('.feature-card');
featureCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = `all 0.6s ease ${index * 0.1}s`;
    observer.observe(card);
});

// Payment Page Functionality
if (document.getElementById('paymentForm')) {
    // Ticket type selection
    const ticketTypeSelect = document.getElementById('ticketType');
    const totalAmountEl = document.getElementById('totalAmount');
    
    ticketTypeSelect.addEventListener('change', (e) => {
        const price = e.target.value;
        totalAmountEl.textContent = `KES ${parseInt(price).toLocaleString()}`;
    });
    

    
    // Form submission
    const paymentForm = document.getElementById('paymentForm');
    const successModal = document.getElementById('successModal');
    
    paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Validate form
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        
        if (!fullName || !email || !phone) {
            alert('Please fill in all required fields.');
            return;
        }
        
        // Show success modal
        successModal.classList.add('active');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Reset form
        paymentForm.reset();
    });
    
    // Close modal on overlay click
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', () => {
            successModal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // Format phone number input
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.startsWith('254')) {
            value = '+' + value;
        } else if (value.startsWith('0')) {
            value = '+254' + value.substring(1);
        }
        e.target.value = value;
    });
    

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

// Parallax effect on hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero-content');
    
    if (hero) {
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
        hero.style.opacity = 1 - scrolled / 600;
    }
});

// Add loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});

// ===========================
// COUNTDOWN TIMER
// ===========================
function initCountdown() {
    // Event date: May 23, 2026, 3:00 PM EAT (UTC+3)
    const eventDate = new Date('2026-05-23T15:00:00+03:00').getTime();
    
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = eventDate - now;
        
        // Calculate time units
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        // Update DOM elements
        const daysEl = document.getElementById('days');
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        
        if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
        
        // If countdown is finished
        if (distance < 0) {
            if (daysEl) daysEl.textContent = '00';
            if (hoursEl) hoursEl.textContent = '00';
            if (minutesEl) minutesEl.textContent = '00';
            if (secondsEl) secondsEl.textContent = '00';
        }
    }
    
    // Update countdown immediately and then every second
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// Initialize countdown when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCountdown);
} else {
    initCountdown();
}

// Sponsorship Modal Functions
window.openSponsorModal = function() {
    console.log('openSponsorModal called');
    const modal = document.getElementById('sponsorModal');
    console.log('Modal element:', modal);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        console.log('Modal opened');
    } else {
        console.error('Modal element not found!');
    }
}

window.closeSponsorModal = function() {
    console.log('closeSponsorModal called');
    const modal = document.getElementById('sponsorModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        // Reset form
        const form = document.getElementById('sponsorForm');
        if (form) form.reset();
    }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('sponsorModal');
    if (modal && e.target === modal) {
        window.closeSponsorModal();
    }
});

// Handle sponsor inquiry form submission
window.submitSponsorInquiry = async function(event) {
    event.preventDefault();
    
    const company = document.getElementById('sponsorCompany').value;
    const name = document.getElementById('sponsorName').value;
    const email = document.getElementById('sponsorEmail').value;
    const tier = document.getElementById('sponsorTier').value;
    const message = document.getElementById('sponsorMessage').value;
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = 'Sending...';
    submitButton.disabled = true;
    
    try {
        // Save to Firestore if available
        if (db) {
            await db.collection('sponsorInquiries').add({
                company: company,
                contactName: name,
                email: email,
                tier: tier,
                message: message,
                submittedAt: new Date().toISOString(),
                status: 'new'
            });
            console.log('✅ Sponsor inquiry saved to database');
        }
        
        // Show success message
        alert(`Thank you ${name}! Your sponsorship inquiry has been received. We'll contact you at ${email} within 24 hours.`);
        window.closeSponsorModal();
        
    } catch (error) {
        console.error('Error submitting inquiry:', error);
        alert('There was an error submitting your inquiry. Please email us directly at partnerships.sapegala@gmail.com');
    } finally {
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    }
}

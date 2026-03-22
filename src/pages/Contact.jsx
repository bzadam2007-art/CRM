const EMAIL = 'b.zadam2007@gmail.com'
const PHONE = '+212 0711080606'
const GITHUB = 'https://github.com/bzadam2007-art'
const LINKEDIN = 'https://www.linkedin.com/in/b-z-adam-7567b13b0/'

function EmailIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" />
        </svg>
    )
}
function PhoneIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.3 9.16a19.79 19.79 0 01-3.07-8.63A2 2 0 012.18 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 9.4a16 16 0 006.29 6.29l1.76-1.34a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
        </svg>
    )
}
function GithubIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
    )
}
function LinkedinIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
    )
}

export default function Contact() {
    return (
        <section className="section">
            <div className="container">
                <p className="section-label">Get in Touch</p>
                <h1 className="section-title">Contact Me</h1>
                <p className="section-subtitle">
                    Have a question or want to connect? Drop me a message — I'd love to hear from you!
                </p>

                <div className="contact-grid">
                    {/* ── Info Card ── */}
                    <div className="card contact-info-card">
                        <h3>Contact Details</h3>

                        <div className="contact-detail">
                            <div className="contact-icon"><EmailIcon /></div>
                            <div>
                                <p className="contact-detail-label">Email</p>
                                <p className="contact-detail-value">
                                    <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
                                </p>
                            </div>
                        </div>

                        <div className="contact-detail">
                            <div className="contact-icon"><PhoneIcon /></div>
                            <div>
                                <p className="contact-detail-label">Phone</p>
                                <p className="contact-detail-value">{PHONE}</p>
                            </div>
                        </div>

                        <div className="contact-detail">
                            <div className="contact-icon">📍</div>
                            <div>
                                <p className="contact-detail-label">Location</p>
                                <p className="contact-detail-value">Morocco</p>
                            </div>
                        </div>

                        <div className="social-links">
                            <a href={GITHUB} target="_blank" rel="noreferrer" className="social-link">
                                <GithubIcon /> GitHub
                            </a>
                            <a href={LINKEDIN} target="_blank" rel="noreferrer" className="social-link">
                                <LinkedinIcon /> LinkedIn
                            </a>
                        </div>
                    </div>

                    {/* ── Form Card ── */}
                    <div className="card contact-form-card">
                        <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20, color: 'var(--text)' }}>
                            Send a Message
                        </h3>
                        <form action="https://api.web3forms.com/submit" method="POST">
                            {/* Replace YOUR_ACCESS_KEY_HERE with your Web3Forms access key */}
                            <input type="hidden" name="access_key" value="YOUR_ACCESS_KEY_HERE" />
                            <input type="hidden" name="subject" value="New Contact Message from Portfolio" />
                            <input type="hidden" name="redirect" value="https://web3forms.com/success" />
                            
                            <div className="form-group">
                                <label className="form-label" htmlFor="name">Your Name</label>
                                <input id="name" name="name" type="text" className="form-input" placeholder="e.g. John Doe" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="email">Your Email</label>
                                <input id="email" name="email" type="email" className="form-input" placeholder="you@example.com" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="message">Message</label>
                                <textarea id="message" name="message" className="form-textarea" placeholder="Write your message here…" required />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                                ✉️ Send Message
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}

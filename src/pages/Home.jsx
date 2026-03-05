import { Link } from 'react-router-dom'

export default function Home() {
    return (
        <>
            {/* ── HERO ── */}
            <section className="hero">
                <div className="container">
                    <div className="hero-inner">
                        {/* Left */}
                        <div>
                            <div className="hero-eyebrow">
                                <span>🎓</span> Computer Science Student
                            </div>
                            <h1 className="hero-name">
                                Bouhali Zriouil<br />
                                <span>Adam</span>
                            </h1>
                            <p className="hero-title">1st Year CS · College de Paris</p>
                            <p className="hero-bio">
                                Passionate about technology and driven by curiosity. I'm a first-year
                                Computer Science student exploring the foundations of programming and
                                mathematics, with a growing interest in Machine Learning and data-driven
                                problem solving.
                            </p>
                            <div className="hero-actions">
                                <Link to="/projects" className="btn btn-primary">View Projects</Link>
                                <Link to="/contact" className="btn btn-outline">Contact Me</Link>
                            </div>
                            <div className="hero-highlights">
                                <span className="highlight-chip"><span className="dot"></span>Learning: Machine Learning</span>
                                <span className="highlight-chip"><span className="dot"></span>C + Python (basic)</span>
                                <span className="highlight-chip"><span className="dot"></span>Fast learner</span>
                            </div>
                        </div>

                        {/* Right — Profile Card */}
                        <div className="profile-card">
                            <img src="/profile.jpg" alt="Adam Bouhali Zriouil"
                                onError={e => {
                                    e.target.style.background = 'linear-gradient(135deg, #dbeafe, #eff6ff)'
                                    e.target.style.display = 'flex'
                                    e.target.alt = ''
                                }}
                            />
                            <p className="profile-card-name">Bouhali Zriouil Adam</p>
                            <p className="profile-card-role">CS Student · 1st Year</p>
                            <p className="profile-card-loc">📍 Morocco</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Quick About ── */}
            <section className="section" style={{ background: 'var(--blue-light)' }}>
                <div className="container">
                    <p className="section-label">About Me</p>
                    <h2 className="section-title">Curious Mind, Growing Skills</h2>
                    <p className="section-subtitle">
                        Currently in my first year at College de Paris, I'm building strong fundamentals
                        in C and Python while exploring the world of Machine Learning from the ground up.
                    </p>
                </div>
            </section>
        </>
    )
}

const projects = [
    {
        id: 1,
        emoji: '📉',
        title: 'CRM V2 - Commercial Management',
        desc: 'A comprehensive CRM system for managing sales teams, prospects, and university partnerships. Built for scalability and data-driven insights.',
        features: [
            'Advanced Lead Scoring & Priority System',
            'Automated Email Scraping & Research',
            'Interactive Dashboard with Team Metrics',
            'Email Campaign Automation',
        ],
        credentials: [
            { role: 'Admin', email: 'admin@schoolcrm.com', pass: 'admin123' },
            { role: 'Commercial', email: 'test@schoolcrm.com', pass: 'test1234' }
        ],
        tags: ['React', 'Supabase', 'Flask', 'Python'],
        live: 'http://localhost:5174',
        code: '#',
    },
]

function TagBadge({ label }) {
    return <span className="badge">{label}</span>
}

export default function Projects() {
    return (
        <section className="section">
            <div className="container">
                <p className="section-label">My Work</p>
                <h1 className="section-title">Projects</h1>
                <p className="section-subtitle">
                    A collection of projects I've built or am currently working on as part of
                    my learning journey.
                </p>

                <div className="projects-grid">
                    {projects.map(p => (
                        <article key={p.id} className="card project-card">
                            {/* Project image / placeholder */}
                            <div className="project-img">{p.emoji}</div>

                            <div className="project-body">
                                <h2 className="project-title">{p.title}</h2>
                                <p className="project-desc">{p.desc}</p>

                                <ul className="project-features">
                                    {p.features.map(f => <li key={f}>{f}</li>)}
                                </ul>

                                <div className="project-tags">
                                    {p.tags.map(t => <TagBadge key={t} label={t} />)}
                                </div>

                                {p.credentials && (
                                    <div className="project-credentials">
                                        <p className="credentials-title">Demo Access</p>
                                        <div className="credentials-list">
                                            {p.credentials.map(c => (
                                                <div key={c.role} className="credential-item">
                                                    <span className="credential-role">{c.role}</span>
                                                    <span className="credential-code">{c.email} / {c.pass}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="project-actions">
                                <a href={p.live} className="btn btn-primary btn-sm">🚀 Live Demo</a>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}

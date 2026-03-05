const projects = [
    {
        id: 1,
        emoji: '🗂️',
        title: 'CRM de gestion de commerciaux',
        desc: 'A CRM project to manage sales representatives, prospects, and follow-ups efficiently.',
        features: [
            'Add & edit prospect profiles',
            'Status tracking & pipeline stages',
            'Dashboard overview with key metrics',
            'Timeline entries & follow-up notes',
            'Simple search & filter functionality',
        ],
        tags: ['Python', 'Database', 'Web'],
        live: '#',
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
                            </div>

                            <div className="project-actions">
                                <a href={p.live} className="btn btn-primary btn-sm">🚀 Live Demo</a>
                                <a href={p.code} className="btn btn-outline btn-sm">💻 Source Code</a>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}

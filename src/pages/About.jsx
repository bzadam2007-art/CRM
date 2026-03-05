const techSkills = [
    { name: 'C Programming', level: 'Basic', levelClass: 'basic' },
    { name: 'Python', level: 'Basic', levelClass: 'basic' },
    { name: 'Problem Solving', level: 'Beginner', levelClass: 'basic' },
    { name: 'Machine Learning Fundamentals', level: 'Learning', levelClass: 'learning' },
]

const softSkills = [
    { name: 'Fast Learner', level: 'Strength', levelClass: 'soft' },
    { name: 'Logical Thinking', level: 'Strength', levelClass: 'soft' },
    { name: 'English', level: 'Fluent', levelClass: 'soft' },
]

export default function About() {
    return (
        <section className="section">
            <div className="container">
                <p className="section-label">Get to Know Me</p>
                <h1 className="section-title">About Me</h1>

                <div className="about-grid">
                    {/* ── Story + Timeline ── */}
                    <div className="about-story">
                        <p>
                            Hi! I'm <strong>Bouhali Zriouil Adam</strong>, a 1st-year Computer Science
                            student at <strong>College de Paris</strong>, based in Morocco. I chose
                            Computer Science because I've always been fascinated by how software can
                            solve real-world problems — and I'm just getting started.
                        </p>
                        <p>
                            Right now I'm building my foundations: learning C to understand how
                            computers truly work at a low level, and using Python for its versatility
                            in scripting, data, and automation. Every week I try to solve at least one
                            new programming challenge to sharpen my logical thinking.
                        </p>
                        <p>
                            My long-term goal is <strong>Machine Learning</strong>. I'm drawn to the
                            idea of teaching machines to find patterns, make predictions, and — one day
                            — build intelligent systems. For now, I'm focusing on the math and coding
                            fundamentals that will get me there.
                        </p>

                        <h3>🗓️ Timeline</h3>
                        <div className="timeline">
                            <div className="timeline-item">
                                <p className="timeline-year">2026 – Present</p>
                                <p className="timeline-title">First Year in Computer Science</p>
                                <p className="timeline-sub">College de Paris · Morocco</p>
                            </div>
                            <div className="timeline-item">
                                <p className="timeline-year">Current Focus</p>
                                <p className="timeline-title">Python · C · ML Fundamentals</p>
                                <p className="timeline-sub">Building beginner projects & improving math skills</p>
                            </div>
                        </div>
                    </div>

                    {/* ── Skills ── */}
                    <div className="skills-section">
                        <div className="skill-group">
                            <p className="skill-group-title">Technical Skills</p>
                            <div className="skill-list">
                                {techSkills.map(s => (
                                    <div key={s.name} className="skill-row">
                                        <span className="skill-name">{s.name}</span>
                                        <span className={`skill-level ${s.levelClass}`}>{s.level}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="skill-group">
                            <p className="skill-group-title">Soft Skills & Languages</p>
                            <div className="skill-list">
                                {softSkills.map(s => (
                                    <div key={s.name} className="skill-row">
                                        <span className="skill-name">{s.name}</span>
                                        <span className={`skill-level ${s.levelClass}`}>{s.level}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

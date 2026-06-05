# IPAM Lite

A lightweight, self-hosted IP Address Management application for SMB and internal infrastructure teams.

Built to solve a simple problem: many teams need IPAM, but do not want vendor lock-in, recurring license costs, or a heavyweight platform for basic subnet management. This project provides a practical middle ground with a clean web UI, API, SQLite storage, and a straightforward Linux deployment model.

## Why this exists

A lot of environments still track subnets in spreadsheets. That works until it doesn't: subnet ownership becomes unclear, changes are hard to audit, and shared visibility breaks down across teams. A small self-hosted tool with structured data, search, import/export, and a simple API can close that gap without introducing enterprise overhead.

## What it does

- Track subnets by site, location, business unit, or logical domain.
- Store VLAN, description, status, notes, and subnet type metadata.
- Search and filter across subnets quickly from a browser UI.
- Import from CSV/XLSX and export back to CSV/XLSX.
- Run on a Linux server with FastAPI, SQLite, systemd, and optional nginx reverse proxy.

## Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI  |
| ORM / DB | SQLAlchemy + SQLite  |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Process manager | systemd |
| Reverse proxy | nginx |

## Quick start

```bash
git clone https://github.com/YOUR-USERNAME/ipam-lite.git
cd ipam-lite
sudo bash setup.sh
```

Then open:

```text
http://YOUR-SERVER-IP:8082
```

## Project structure

```text
ipam-lite/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── seed.py
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   └── static/
│       ├── css/app.css
│       └── js/app.js
├── nginx/
│   └── ipam.conf
├── systemd/
│   └── ipam.service
├── .github/workflows/
│   └── python-ci.yml
├── .gitignore
├── LICENSE
└── setup.sh
```

## Generic deployment

This project is designed to be easy to host on a single Linux box, which fits many SMB and branch-office deployments where simplicity matters more than platform sprawl. systemd and nginx remain common choices for this style of deployment because they reduce moving parts while still giving reliable service management and reverse proxy support.

## Planned features

The next features are aimed at making the tool more useful in managed environments:

- Active Directory / LDAP authentication and role mapping, a common pattern for internal web tools in Windows-heavy environments.
- Per-subnet IP allocation views and host-level management.
- Subnet overlap and duplicate detection across sites.
- Audit log for create, update, and delete events.
- API tokens and optional SSO.
- DNS integration.
- Live sync with network sources such as routing exports or controllers.
- Multi-user permissions.
- Docker deployment option.

## Roadmap ideas

| Feature | Why it matters |
|---|---|
| AD / LDAP auth | Lets internal teams use existing identity systems. |
| Change audit log | Improves accountability and traceability for subnet edits. |
| Host IP expansion | Turns subnet inventory into fuller IPAM workflows. |
| API tokens | Enables automation and external integrations. |
| CI pipeline | Helps keep open-source repos easier to maintain. |

## Open source goals

Good open-source repos are easier to adopt when they have clear setup steps, practical defaults, and room for contribution. Documentation, onboarding, and predictable structure are repeatedly highlighted as factors that help projects attract real users and contributors.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make the change.
4. Open a pull request with a clear description and screenshots if the UI changed.

## License

MIT

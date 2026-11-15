# Wei-Chieh Huang — Personal Portfolio Website

A responsive personal portfolio website built with HTML, CSS, and JavaScript, designed to present my experience in AI systems, full-stack development, product engineering, and system integration.

## Live Demo

[View Portfolio Website](https://jaycome.github.io/)

## Overview

A single-page portfolio for AI software engineering roles. It presents two case studies
(a multimodal document Q&A agent and an equipment maintenance RAG system), earlier work,
experience, skills and contact details. Content mirrors the resume in `assets/resume.pdf`.

## Design

- Milk-white background, charcoal text, one teal accent shared with the resume
- Schibsted Grotesk for headings, Source Sans 3 for text, both self-hosted (OFL-1.1)
- The summary cites its case studies the way a RAG answer cites sources
- Motion: a load sequence that grounds the summary in its sources, pipelines that run as they scroll into view, and result counters. All of it is off under `prefers-reduced-motion`
- Plain HTML and CSS with one small optional script: no build step, no external requests, and the page is complete without JavaScript

## Project Structure

```text
.
├── index.html
├── styles.css
├── script.js
├── 404.html
├── assets/
│   ├── resume.pdf
│   └── fonts/
├── README.md
├── LICENSE
└── .gitignore
```

## Updating

Edit `index.html` and push to `main`; GitHub Pages redeploys automatically.
Replace `assets/resume.pdf` to update the downloadable resume.

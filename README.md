# Wei-Chieh Huang — Personal Portfolio Website

A responsive personal portfolio website built with HTML, CSS, and JavaScript, designed to present my experience in AI systems, full-stack development, product engineering, and system integration.

## Live Demo

[View Portfolio Website](https://jaycome.github.io/)

## Overview

A single-page portfolio for AI software engineering roles. Selected work holds three case
studies from employment (a multimodal document Q&A agent, an equipment maintenance RAG system
and an AI skin-analysis product). Projects holds personal and academic work. Experience,
skills and contact details follow. Work content mirrors the resume in `assets/resume.pdf`.

## Design

- Milk-white background, charcoal text, one teal accent shared with the resume
- Schibsted Grotesk for headings, Source Sans 3 for text, both self-hosted (OFL-1.1)
- The landing screen plays out a retrieval-augmented answer: a question is typed, the resume summary streams in, and its sources attach as links to the case studies
- Beside it, a point-cloud brain whose regions are the sections of the page (frontal = Work, parietal = Projects, temporal = Experience, occipital = Skills, cerebellum = Contact). Points assemble on load, signals travel along the links, regions light up in turn, and pointing at or clicking a region highlights it and goes to that section. The same links are plain anchors without JavaScript
- Pipelines run step by step as they scroll into view and result figures count up. All motion is off under `prefers-reduced-motion`
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

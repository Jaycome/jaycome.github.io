# Wei-Chieh Huang Personal Website

This is a static personal portfolio website for GitHub Pages.

## Files

- `index.html` — main website content
- `styles.css` — website styling
- `script.js` — mobile navigation and small interactions
- `assets/resume.pdf` — downloadable CV

## Deploy to GitHub Pages

### Option A: User site, recommended for a personal website

1. Create a GitHub repository named:

```text
<your-github-username>.github.io
```

For example:

```text
Jaycome.github.io
```

2. Upload all files in this folder to the repository root.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Save.
6. Your website should be available at:

```text
https://<your-github-username>.github.io
```

### Option B: Project site

If you do not want to use `<username>.github.io`, create any repository name such as:

```text
portfolio
```

Then your website URL will usually be:

```text
https://<your-github-username>.github.io/portfolio
```

## Customise before publishing

Update these items in `index.html`:

- LinkedIn URL
- GitHub URL
- Email address
- Project links, if you want each project to link to a GitHub repo
- Any quantified results that you want to make more conservative for public LinkedIn / recruiter viewing

## Local preview

Open `index.html` directly in your browser, or run:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

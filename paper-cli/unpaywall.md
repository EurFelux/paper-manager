# Integrating Unpaywall API

[Unpaywall](https://unpaywall.org/products/api) is a free API for discovering Open Access versions of academic papers. paper-manager uses it to download OA PDFs by DOI via `paper lit add --doi`.

## Setup

Set your email (required by Unpaywall for identification, not authentication):

```bash
paper config set email '"you@example.com"' --user
```

That's it. No API key or registration needed.

## Usage

```bash
paper lit add <kb-id> --doi 10.1038/nature12373
```

paper-manager queries Unpaywall, checks if the paper is Open Access, downloads the PDF, and runs the full ingestion pipeline. If the paper is not OA, it errors with a message to add the file manually.

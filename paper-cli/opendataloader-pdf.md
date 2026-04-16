# Integrating opendataloader-pdf

[opendataloader-pdf](https://github.com/opendataloader-project/opendataloader-pdf) is an optional dependency that enables high-quality PDF-to-Markdown conversion with image extraction. When available, `paper lit add` and `paper lit convert` automatically use it.

## Setup

Follow the [opendataloader-pdf installation guide](https://github.com/opendataloader-project/opendataloader-pdf) to install the package and its dependencies (Java 11+ required).

For hybrid mode (recommended — better accuracy for complex tables, scanned PDFs, formulas), start the backend:

```bash
opendataloader-pdf-hybrid --port 5002
```

paper-manager automatically detects the hybrid backend at `localhost:5002`. Verify with:

```bash
paper dep check opendataloader
```

That's it. No additional configuration in paper-manager is needed.

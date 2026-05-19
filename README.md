<!-- ReceiptParser - AI-Powered Receipt Extraction -->

<div align="center">

# ReceiptParser

### AI-Powered Receipt Data Extraction for Freelancers & Small Businesses

[![React](https://img.shields.io/badge/React-18.2-blue?logo=react&style=flat)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript&style=flat)
[![Vite](https://img.shields.io/badge/Vite-5.0-purple?logo=vite&style=flat)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-green?logo=openai&style=flat)
[![Express](https://img.shields.io/badge/Express-4.18-gray?logo=express&style=flat)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat)

**ReceiptParser** uses AI to automatically extract structured data from receipt photos — transforming messy paper receipts into clean, organized digital records.

[Features](#features) • [Demo](#demo) • [Installation](#installation) • [Tech Stack](#tech-stack) • [Contributing](#contributing)

---

![ReceiptParser Hero Section](screenshots/hero-section.png)

---

</div>

---

## Overview

ReceiptParser is a modern AI-powered web application that transforms how you handle receipts. Upload a photo of any receipt, and our AI instantly extracts merchant name, date, line items, and totals — no manual data entry required.

Built with a premium minimal SaaS aesthetic inspired by Linear, Raycast, and Vercel, ReceiptParser delivers a beautiful, responsive experience that works beautifully on any device.

### Why ReceiptParser?

- **✨ Zero Manual Entry** — Upload a receipt, get structured data in seconds
- **🎯 AI-Powered Accuracy** — GPT-4o extracts data with confidence markers
- **📝 Easy Corrections** — Review and edit any field inline
- **🔒 Private & Secure** — Your data stays local, never leaves your device
- **🌙 Dark Mode** — Beautiful light and dark themes
- **📱 Responsive** — Works seamlessly on desktop, tablet, and mobile

---

## Features

<div align="center">

| | | |
|:---:|:---:|:---:|
| **🤖 AI Extraction** | **✏️ Easy Corrections** | **💾 Save & Export** |
| Smart AI automatically extracts merchant, date, items, and totals from any receipt in seconds | Review and edit any field inline. Confidence markers highlight uncertain fields for easy review | Save receipts locally and download as PDF for your records or accounting software |
| **🔒 Private & Secure** | **⚡ Lightning Fast** | **📱 Works Everywhere** |
| Your data stays on your device. No cloud storage, no sharing, completely private | Groq-powered AI delivers results in seconds, not minutes. Built for speed | Access on any device. Simple, intuitive interface anyone can use |

</div>

---

## Demo

### How It Works

```
📸 Upload Receipt    →    🤖 AI Extracts    →    ✏️ Review & Edit    →    💾 Save & Export
    Receipt Photo         Structured Data        Confidence Markers       PDF Export
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- OpenAI API Key ([Get here](https://platform.openai.com/api-keys))

### Installation

```bash
# 1. Navigate to the project directory
cd ReceiptParser

# 2. Install all dependencies
npm install

# 3. Set up environment variables
cp server/.env.example server/.env

# 4. Add your OpenAI API key to server/.env
# OPENAI_API_KEY=your_api_key_here

# 5. Start the development server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Tech Stack

<div align="center">

| Layer | Technology |
|:---:|:---|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Custom CSS (Premium SaaS Design) |
| **Backend** | Express.js + Node.js |
| **AI/ML** | OpenAI GPT-4o API |
| **Storage** | Local JSON File |
| **Fonts** | Inter (Typography) |

</div>

---

## Project Structure

```
ReceiptParser/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── App.tsx           # Main React component
│   │   └── index.css         # Premium SaaS styling
│   ├── public/               # Static assets
│   └── package.json          # Frontend dependencies
├── server/                    # Express Backend
│   ├── src/
│   │   └── index.ts          # API routes + AI extraction
│   ├── .env.example          # Environment template
│   └── package.json          # Backend dependencies
├── data/                      # Receipts storage (JSON)
├── public/                     # Static files
└── README.md                   # This file
```

---

## API Reference

### POST `/api/extract`

Extract structured data from a receipt image.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "merchant": "Coffee Shop",
  "date": "2026-01-15",
  "total": 12.50,
  "currency": "USD",
  "lineItems": [
    { "name": "Espresso", "quantity": 2, "amount": 6.00, "type": "item" }
  ]
}
```

### GET `/api/receipts`

Get all saved receipts.

### POST `/api/receipts`

Save a new receipt.

### PUT `/api/receipts/:id`

Update an existing receipt.

### DELETE `/api/receipts/:id`

Delete a receipt.

---

## Environment Variables

Create `server/.env` from the example:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional (defaults shown)
PORT=3001
```

---

## Future Improvements

- [ ] CSV export of all receipts
- [ ] Search and filter receipts
- [ ] Drag-and-drop line item reordering
- [ ] Side-by-side original vs corrected values
- [ ] Photo quality warning for dark/unreadable images
- [ ] Cloud storage option (MongoDB/PostgreSQL)
- [ ] User authentication
- [ ] Multi-device sync

---

## Design System

ReceiptParser features a premium minimal SaaS design inspired by:

- **Linear** — Premium fintech aesthetics
- **Raycast** — Mac-native feel
- **Vercel** — Clean developer experience
- **Stripe** — Trusted financial UI

### Color Palette

| Color | Hex | Usage |
|:---:|:---:|:---|
| Primary Green | `#315B3E` | Brand accent, buttons, highlights |
| Primary Light | `#86EFAC` | Glows, accents |
| Background Dark | `#0b0f1e` | Dark mode background |
| Background Light | `#f8fafc` | Light mode background |
| Text Primary | `#1a1a2e` / `#f1f5f9` | Light/Dark text |

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Acknowledgments

- **OpenAI** — GPT-4o for intelligent receipt extraction
- **React & Vite** — Modern frontend tooling
- **Design Inspiration** — Linear, Raycast, Vercel, Stripe

---

<div align="center">

### Built with ❤️ by Shejal Pandey


</div>

---

*Version 1.0 — Released May 2026*

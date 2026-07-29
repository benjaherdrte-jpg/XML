# Legal Document XML Converter

A web application that converts legal documents (PDFs) to structured XML format using Google's Gemini AI for intelligent document analysis and structure extraction.

## 🚀 Features

- **PDF Processing**: Upload and process PDF documents page by page
- **AI-Powered Analysis**: Uses Google Gemini AI to analyze document structure
- **Color-Coded Extraction**: Identifies document hierarchy using color highlights
- **XML Generation**: Converts analyzed content to structured XML format
- **Table Detection**: Automatically detects and preserves table structures
- **Real-time Processing**: Live feedback during document processing

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Express.js, Node.js
- **AI**: Google Generative AI (Gemini)
- **PDF Processing**: PDF.js
- **Build Tool**: Vite
- **Runtime**: Bun (recommended) or Node.js

## 📋 Prerequisites

- Bun (recommended) or Node.js 18+
- Google AI API Key (Gemini)

## 🔧 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/benjaherdrte-jpg/XML.git
   cd XML
   ```

2. **Install dependencies**:
   ```bash
   bun install
   # or
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Google AI API key:
   ```
   GEMINI_API_KEY=your_google_ai_api_key_here
   ```

## 🚀 Usage

### Development Mode

```bash
bun run dev
# or
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build

```bash
bun run build
bun run start
# or
npm run build
npm run start
```

## 📊 Document Structure Analysis

The application uses color-coded highlights to identify document hierarchy:

- **🔴 RED**: Preamble units (Level: "PRE")
- **🟢 GREEN**: Superior units (Level: "RB", "TIT", "C", "S") - Contains Articles
- **🟣 MAGENTA/CYAN**: Article units (Level: "A") - Contains Paragraphs/Tables

## 🔄 Recent Updates

### Latest Fixes (v0.0.1)

- ✅ **Fixed Google Generative AI Integration**
  - Corrected import from `@google/generative-ai`
  - Updated API initialization and usage
  - Fixed model configuration and response handling

- ✅ **Updated Dependencies**
  - Replaced `@google/genai` with official `@google/generative-ai`
  - Updated to stable version for better compatibility

- ✅ **Improved Error Handling**
  - Better API error detection and reporting
  - Specific handling for quota, authentication, and safety errors

## 🔑 API Configuration

The application uses Google's Gemini 1.5 Pro model with the following configuration:

- **Model**: `gemini-1.5-pro`
- **Response Format**: JSON with custom schema
- **Temperature**: 0.0 (deterministic) / 0.2 (retry attempts)
- **Safety Settings**: Default Google AI safety filters

## 📁 Project Structure

```
XML/
├── src/                    # Frontend React components
├── services/              # Backend services and schemas
│   └── geminiSchema.ts   # AI response schema definition
├── server.ts             # Express server with AI integration
├── package.json          # Dependencies and scripts
├── .env.example         # Environment variables template
└── README.md           # This file
```

## 🐛 Troubleshooting

### Common Issues

1. **API Key Errors**:
   - Ensure your `GEMINI_API_KEY` is correctly set in `.env`
   - Verify the API key has proper permissions

2. **Dependency Issues**:
   - Run `bun install` or `npm install` to update dependencies
   - Clear cache: `bun pm cache rm` or `npm cache clean --force`

3. **Build Errors**:
   - Check TypeScript compilation: `bun run lint`
   - Ensure all imports are correctly resolved

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

This is a private repository. For questions or issues, please contact the repository owner.

---

**Note**: This application requires a valid Google AI API key to function. Make sure to keep your API key secure and never commit it to version control.
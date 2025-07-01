# AI Flashcard Generator

Transform any topic into personalized flashcards with AI. Free, fast, and perfect for students, professionals, and lifelong learners.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Live Demo](https://img.shields.io/badge/Live-Demo-blue.svg)](https://ai-flashcards-7fd.pages.dev/)

## Features

- **AI-Powered Generation** - Create flashcards from any topic using AI
- **Multiple Input Methods** - Text, file upload (Will be implemrnted soon)
- **12 Language Support** - English, French, Spanish, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, Hindi
- **Keyboard Navigation** - Keyboard support for accessibility
- **Mobile Responsive** - Works on all devices
- **Private** - No data collection
- **Fast** - Optimized performance with modern tech stack

## Quick Start

### Option 1: Use Online (Recommended)
Visit [ai-flashcards-7fd.pages.dev](https://ai-flashcards-7fd.pages.dev/) - no installation required.

### Option 2: Run Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/mhdgning131/flashcard.git
   cd flashcard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Add your Google AI API key
   GOOGLE_AI_API_KEY=your_api_key_here
   ```

4. **Run development server**
   ```bash
   # Start both frontend and backend
   npm run dev:full
   
   # Or run separately
   npm run dev          # Frontend only
   npm run dev:backend  # Backend only
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## Tech Stack

### Frontend
- **React 19**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Lucide React**

### Backend
- **Node.js**
- **Express**
- **Google AI (Gemini)**

### Creating Flashcards

1. **Choose your input method:**
   - **Topic**: Describe what you want to study
   - **Text**: Paste your study material

2. **Customize settings:**
   - Number of cards (5-20)
   - Language preference

3. **Generate and study:**
   - Click generate to create your flashcards
   - Use keyboard navigation or click to flip cards

### Keyboard Shortcuts

- `Space` - Flip current card
- `→` / `←` - Navigate between cards
- `R` - Restart from beginning
- `T` - Toggle theme
- `Esc` - Return to creation view

## Contributing

We welcome contributions! Here's how you can help:

### Report Bugs
- Use the [issue tracker](https://github.com/mhdgning131/flashcard/issues)
- Provide detailed reproduction steps
- Include browser and OS information

### Suggest Features
- Check existing [feature requests](https://github.com/mhdgning131/flashcard/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)
- Open a new issue with the `enhancement` label
- Describe the feature and its benefits

### Submit Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests if applicable
5. Commit with clear messages: `git commit -m 'Add amazing feature'`
6. Push to your fork: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Write meaningful commit messages
- Update documentation for new features
- Ensure mobile responsiveness
- Test across different browsers

## Project Structure

```
flashcard/
├── src/
│   ├── components/          # React components
│   │   ├── Flashcard.tsx   # Main flashcard component
│   │   ├── Header.tsx      # App header
│   │   └── ...
│   ├── services/           # API and utility services
│   │   ├── geminiService.ts # AI integration
│   │   └── storageService.ts # Local storage
│   ├── utils/              # Helper functions
│   └── types.ts            # TypeScript definitions
├── backend/
│   └── server.js           # Express server
├── public/
│   ├── robots.txt          # SEO optimization
│   ├── sitemap.xml         # Search engine sitemap
│   └── ...                 # Static assets
├── package.json
└── README.md
```

## Roadmap

See our [TODO.md](./TODO.md) for planned features and improvements:

- Spaced repetition algorithm
- User accounts and sync
- Export to Anki/CSV
- Study statistics and analytics
- Collaborative flashcard sets
- Mobile app (PWA)
- AI-powered difficulty adjustment

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Google AI](https://ai.google.dev/) for powerful AI capabilities
- [Tailwind CSS](https://tailwindcss.com/) for beautiful styling
- [Framer Motion](https://www.framer.com/motion/) for smooth animations
- [Lucide](https://lucide.dev/) for clean icons
- [Vite](https://vitejs.dev/) for blazing fast development

## Support

- [Report Issues](https://github.com/mhdgning131/flashcard/issues)
- [Discussions](https://github.com/mhdgning131/flashcard/discussions)
- Email: your.email@example.com

---

Made with care for the learning community

[Try it now!](https://ai-flashcards-7fd.pages.dev/) • [Contribute](#contributing) • [Report Bug](https://github.com/mhdgning131/flashcard/issues)

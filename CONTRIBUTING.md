# Contributing to AI Flashcard Generator

Thank you for your interest in contributing to the AI Flashcard Generator! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Development Standards](#development-standards)

## 🤝 Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and constructive in all interactions.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git
- A Google AI API key (for AI functionality)

### First Time Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-flashcard-generator.git
   cd ai-flashcard-generator
   ```
3. Add the original repository as upstream:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/ai-flashcard-generator.git
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
6. Add your Google AI API key to `.env`

## 🛠️ Development Setup

### Running the Application

```bash
# Start both frontend and backend
npm run dev:full

# Or run separately
npm run dev          # Frontend only (http://localhost:5173)
npm run dev:backend  # Backend only (http://localhost:3001)
```

### Building for Production

```bash
npm run build
npm run preview
```

## 📝 Contributing Guidelines

### Types of Contributions

We welcome several types of contributions:

- 🐛 **Bug fixes**
- ✨ **New features**
- 📚 **Documentation improvements**
- 🎨 **UI/UX enhancements**
- ⚡ **Performance optimizations**
- 🧪 **Tests**
- 🌐 **Translations**

### Before You Start

1. Check existing [issues](https://github.com/yourusername/ai-flashcard-generator/issues) and [pull requests](https://github.com/yourusername/ai-flashcard-generator/pulls)
2. For new features, open an issue first to discuss the idea
3. For bug fixes, make sure the bug hasn't been fixed already

### Branch Naming Convention

- `feature/description` - for new features
- `bugfix/description` - for bug fixes
- `docs/description` - for documentation
- `refactor/description` - for code refactoring

Examples:
- `feature/spaced-repetition`
- `bugfix/card-flip-animation`
- `docs/api-documentation`

## 🔄 Pull Request Process

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clean, readable code
- Follow existing code style
- Add comments for complex logic
- Update documentation if needed

### 3. Test Your Changes

- Test manually in different browsers
- Check mobile responsiveness
- Verify accessibility features
- Run the build process

### 4. Commit Your Changes

Use clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add spaced repetition algorithm

- Implement SM-2 algorithm for optimal review timing
- Add difficulty rating for each card
- Update card interface to show next review date
- Add tests for spaced repetition logic"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub with:

- **Clear title** describing the change
- **Detailed description** of what was changed and why
- **Screenshots** for UI changes
- **Testing instructions** for reviewers
- **Links to related issues**

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing
- [ ] Tested on Chrome/Firefox/Safari
- [ ] Mobile responsive
- [ ] Keyboard navigation works
- [ ] No console errors

## Screenshots
(If applicable)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes
```

## 🐛 Issue Guidelines

### Bug Reports

Please include:

- **Clear title** summarizing the bug
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Screenshots** or screen recordings
- **Browser and OS** information
- **Error messages** from console (if any)

### Feature Requests

Please include:

- **Clear description** of the feature
- **Use case** - why is this needed?
- **Proposed solution** (if you have ideas)
- **Alternatives considered**
- **Examples** from other applications

## 🎯 Development Standards

### Code Style

- **TypeScript**: Use strict typing, avoid `any`
- **React**: Use functional components with hooks
- **CSS**: Use Tailwind CSS classes, avoid custom CSS when possible
- **Naming**: Use descriptive variable and function names
- **Files**: Use PascalCase for components, camelCase for utilities

### Component Structure

```tsx
// Good component structure
interface Props {
  title: string;
  onAction: () => void;
}

export const MyComponent: React.FC<Props> = ({ title, onAction }) => {
  const [state, setState] = useState<string>('');

  const handleSomething = useCallback(() => {
    // Implementation
  }, []);

  return (
    <div className="flex items-center p-4">
      {/* Component JSX */}
    </div>
  );
};
```

### Accessibility

- Use semantic HTML elements
- Include proper ARIA labels
- Ensure keyboard navigation works
- Test with screen readers
- Maintain good color contrast

### Performance

- Use React.memo for expensive components
- Implement proper key props in lists
- Avoid unnecessary re-renders
- Optimize images and assets
- Use lazy loading when appropriate

## 📚 Documentation

When adding new features:

- Update README.md if needed
- Add JSDoc comments for complex functions
- Update type definitions
- Consider adding usage examples

## 🌐 Internationalization

If adding text content:

- Use descriptive keys for translations
- Consider right-to-left languages
- Test with longer text in other languages
- Update language detection logic if needed

## ❓ Questions and Support

- 💬 [GitHub Discussions](https://github.com/yourusername/ai-flashcard-generator/discussions) for general questions
- 🐛 [Issues](https://github.com/yourusername/ai-flashcard-generator/issues) for bugs and feature requests
- 📧 Email: your.email@example.com for private inquiries

## 🙏 Recognition

Contributors will be:

- Listed in the project README
- Mentioned in release notes
- Credited in the about section
- Given maintainer status for significant contributions

Thank you for helping make AI Flashcard Generator better for everyone! 🚀
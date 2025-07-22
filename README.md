# Skip-Bo React Application

A modern React implementation of the Skip-Bo card game, refactored from vanilla JavaScript to use React 18, TypeScript, and Vite.

## 🚀 Features

- **Modern React Architecture**: Component-based UI with TypeScript
- **AI Opponent**: Intelligent computer player with strategic decision-making
- **Multiple Themes**: Light, Dark, Metro, Neon, and Retro themes
- **Responsive Design**: Works on desktop and mobile devices
- **Type Safety**: Full TypeScript implementation
- **Fast Development**: Vite for lightning-fast builds and HMR

## 🛠 Technology Stack

### Core Framework & Build Tool
- **React 18.3.1** - Component-based UI library
- **TypeScript 5.5.3** - Type-safe JavaScript
- **Vite 5.4.11** - Fast build tool and dev server

### UI & Styling
- **Tailwind CSS 3.4.13** - Utility-first CSS framework
- **next-themes** - Dark/light theme support
- **Lucide React** - Icon library
- **shadcn/ui components** - Pre-built accessible components

### State Management & Utilities
- **TanStack Query 5.56.2** - Server state management and caching
- **React Hook Form 7.53.0** - Form handling
- **Zod 3.23.8** - Schema validation
- **class-variance-authority** - Type-safe variant styling

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI components (Button, etc.)
│   ├── Card.tsx      # Game card component
│   ├── GameBoard.tsx # Main game board layout
│   ├── PlayerArea.tsx # Player interface component
│   ├── CenterArea.tsx # Build piles and deck
│   └── ThemeSwitcher.tsx # Theme selection
├── hooks/
│   ├── useSkipBoGame.ts # Main game logic hook
│   └── useAIPlayer.ts   # AI player logic
├── lib/
│   ├── config.ts     # Game configuration
│   └── utils.ts      # Utility functions
├── types/
│   └── index.ts      # TypeScript type definitions
├── App.tsx           # Main application component
├── main.tsx          # Application entry point
└── index.css         # Global styles with Tailwind
```

## 🎮 How to Play

1. **Objective**: Be the first player to empty your stock pile
2. **Your Turn**: 
   - Select cards from your hand, stock pile, or discard piles
   - Play cards on build piles (sequential 1-12)
   - Skip-Bo cards are wild and can be any number
   - Discard unwanted cards to end your turn
3. **Build Piles**: Play cards in sequence (1, 2, 3... up to 12)
4. **Winning**: Empty your stock pile completely to win!

## 🚀 Getting Started

### Prerequisites
- Node.js 16.0 or later
- pnpm (recommended) or npm

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Start the development server:
```bash
pnpm dev
```

3. Open your browser to `http://localhost:5173`

### Build for Production

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

## 🧪 Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint
- `pnpm test` - Run tests with Vitest

### Code Quality

The project includes:
- ESLint with React and TypeScript rules
- TypeScript strict mode
- Tailwind CSS for consistent styling
- Component-based architecture

## 🎨 Themes

The application supports 5 different themes:
- **Light** - Clean, bright interface
- **Dark** - Easy on the eyes
- **Metro** - Modern, minimalist design
- **Neon** - Vibrant, colorful theme
- **Retro** - Nostalgic, vintage styling

## 🤖 AI Implementation

The AI player uses a strategic decision-making system:

1. **Priority 1**: Play from stock pile (highest priority for winning)
2. **Priority 2**: Play from hand (clear hand cards)
3. **Priority 3**: Play from discard piles (utilize discarded cards)
4. **Priority 4**: Strategic discarding (preserve valuable cards)

The AI includes delays to make moves visible and creates a more natural gameplay experience.

## 📦 Dependencies

### Production Dependencies
- React ecosystem (React, React-DOM)
- Styling (Tailwind CSS, next-themes)
- State management (TanStack Query)
- Form handling (React Hook Form, Zod)
- Utilities (class-variance-authority, clsx, tailwind-merge)

### Development Dependencies
- Build tools (Vite, TypeScript)
- Linting (ESLint with React/TypeScript plugins)
- Testing (Vitest)
- PostCSS and Autoprefixer

## 🔄 Migration from Legacy Code

This React application maintains all functionality from the original vanilla JavaScript implementation while adding:

- **Type Safety**: Full TypeScript implementation prevents runtime errors
- **Component Architecture**: Reusable, maintainable components
- **Modern State Management**: React hooks for clean state handling
- **Improved Performance**: React optimizations and virtual DOM
- **Better Developer Experience**: Hot module replacement, TypeScript IntelliSense
- **Accessibility**: Better keyboard navigation and screen reader support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

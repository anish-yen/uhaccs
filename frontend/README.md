# FitQuest Frontend

A gamified fitness tracking frontend built with Vite + React + TypeScript.

## Features

- 🎮 **Gamified Dashboard**: Track exercises with points, levels, and achievements
- 📊 **Exercise History**: View all completed exercises with detailed information
- 🔥 **Muscle Activation Heatmap**: Visualize which muscles have been activated through exercises
- 📹 **Webcam View**: See yourself through your webcam for form checking or recording workouts
- 🎯 **Points System**: Earn points for each exercise completed
- 📈 **Stats Tracking**: Level, XP, streak, and rank tracking

## Tech Stack

- **Vite** - Fast build tool and dev server
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **date-fns** - Date formatting

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Create a `.env` file (optional, for backend integration):
```bash
VITE_API_URL=http://localhost:5000/api
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

The app will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
# or
yarn build
# or
pnpm build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/          # React components
│   ├── BodyHeatmap.tsx # Muscle activation visualization
│   ├── ExerciseList.tsx # Exercise history display
│   └── WebcamView.tsx  # Webcam component
├── lib/                # Utilities and data
│   ├── api.ts         # Backend API utilities
│   ├── exercise-data.ts # Exercise data and types
│   └── utils.ts       # Helper functions
├── App.tsx            # Main app component
├── main.tsx           # Entry point
└── index.css          # Global styles
```

## Backend Integration

The frontend is designed to work with a backend API. The API utilities are in `src/lib/api.ts`.

### API Endpoints Expected

- `GET /api/exercises` - Get all exercises
- `GET /api/exercises/:id` - Get exercise by ID
- `POST /api/exercises` - Create new exercise
- `PUT /api/exercises/:id` - Update exercise
- `DELETE /api/exercises/:id` - Delete exercise
- `GET /api/user/stats` - Get user statistics
- `PUT /api/user/stats` - Update user statistics

Set `VITE_API_URL` in your `.env` file to configure the backend URL.

## Features in Detail

### Dashboard Tab
- View exercise history with points earned
- See muscle activation heatmap
- Track stats (level, XP, streak, rank)
- View today's points

### Webcam Tab
- Start/stop webcam feed
- Real-time video preview
- Useful for form checking during workouts

## Development

The project uses:
- **Vite** for fast HMR (Hot Module Replacement)
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Path aliases** (`@/` maps to `src/`)

## License

MIT




# Installing MediaPipe Packages

The MediaPipe pose detection requires npm packages to be installed. Run this command in the frontend directory:

```bash
cd frontend
npm install @mediapipe/pose @mediapipe/drawing_utils @mediapipe/camera_utils
```

## Alternative: If npm install fails

If you encounter permission errors, you can:

1. **Install globally or fix npm permissions:**
   ```bash
   # Fix npm permissions (macOS/Linux)
   sudo chown -R $(whoami) ~/.npm
   
   # Or use npx
   npx npm install @mediapipe/pose @mediapipe/drawing_utils @mediapipe/camera_utils
   ```

2. **Or install manually:**
   - The packages are already listed in `package.json`
   - Just run `npm install` in the frontend directory
   - This will install all dependencies including MediaPipe

## After Installation

Once installed, restart your Vite dev server:

```bash
npm run dev
```

The pose detection should now work properly!


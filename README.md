# uhaccs

Health reminder app with camera-verified check-ins, built at a hackathon.

Most reminder apps trust that you did the thing. This one doesn't: it sends health reminders (hydration, exercise) and uses on-device computer vision in the browser to verify the action before the reminder counts as done, with gamified stats on top.

## Stack

- Frontend: React + TypeScript (Vite), MediaPipe and react-webcam for on-device verification
- Backend: Express + WebSocket, Redis, scheduled recurring reminders

## Run it

Setup instructions live in `backend/README.md` and `frontend/README.md`.

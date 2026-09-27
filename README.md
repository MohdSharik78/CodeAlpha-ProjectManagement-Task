# CodeAlpha Task 3 — Project Management Tool

A responsive full-stack collaborative project management app inspired by Trello/Asana.

## Features
- User registration and JWT login
- Create group projects
- Add project members by username
- Kanban-style task board: To Do / In Progress / Done
- Create, edit and delete tasks
- Assign tasks to project members
- Priority and due dates
- Task comments and team communication
- Notifications
- Socket.IO real-time task updates
- Responsive desktop/tablet/mobile UI
- Light/dark theme

## Stack
Frontend: HTML, CSS, JavaScript
Backend: Node.js, Express.js, MongoDB, JWT, Socket.IO

## Run locally
1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env` and set MongoDB/JWT values.
4. `npm start`
5. Open `frontend/register.html` with Live Server (recommended) or another static server.
6. If the backend URL changes, update `API_URL` in `frontend/js/auth.js` and `frontend/js/app.js`.

## Deployment
Backend: Render Web Service, root directory `backend`, build `npm install`, start `node server.js`.
Frontend: Render Static Site, root directory `frontend`, publish directory `.`.
Set the frontend API URLs to the public backend URL before deploying.

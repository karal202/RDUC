# Webadmin backend

## Start the backend

Run these commands from the repository root:

```powershell
Push-Location .\webadmin\backend
npm install
npm start
Pop-Location
```

The API and Socket.IO server listen on `http://localhost:3069` by default. The
port can be changed with `PORT` in `.env`.

Health checks:

- `GET http://localhost:3069/health`
- `GET http://localhost:3069/api/license/health`

If startup reports that port `3069` is already in use, do not start a second
backend instance. Check the existing process or change `PORT` and update the
frontend API and Socket.IO URLs accordingly.
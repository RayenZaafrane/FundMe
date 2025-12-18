# FundMe - Quick Start Guide

## ✅ All Code is Now Fixed and Optimized!

### What You Need to Do Manually:

**Nothing!** Everything is configured and ready to go.

---

## 🚀 How to Run the Application

### 1. **Start the Backend** (Terminal 1)
```powershell
cd C:\Users\youusername\OneDrive\Desktop\Etudie\FundMe\backend
node server.js
```
You should see:
```
✓ Connected to MongoDB (Clients database)
✓ Server is running on http://localhost:5001
```

### 2. **Start the Frontend** (Terminal 2)
```powershell
cd C:\Users\yourusername\OneDrive\Desktop\Etudie\FundMe\frontend
npm run dev
```
You should see:
```
➜ Local: http://localhost:5173/ (or 5174 if 5173 is busy)
```

---

## 📝 Testing the App


### Create a New Account
- Go to Register page
- Enter any name, email, and password (minimum 3 characters)
- You'll be logged in automatically

---

## ✨ Features Implemented

✅ User Registration with password hashing (bcryptjs)
✅ User Login with JWT authentication
✅ MongoDB database integration (Clients DB, Client_acc collection)
✅ Protected routes (redirects to login if not authenticated)
✅ Hamburger menu with login/logout options
✅ Responsive authentication UI
✅ Error handling and validation

---

## 🔐 Database Details

- **Database:** Cluster0
- **Collection:** test

---

## 📂 Project Structure

```
FundMe/
├── backend/
│   ├── models/User.js
│   ├── routes/auth.js
│   ├── server.js
│   ├── package.json
│   └── .env
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   └── Home.jsx
    │   ├── styles/
    │   │   ├── Auth.css
    │   │   └── Home.css
    │   ├── App.jsx
    │   ├── api.js
    │   └── main.jsx
    └── package.json
```

---

## 🐛 Troubleshooting

**Issue:** "Network Error" when trying to login
- Make sure backend is running on port 5001
- Check that both services are started

**Issue:** "Invalid credentials"
- Make sure you're using the correct email and password
- Try registering a new account instead

**Issue:** Port 5173 already in use
- The app will automatically use 5174 or another available port
- Just use the URL shown in the terminal

---

## ✅ Everything is Ready!

Just open your browser and navigate to the URL shown in the frontend terminal!

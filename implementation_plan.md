# Online Exam Web Application - MERN Stack

Build a full-stack online exam platform with **React + Vite + Bootstrap** frontend and **Node.js + Express + MongoDB** backend. Features include authentication (Register/Login), admin panel (manage exams, questions, users, scores), and a student exam interface with MCQ timer, webcam monitoring, and auto-submit.

## User Review Required

> [!IMPORTANT]
> **MongoDB Connection**: You will need a running MongoDB instance. The app will default to `mongodb://localhost:27017/exam-web`. Please confirm if you'd like a different connection string or want to use MongoDB Atlas instead.

> [!IMPORTANT]
> **Webcam Feature**: The webcam will use the browser's `getUserMedia` API. Students must grant camera permission. Should we block the exam if webcam permission is denied?

## Proposed Changes

### Project Structure

```
exam-web/
├── client/                    # React + Vite + Bootstrap
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   │   ├── Register.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── ExamPage.jsx
│   │   │   ├── ExamResult.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── ManageExams.jsx
│   │   │   ├── ManageQuestions.jsx
│   │   │   ├── ManageUsers.jsx
│   │   │   └── ViewResults.jsx
│   │   ├── context/           # Auth context
│   │   ├── utils/             # API helpers, auth headers
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/                    # Express + MongoDB
│   ├── models/
│   │   ├── User.js
│   │   ├── Exam.js
│   │   ├── Question.js
│   │   └── Result.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── exams.js
│   │   ├── questions.js
│   │   ├── results.js
│   │   └── users.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   └── package.json
└── README.md
```

---

### Backend - Server Setup

#### [NEW] [server.js](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/server/server.js)
- Express server with CORS, JSON parsing
- MongoDB connection via Mongoose
- Mount all route files

#### [NEW] [package.json](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/server/package.json)
- Dependencies: `express`, `mongoose`, `bcryptjs`, `jsonwebtoken`, `cors`, `dotenv`
- Dev dependency: `nodemon`

---

### Backend - Models

#### [NEW] [User.js](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/server/models/User.js)
- Fields: `name`, `email`, `password` (hashed), `role` (enum: student/teacher/admin)
- Default role: `student`

#### [NEW] [Exam.js](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/server/models/Exam.js)
- Fields: `title`, `description`, `date`, `startTime`, `duration` (minutes), `timePerQuestion` (default 60s), `passingScore`, `createdBy`, `isActive`

#### [NEW] [Question.js](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/server/models/Question.js)
- Fields: `exam` (ref), `questionText`, `options` (array of 4), `correctAnswer` (index 0-3)

#### [NEW] [Result.js](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/server/models/Result.js)
- Fields: `student` (ref), `exam` (ref), `answers` (array), `score`, `totalQuestions`, `attemptedQuestions`, `passed` (boolean), `submittedAt`

---

### Backend - Auth & Middleware

#### [NEW] [auth.js middleware](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/server/middleware/auth.js)
- JWT token verification middleware
- Role-based access: [isAdmin](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/server/middleware/auth.js#25-32), [isTeacher](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/server/middleware/auth.js#33-40), [isAdminOrTeacher](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/server/middleware/auth.js#41-48)

#### [NEW] [auth.js route](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/server/routes/auth.js)
- `POST /api/auth/register` - Register with name, email, password
- `POST /api/auth/login` - Login, return JWT token + user info

---

### Backend - API Routes

#### [NEW] [exams.js](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/server/routes/exams.js)
- CRUD for exams (admin/teacher only for create/update/delete)
- Students can list active exams

#### [NEW] [questions.js](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/server/routes/questions.js)
- Add/remove questions to an exam (admin/teacher)
- Get questions for an exam (students, during exam only)

#### [NEW] [results.js](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/server/routes/results.js)
- `POST /api/results/submit` - Submit exam answers, auto-calculate score & pass/fail
- `GET /api/results/exam/:examId` - All results for an exam (admin/teacher)
- `GET /api/results/my` - Student's own results

#### [NEW] [users.js](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/server/routes/users.js)
- `GET /api/users` - List all users (admin)
- `PUT /api/users/:id/role` - Change user role (admin)

---

### Frontend - Setup & Config

#### [NEW] [client/](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/client/)
- Initialize with `npx create-vite@latest ./ --template react`
- Install: `bootstrap`, `react-bootstrap`, `react-router-dom`, `axios`

---

### Frontend - Authentication Pages

#### [NEW] [Register.jsx](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/client/src/pages/Register.jsx)
- Registration form: Name, Email, Password, Confirm Password
- Bootstrap styled card layout
- Redirect to login on success

#### [NEW] [Login.jsx](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/client/src/pages/Login.jsx)
- Login form: Email, Password
- Store JWT in localStorage
- Redirect based on role (admin → admin dashboard, student → student dashboard)

#### [NEW] [AuthContext.jsx](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/client/src/context/AuthContext.jsx)
- React context for auth state (user, token, login, logout)
- Protected route wrapper component

---

### Frontend - Student Pages

#### [NEW] [StudentDashboard.jsx](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/client/src/pages/StudentDashboard.jsx)
- List available exams with date/time
- View past results

#### [NEW] [ExamPage.jsx](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/client/src/pages/ExamPage.jsx)
- **MCQ interface**: one question at a time with 4 options
- **Timer**: 1 minute per question countdown, visible on screen
- **Webcam**: live video feed from camera displayed in corner
- **Auto-submit**: when timer reaches 0 on last question, or total time expires
- **Navigation**: Next/Previous buttons, question palette

#### [NEW] [ExamResult.jsx](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/client/src/pages/ExamResult.jsx)
- "Thank you" page after submission
- Show score, attempted questions, pass/fail status

---

### Frontend - Admin Pages

#### [NEW] [AdminDashboard.jsx](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/client/src/pages/AdminDashboard.jsx)
- Overview cards: total exams, total students, recent results

#### [NEW] [ManageExams.jsx](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/client/src/pages/ManageExams.jsx)
- Create exam: title, date, time, duration, passing score
- List/edit/delete exams

#### [NEW] [ManageQuestions.jsx](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/client/src/pages/ManageQuestions.jsx)
- Select exam → add MCQ questions (question text, 4 options, correct answer)
- List/remove existing questions

#### [MODIFY] [ViewResults.jsx](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/client/src/pages/ViewResults.jsx)
- Results table: Student Name | Attempted Q | Score | Pass/Fail
- Filter by exam

#### [MODIFY] [ManageUsers.jsx](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/client/src/pages/ManageUsers.jsx)
- List all users with roles
- Change role (student ↔ teacher ↔ admin)
- Add functional view: filter students by the specific exam they took

### Phase 9 Features - Anti-Cheat
#### [MODIFY] [ExamPage.jsx](file:///c:/Users/sneha/OneDrive/Desktop/exam-web/client/src/pages/ExamPage.jsx)
- Integrate a simple face detection model (e.g., using `blazeface` via TensorFlow.js or `@vladmandic/face-api`) via a separate tool or CDN script.
- If multiple faces are detected in the webcam during the exam, show an anti-cheat warning modal or auto-submit based on violations.

---

## Verification Plan

### Browser Testing
1. **Auth Flow**: Open `http://localhost:5173`, register a new account, login, verify redirect to correct dashboard
2. **Admin Flow**: Login as admin → create exam → add questions → verify they appear
3. **Exam Flow**: Login as student → start exam → verify timer, webcam, MCQ display → let timer auto-submit → verify result page
4. **Results**: Login as admin → view results table with student name, score, pass/fail

### Manual Verification
- Verify the server starts on port `5000` and connects to MongoDB
- Verify the client starts on port `5173` with Vite dev server
- Register a user and check MongoDB for the hashed password
- Create an exam and verify the timer auto-submits correctly

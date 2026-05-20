# Online Exam Web Application

A full-stack MERN application for managing and taking online exams.

## Prerequisites
Before you begin, ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/en/download/) (v16 or higher recommended)
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally, or use a MongoDB Atlas URI)

> **Note:** You do **not** need `ngrok` to run this application locally. `ngrok` is only used if you want to expose your local server to the public internet.

## Getting Started

Follow these steps to get the project up and running on your local machine.

### 1. Clone the repository
```bash
git clone <repository-url>
cd exam-web
```

### 2. Backend Setup
1. Open a terminal and navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `server` folder (you can copy `.env.example` if it exists) and add the following:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/exam-web
   JWT_SECRET=your_secret_key_here
   ```
4. Start the backend server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Open a **new** terminal and navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `client` folder and set the local API URL:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```

### 4. Open the App
Once both servers are running, the frontend will be available at [http://localhost:5173](http://localhost:5173).

## Default Accounts
*(Add any default admin/student credentials here if applicable, or instruct them to register a new account on the login page)*

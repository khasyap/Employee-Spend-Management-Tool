# Employee Spend Management Tool (MEAN Stack)

A full-stack web application built using the **MEAN Stack (MongoDB, Express.js, Angular, Node.js)** for managing and tracking employee expenses efficiently.

This system enables users to **add, view, edit, and delete employee spend records**, generate reports, and analyze spending across departments and categories.

---

## 🚀 Features

✅ Add and manage employee expenses (CRUD operations)  
✅ Track total spending by employee, category, and date range  
✅ RESTful API using Express and MongoDB  
✅ Interactive and responsive Angular frontend  
✅ Real-time data updates and validations  
✅ Secure backend with environment-based configuration  
✅ Easy deployment on cloud (Render, Vercel, Netlify, or MongoDB Atlas)

---

## 🧩 Tech Stack

| Layer | Technology |
|--------|-------------|
| **Frontend** | Angular 16, TypeScript, HTML5, SCSS |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Local or Atlas) |
| **Package Manager** | npm |
| **Version Control** | Git & GitHub |

---

## 📂 Project Structure

```
Employee-Spend-Management-Tool/
├── backend/
│   ├── server.js              # Main Node.js server file
│   ├── package.json           # Backend dependencies
│   ├── config/
│   │   └── db.js              # MongoDB connection configuration
│   ├── models/
│   │   └── expense.model.js   # Mongoose schema for expenses
│   └── routes/
│       └── expense.routes.js  # Express API routes
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    # Angular components
│   │   │   ├── services/      # API services
│   │   │   └── app.module.ts
│   │   ├── assets/
│   │   └── index.html
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

---

## ⚙️ Installation & Setup

### 🧾 Prerequisites

Ensure you have the following installed:
- **Node.js** (v16 or later): [Download Node.js](https://nodejs.org/)
- **MongoDB** (local or Atlas): [MongoDB Installation](https://www.mongodb.com/try/download/community)
- **Angular CLI** (globally):  
  ```bash
  npm install -g @angular/cli
  ```

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/khasyap/Employee-Spend-Management-Tool.git
cd Employee-Spend-Management-Tool
```

---

### 2️⃣ Setup the Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/employee-spend
```

Start the backend server:
```bash
npm start
```
Backend runs at: [http://localhost:5000](http://localhost:5000)

---

### 3️⃣ Setup the Frontend

```bash
cd ../frontend
npm install
ng serve
```

Frontend runs at: [http://localhost:4200](http://localhost:4200)

---

### 4️⃣ Connect Frontend to Backend

In your Angular service file (e.g., `expense.service.ts`), configure API URL:

```typescript
baseUrl = 'http://localhost:5000/api/expenses';
```

---

## 🧠 API Endpoints

| Method | Endpoint | Description |
|--------|-----------|-------------|
| `GET` | `/api/expenses` | Get all expenses |
| `GET` | `/api/expenses/:id` | Get a single expense |
| `POST` | `/api/expenses` | Add a new expense |
| `PUT` | `/api/expenses/:id` | Update an expense |
| `DELETE` | `/api/expenses/:id` | Delete an expense |

Test using [Postman](https://www.postman.com/) or your Angular frontend.

---

## 🧾 Example Expense Data

```json
{
  "employee": "Saketh",
  "amount": 2500,
  "category": "Travel",
  "description": "Client meeting in Hyderabad",
  "date": "2025-11-22"
}
```

---

## 🧱 Running Both Servers Together

Use **concurrently** to run backend and frontend simultaneously.

Install globally:
```bash
npm install -g concurrently
```

Add this to your root `package.json`:

```json
"scripts": {
  "start": "concurrently "npm run server" "npm run client"",
  "server": "cd backend && npm start",
  "client": "cd frontend && ng serve"
}
```

Run both servers:
```bash
npm start
```

---

## 🧮 Future Enhancements

- [ ] Add JWT Authentication (Login/Signup)  
- [ ] Role-based access (Admin, Employee)  
- [ ] Dashboard visualization using Chart.js or D3.js  
- [ ] Export reports to CSV / Excel / PDF  
- [ ] Deploy to **Render** (Backend) and **Netlify/Vercel** (Frontend)  
- [ ] Integrate Email notifications for expense approvals  

---

## 📊 Deployment Guide

### 🟢 Frontend Deployment (Netlify / Vercel)

1. Build Angular App:
   ```bash
   ng build --prod
   ```
2. Deploy the `dist/` folder to Netlify or Vercel.

### 🟣 Backend Deployment (Render / Railway / Heroku)

1. Push your code to GitHub.  
2. Connect your GitHub repo on Render or Railway.  
3. Add environment variables (`MONGO_URI`, `PORT`) in the dashboard.  
4. Deploy — your API will be live!

---

## 👨‍💻 Author

**Konakalla Khasyap Surya Saketh**  
Full Stack Developer | MEAN Developer | Data & Power BI Enthusiast  

📧 Email: kkssaketh@gmail.com  
🔗 [GitHub](https://github.com/khasyap)  
🔗 [LinkedIn](https://linkedin.com/in/konakalla-khasyap-surya-saketh)

---

## 📝 License

This project is licensed under the **MIT License**.  
You are free to use, modify, and share it with proper attribution.

---

> 💼 “Track every expense. Empower smarter business decisions.”

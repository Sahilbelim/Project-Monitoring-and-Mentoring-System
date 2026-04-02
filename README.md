# Project Monitoring and Mentoring System (PMMS)

## 🚀 Overview
The **Project Monitoring and Mentoring System (PMMS)** is a high-performance, multi-tenant SaaS platform designed for modern organizations to manage their projects, teams, and talent in one unified environment. It bridges the gap between project execution and member development, providing a "Digital HQ" that combines task management with real-time communication and specialized organizational monitoring.

---

## 🛠 Core Pillars
1.  **True Multi-Tenancy**: Complete data isolation between organizations using a robust scoping mechanism.
2.  **Real-Time Collaboration**: Powered by **Socket.IO** and **Redis**, ensuring instant updates for chats, task movements, and notifications.
3.  **Modern Reactivity**: Built with **Angular 21** and **Signals**, delivering a high-performance, lag-free user experience.
4.  **Premium Aesthetics**: A professional interface utilizing **Tailwind CSS**, **Glassmorphism**, and **GSAP** for smooth, meaningful animations.

---

## ✨ Key Features

### 📋 Task Kanban Engine
- **Visual Workflow**: Drag-and-drop tasks across custom status columns.
- **Optimistic Updates**: Immediate UI response with background server synchronization.
- **Context-Aware**: Tasks are linked to specific projects with deep access control.

### 💬 Collaborative Chat
- **Contextual Channels**: Dedicated chat rooms for projects and departments.
- **Real-time Status**: Presence tracking to see who is online/offline.
- **Direct Messaging**: Private communication between organization members.

### 📊 Analytics Dashboard
- **Role-Based Insights**: Managers see organization-wide metrics; members see personal performance data.
- **Interactive Graphs**: Visual tracking of task completion, project health, and team velocity.

### 🔒 Security & RBAC
- **2FA Support**: Optional two-factor authentication for sensitive accounts.
- **Role-Based Access Control**: Granular permissions for Admins, Managers, and Members.
- **JWT-Based Auth**: Secure, stateless authentication with refresh token rotation.

---

## 💻 Tech Stack
-   **Frontend Framework**: [Angular 21](https://angular.dev/)
-   **State Management**: Angular Signals (Fine-grained reactivity)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Animations**: [GSAP (GreenSock Animation Platform)](https://gsap.com/)
-   **Real-time Interaction**: [Socket.io-client](https://socket.io/)
-   **Package Manager**: `npm`

---

## 📂 Project Structure
```text
frontend/
├── src/
│   ├── app/
│   │   ├── core/      # Global services, interceptors, and guards
│   │   ├── features/  # Feature modules (Dashboard, Kanban, Chat, etc.)
│   │   ├── shared/    # Reusable components, layout, and UI kit
│   │   └── app.routes.ts # Main application routing
│   ├── assets/        # Static images and icons
│   └── styles.css     # Global styles and Tailwind imports
└── angular.json       # Angular project configuration
```

---

## ⚡ Quick Start

### Prerequisites
-   [Node.js](https://nodejs.org/) (v20+ recommended)
-   [Angular CLI](https://angular.dev/tools/cli) installed globally (`npm install -g @angular/cli`)

### Installation & Development
1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Serve the Application**:
    ```bash
    npm start
    # or
    ng serve
    ```
3.  **Access the Platform**:
    Open [http://localhost:4200](http://localhost:4200) in your browser.

---

## 🧪 Testing & Quality
-   **Unit Tests**: Run `ng test` to execute unit tests via [Vitest](https://vitest.dev/).
-   **Build for Production**: Run `ng build` to generate an optimized production bundle in the `dist/` folder.

---

## 📜 Metadata
- **Project Name**: Project Monitoring and Mentoring System
- **Codename**: Antigravity / PMMS
- **Category**: Enterprise Resource Management (ERM)

---
*Created with ❤️ for high-performance teams.*

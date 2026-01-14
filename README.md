# 🍔 FastFood Muslim (Dastfood)

A premium, God-tier fast food management system and customer application inspired by Burger King. Built with React, Vite, Firebase, and Gemini AI.

## ✨ Features

- **📱 Customer App**: Premium glassmorphic UI, real-time menu, AI-enhanced product details, and seamless cart experience.
- **🛡️ Admin Dashboard**: Role-based access (Manager, Administrator, Accountant) with granular controls for orders, menu, and finance.
- **🤖 AI Product Creator**: Automated product generation using Google Gemini AI, including descriptions, ingredients, and pricing suggestions.
- **🍳 Kitchen Display**: Optimized interface for chefs to manage and track orders in real-time.
- **🖥️ Kiosk Mode**: Self-service kiosk interface for in-store ordering.

## 🚀 Tech Stack

- **Frontend**: React 18, Vite, Framer Motion (for animations), Lucide React (icons).
- **Backend**: Firebase (Firestore, Authentication, Hosting).
- **AI**: Google Gemini Pro (via `@google/generative-ai`).
- **Styling**: Vanilla CSS with modern Glassmorphism and Tailwind utility tokens.

## 🛠️ Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Muslimceek/fastfoodmuslim.git
   cd fastfoodmuslim
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Firebase**:
   Create a `.env` file in the root directory and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

## 📜 License

MIT License. See `LICENSE` for details.

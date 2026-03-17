# Life Admin Manager

Life Admin Manager is an AI-powered productivity app that helps users manage tasks, deadlines, and documents in one place. It can extract important information from uploaded documents and automatically generate detailed subtasks with smart scheduling.

---

## UI / Design

Figma Screens:  
https://www.figma.com/make/fUs0WP42uVXNU4H2XLZkuO/Life-Admin-Manager-UI-Design?t=Pnmo3AeH35fMncva-1&preview-route=%2Flogin

---

## Features

- Task and deadline tracking  
- Document upload (PDFs/images)  
- AI-powered document data extraction  
- Automatic subtask generation based on task details and documents  
- Google Calendar integration for scheduling  
- Automated reminders for subtasks  

---

## System Architecture / Tech Stack

![Project Infrastructure Diagram](./path-to-your-image.png)

### Overview

The application follows a full-stack architecture combining a modern frontend, serverless backend logic, AI processing, and cloud-based storage.

### Components

- **Frontend (React + Vite + Tailwind CSS)**
  - Handles user interaction and UI
  - Sends HTTP requests to backend services
  - Displays tasks, documents, and AI-generated subtasks

- **Backend (Supabase)**
  - Authentication (Google OAuth)
  - PostgreSQL database for tasks and metadata
  - Storage bucket for uploaded documents (PDFs/images)

- **Backend Logic (API + Serverless Functions)**
  - Handles document processing workflows
  - Coordinates between AI, database, and scheduler
  - Triggers subtask generation and reminder creation

- **AI Layer (OpenAI API - GPT-4o-mini)**
  - Extracts deadlines and key information from documents
  - Generates detailed, context-aware subtasks

- **PDF Processing (pdf-parse)**
  - Extracts raw text from uploaded documents before AI processing

- **Scheduler (Supabase Functions)**
  - Schedules subtasks based on user availability
  - Integrates with Google Calendar data

- **Email Service (Resend / SendGrid)**
  - Sends reminder emails for subtasks
  - Handles notification delivery

---

## Installation & Setup

### 1. Clone the repository
git clone https://github.com/shripadm-29/life-admin-manager.git  
cd life-admin-manager  

### 2. Install dependencies
npm install  

### 3. Set up environment variables

Create a `.env.local` file in the root directory and add:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url  
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key  
OPENAI_API_KEY=your_openai_key  
GOOGLE_CLIENT_ID=your_google_client_id  
GOOGLE_CLIENT_SECRET=your_google_client_secret  

### 4. Run the app locally
npm run dev  

---

## Dependencies

Main dependencies used:

- react  
- next  
- supabase-js  
- openai  
- tailwindcss  
- typescript  

---

## User Guide

1. Sign in using Google  
2. Create a task with title, description, and deadline  
3. Upload documents (PDF/image) to the task  
4. AI extracts key information from documents  
5. AI generates detailed subtasks  
6. Subtasks are scheduled based on your Google Calendar  
7. Reminders are automatically created  

---

## System Design Overview

Workflow:

1. User creates a task  
2. User uploads document(s)  
3. AI extracts important data  
4. AI generates structured subtasks  
5. Calendar data is used to schedule subtasks  
6. Reminders are created  

---

## Design Documents

- UI Design: See Figma link above  
- AI Planning Flow: Task → Document → AI → Subtasks → Calendar → Reminders  
- Data Flow: Supabase (storage + database) + OpenAI (processing)  

---

## Notes

- Requires valid API keys (OpenAI, Supabase, Google)  
- Google Calendar permissions must be enabled  
- AI outputs may vary depending on input quality  

---

## Future Improvements

- Improve AI accuracy for document parsing  
- Mobile-friendly UI  
- Real-time collaboration  
- Smarter task prioritization  

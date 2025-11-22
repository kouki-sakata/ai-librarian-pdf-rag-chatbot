# 🗺️ RAG_PDF Code Map

This document provides a visual overview of the project structure, architecture, and data flow for the **RAG_PDF** application.

## 🏗️ Architecture Overview

The application follows a modern **Client-Server** architecture with a **Next.js** frontend and a **FastAPI** backend, designed for RAG (Retrieval-Augmented Generation) workflows.

```mermaid
graph TD
    subgraph Frontend ["🖥️ Frontend (Next.js)"]
        UI[User Interface]
        Hooks[Custom Hooks]
        API_Client[API Client]
    end

    subgraph Backend ["⚙️ Backend (FastAPI)"]
        API_Gateway[API Routes /v1]
        Services[Business Logic Services]
        Core[Core Config & Telemetry]
    end

    subgraph Infrastructure ["🗄️ Infrastructure & External"]
        VectorDB[(Vector Store)]
        LLM[LLM Provider]
        Storage[File Storage]
    end

    User((User)) -->|Interacts| UI
    UI -->|Uses| Hooks
    Hooks -->|Calls| API_Client
    API_Client -->|HTTP Request| API_Gateway
    API_Gateway -->|Dispatches| Services
    Services -->|Embed/Retrieve| VectorDB
    Services -->|Generate| LLM
    Services -->|Save/Load| Storage
```

---

## 📂 Directory Structure

### 🖥️ Frontend (`/frontend`)

**Stack:** Next.js 16 (App Router), React 19, Tailwind CSS

```mermaid
graph LR
    FE[frontend] --> App[app/]
    FE --> Comp[components/]
    FE --> Hooks[hooks/]
    FE --> Lib[lib/]

    subgraph App_Router ["app/ (App Router)"]
        App --> Page["page.tsx (Home)"]
        App --> Layout["layout.tsx (Root Layout)"]
        App --> GlobalCSS["globals.css"]
    end

    subgraph Components ["components/"]
        Comp --> Upload["upload-form.tsx"]
        Comp --> Chat["chat-interface.tsx"]
        Comp --> UI_Lib["ui/ (shadcn)"]
    end

    subgraph Logic ["Logic"]
        Hooks --> UseChat["use-chat.ts"]
        Lib --> Utils["utils.ts"]
    end
```

### ⚙️ Backend (`/backend`)

**Stack:** Python 3.11+, FastAPI, Poetry

```mermaid
graph LR
    BE[backend] --> App[app/]
    BE --> Tests[tests/]
    BE --> Config["pyproject.toml"]

    subgraph App_Core ["app/"]
        App --> Main["main.py (Entry Point)"]
        App --> Core[core/]
        App --> API[api/v1/]
        App --> Services[services/]
    end

    subgraph API_Layer ["API Layer"]
        API --> Endpoints[endpoints/]
        Endpoints --> ChatEP["chat.py"]
        Endpoints --> UploadEP["upload.py"]
        Endpoints --> HealthEP["health.py"]
    end

    subgraph Service_Layer ["Service Layer"]
        Services --> Ingestion["ingestion.py (PDF Processing)"]
        Services --> ChatService["chat.py (RAG Logic)"]
        Services --> Vector["vector_store.py"]
        Services --> Parser["parser.py"]
        Services --> Storage["storage.py"]
    end
```

---

## 🔄 Key Workflows

### 1. PDF Ingestion Flow

How a PDF file is uploaded and processed for search.

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Backend API
    participant S as Ingestion Service
    participant P as Parser
    participant V as Vector DB

    U->>FE: Upload PDF
    FE->>API: POST /api/v1/upload
    API->>S: Process File
    S->>P: Parse PDF Text
    P-->>S: Extracted Text
    S->>S: Chunk Text
    S->>V: Generate Embeddings & Store
    V-->>S: Success
    S-->>API: Processing Complete
    API-->>FE: 200 OK
    FE-->>U: "Upload Successful"
```

### 2. RAG Chat Flow

How the user asks a question and gets an answer based on the PDF.

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Backend API
    participant CS as Chat Service
    participant V as Vector DB
    participant LLM as AI Model

    U->>FE: Ask Question
    FE->>API: POST /api/v1/chat
    API->>CS: Handle Message
    CS->>V: Search Relevant Context
    V-->>CS: Returned Chunks
    CS->>LLM: Send Prompt + Context + Question
    LLM-->>CS: Generated Answer
    CS-->>API: Response
    API-->>FE: JSON Response
    FE-->>U: Display Answer
```

---

## 🛠️ Tech Stack Details

| Component              | Technology              | Purpose                                       |
| :--------------------- | :---------------------- | :-------------------------------------------- |
| **Frontend Framework** | Next.js 16 (App Router) | Server-side rendering, routing, API handling. |
| **UI Library**         | React 19                | Component-based UI construction.              |
| **Styling**            | Tailwind CSS            | Utility-first CSS framework.                  |
| **Backend Framework**  | FastAPI                 | High-performance Python API framework.        |
| **Package Manager**    | Poetry                  | Python dependency management.                 |
| **Linting/Formatting** | Biome (FE) / Ruff (BE)  | Code quality and consistency.                 |

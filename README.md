# Sully Interpreter AI Frontend

This repository contains the frontend code for the Sully Interpreter AI, a web-based application designed to facilitate real-time translation between English-speaking clinicians and Spanish-speaking patients during medical visits.

## Overview

The Sully Interpreter AI frontend is built with Next.js and provides a user-friendly interface for voice recording, real-time translation, and message display. The application connects to a backend WebSocket service that handles the speech translation and processing.

## Features

- **Real-Time Recording**: Capture audio from the user's microphone and send it to the backend for translation.
- **Bilingual Message Display**: Separate display areas for Spanish (patient) and English (doctor) messages.
- **Text-to-Speech Playback**: Click on any message to have it read aloud.
- **Connection Status**: Visual indicator of the connection status to the backend service.
- **Translation Progress**: Real-time display of translations as they're being processed.
- **Responsive Design**: Layout adapts to different screen sizes.

## Technology Stack

- **Next.js**: React framework for building the web application.
- **React**: JavaScript library for building user interfaces.
- **NextUI**: UI component library for styling and layout.
- **notistack**: Library for displaying snackbar notifications.
- **React Icons**: Icon library for UI elements.
- **Web Audio API**: Used for audio processing and playback.
- **WebSocket API**: For real-time communication with the backend.

## Project Structure

```
sully-interpreter-frontend/
├── app/                  # Next.js application folder
│   ├── page.jsx          # Main application page
│   ├── layout.tsx        # Root layout component
│   └── globals.css       # Global CSS styles
├── public/               # Static assets
└── package.json          # Project dependencies and scripts
```

## Key Components

### Main Page (`page.jsx`)

The main page contains the core functionality of the application:

- WebSocket connection management
- Audio recording and processing
- Message display and management
- Text-to-speech functionality

### Root Layout (`layout.tsx`)

The root layout provides the application shell, including:

- Font configuration (Poppins)
- UI provider setup (NextUI)
- Notification system (notistack)
- Application title and header

## Key Functionality

### WebSocket Communication

The application establishes a WebSocket connection to the backend service (`ws://localhost:8000/ws`) and handles various message types:

- `openai_connected`: Connection confirmation
- `text_response_delta`: Incremental translation updates
- `text_response_done`: Completed translation
- `audio_response_delta`: Audio data chunks
- `audio_response_done`: Completed audio response
- `action_executed`: Confirmation of backend actions
- `error`: Error messages

### Audio Processing

The application:

1. Records audio using the MediaRecorder API
2. Processes the audio to 16-bit PCM at 24kHz
3. Converts the audio to base64 format
4. Sends it to the backend for translation
5. Plays back audio responses

## Setup Instructions

### Prerequisites

- Node.js 14.x or higher
- npm or yarn
- A running instance of the Sully Interpreter AI backend service

### Installation

1. **Clone the Repository**:

   ```bash
   git clone <repository-url>
   cd sully-interpreter-frontend
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run Development Server**:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Access the Application**:
   Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Starting a Session**:

   - Ensure the backend service is running
   - Wait for the "Connected" status to appear
   - Click "Start Recording" to begin capturing audio

2. **Translation Flow**:

   - Speak in English or Spanish (the system will detect the language)
   - The translation appears in real-time in the corresponding panel
   - When finished speaking, click "Stop Recording"

3. **Message Playback**:
   - Click on any message to have it read aloud using text-to-speech
   - The speaker icon indicates this functionality

## Configuration

The application is configured to connect to a local backend service at `ws://localhost:8000/ws`. To change this:

1. Modify the WebSocket URL in the `setupWebSocket` function in `page.jsx`
2. Update any other environment-specific configurations as needed

## Browser Compatibility

The application requires modern browser features:

- WebSocket API
- MediaRecorder API
- Web Audio API
- SpeechSynthesis API

Recommended browsers: Chrome, Firefox, Edge (latest versions)

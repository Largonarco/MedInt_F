# Sully Interpreter AI - Frontend Client

A Next.js-based frontend application for the Medical Interpreter API that facilitates real-time communication between Spanish-speaking patients and English-speaking doctors.

## Overview

This frontend application provides a user-friendly interface for the Medical Interpreter API. It enables real-time audio recording, transmission, and playback, allowing seamless translation between Spanish and English during medical conversations.

## Features

- **Real-Time Audio Recording**: Capture audio input from the device microphone.
- **WebSocket Integration**: Establish real-time bidirectional communication with the backend API.
- **Dual-Language Display**: View translated conversations for both patient (Spanish) and doctor (English).
- **Audio Playback**: Listen to translated messages using browser's speech synthesis.
- **Conversation Summary**: Generate and display a summary of the medical conversation.
- **Status Notifications**: Receive feedback through snackbar notifications for connection status and errors.
- **Responsive Design**: Compatible with various device screen sizes.

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework for the frontend application
- [NextUI](https://nextui.org/) - UI component library
- [notistack](https://iamhosseindhv.com/notistack) - Notification system
- [React Icons](https://react-icons.github.io/react-icons/) - Icon library
- WebSocket API - For real-time communication
- Web Audio API - For audio processing and playback
- MediaRecorder API - For capturing audio from the microphone

## Prerequisites

- Node.js 16.x or higher
- npm or yarn
- Backend Medical Interpreter API service running (see separate README)

## Installation

1. **Clone the Repository**

```bash
git clone https://github.com/yourusername/sully-interpreter-frontend.git
cd sully-interpreter-frontend
```

2. **Install Dependencies**

```bash
npm install
# or
yarn install
```

3. **Configure Environment**
   Create a `.env.local` file in the root directory:

```
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8000/ws
```

## Running the Application

1. **Start the Development Server**

```bash
npm run dev
# or
yarn dev
```

2. **Access the Application**
   Open your browser and navigate to:

```
http://localhost:3000
```

## Usage Instructions

1. **Start a Session**:

   - Ensure the backend API is running.
   - The status indicator at the top will show "Connected" when ready.

2. **Record Audio**:

   - Click "Start Recording" to begin capturing audio.
   - Speak in either Spanish or English.
   - Click "Stop Recording" to end the capture and process the translation.

3. **View Translations**:

   - Patient (Spanish) messages will appear in the left panel.
   - Doctor (English) messages will appear in the right panel.

4. **Playback Audio**:

   - Click on any message to hear it spoken using text-to-speech.

5. **Get a Summary**:
   - Click "Summarize conversation" to generate a concise summary of the medical conversation.

## Project Structure

```
sully-interpreter-frontend/
├── app/                  # Next.js application directory
│   ├── page.js           # Main application component
│   ├── layout.tsx        # Root layout component
│   ├── globals.css       # Global styles
│   └── utils/            # Utility functions
│       └── sound.js      # Audio processing utilities
├── public/               # Static files
├── .env.local            # Environment variables
└── README.md             # This file
```

## Audio Processing

The application handles audio processing in the following ways:

- Records audio at 24kHz sample rate with 16-bit depth for optimal compatibility with the backend API.
- Converts raw audio data to base64-encoded PCM format for transmission over WebSockets.
- Processes incoming audio deltas, combines them, and plays them back using the Web Audio API.

## Related Projects

- [Medical Interpreter API](https://github.com/yourusername/medical-interpreter-api) - The backend service that powers this application.

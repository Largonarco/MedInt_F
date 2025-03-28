"use client";

import { useRef, useState, useEffect } from "react";
import { SnackbarProvider, useSnackbar } from "notistack";
import { PiSpeakerHighFill } from "react-icons/pi";
import { Button, Listbox, ListboxItem, Textarea } from "@nextui-org/react";

export default function Home() {
	return (
		<SnackbarProvider>
			<AppContent />
		</SnackbarProvider>
	);
}

function AppContent() {
	const { enqueueSnackbar } = useSnackbar();
	const [summary, setSummary] = useState("");
	const [doctorMessages, setDoctorMessages] = useState([]);
	const [isRecordingDoctor, setIsRecordingDoctor] = useState(false);
	const [patientMessages, setPatientMessages] = useState([]);
	const [isRecordingPatient, setIsRecordingPatient] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [currentTranslation, setCurrentTranslation] = useState("");
	const [sessionId, setSessionId] = useState("");
	const [isConnected, setIsConnected] = useState(false);

	const websocketRef = useRef(null);
	const patientMediaRecorderRef = useRef(null);
	const doctorMediaRecorderRef = useRef(null);
	const patientAudioChunksRef = useRef([]);
	const doctorAudioChunksRef = useRef([]);
	const audioDeltasRef = useRef([]); // Accumulate audio deltas here

	useEffect(() => {
		connectWebSocket();

		return () => {
			if (websocketRef.current) {
				websocketRef.current.close();
			}
		};
	}, []);

	const connectWebSocket = () => {
		const ws = new WebSocket("ws://localhost:8000/ws");
		websocketRef.current = ws;

		ws.onopen = () => {
			console.log("WebSocket connection established");
			ws.send(JSON.stringify({ type: "connect" }));
		};

		ws.onclose = () => {
			console.log("WebSocket connection closed");
			setIsConnected(false);
			setTimeout(connectWebSocket, 3000);
		};

		ws.onerror = (error) => {
			console.error("WebSocket error:", error);
			enqueueSnackbar("Connection error. Trying to reconnect...", { variant: "error" });
		};

		ws.onmessage = (event) => {
			const message = JSON.parse(event.data);
			handleWebSocketMessage(message);
		};
	};

	const handleWebSocketMessage = (message) => {
		switch (message.type) {
			case "session":
				setSessionId(message.session_id);
				break;

			case "openai_connected":
				setIsConnected(true);
				enqueueSnackbar("Connected to service", { variant: "success" });
				break;

			case "text_response_delta":
				setCurrentTranslation((prev) => prev + message.delta);
				break;

			case "text_response_done":
				if (isProcessing) {
					if (isRecordingDoctor) {
						setDoctorMessages((prev) => [...prev, message.text]);
					} else {
						setPatientMessages((prev) => [...prev, message.text]);
					}
					setCurrentTranslation("");
					setIsProcessing(false);
				}
				break;

			case "audio_response_delta":
				audioDeltasRef.current.push(message.delta); // Accumulate audio deltas
				break;

			case "audio_response_done":
				const fullBase64Audio = audioDeltasRef.current.join(""); // Combine all deltas
				console.log(fullBase64Audio);

				const audioData = base64ToArrayBuffer(fullBase64Audio);
				playAudio(audioData);
				audioDeltasRef.current = []; // Reset deltas
				break;

			case "action_executed":
				enqueueSnackbar(`Action executed: ${message.action}`, { variant: "info" });
				break;

			case "error":
				enqueueSnackbar(`Error: ${message.message}`, { variant: "error" });
				setIsProcessing(false);
				break;
		}
	};

	const base64ToArrayBuffer = (base64) => {
		const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
		const binaryString = window.atob(base64Data);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		return bytes.buffer;
	};

	const playAudio = async (audioData) => {
		try {
			console.log("Starting audio playback for 16-bit PCM");

			// Step 1: Create an AudioContext with the correct sample rate
			const audioContext = new AudioContext({ sampleRate: 24000 }); // Match the 24kHz sample rate

			// Step 2: Convert ArrayBuffer (16-bit PCM) to 32-bit float PCM
			const rawData = new Int16Array(audioData); // 16-bit PCM is typically signed 16-bit integers
			const sampleCount = rawData.length;
			const float32Array = new Float32Array(sampleCount);

			// Step 3: Convert 16-bit PCM to 32-bit float
			for (let i = 0; i < sampleCount; i++) {
				// Normalize 16-bit signed integer (-32768 to 32767) to 32-bit float (-1.0 to 1.0)
				float32Array[i] = rawData[i] / 32768.0;
			}

			// Step 4: Create an AudioBuffer
			const audioBuffer = audioContext.createBuffer(1, float32Array.length, audioContext.sampleRate);
			audioBuffer.getChannelData(0).set(float32Array);

			// Step 5: Play the audio
			const source = audioContext.createBufferSource();
			source.buffer = audioBuffer;
			source.connect(audioContext.destination);
			source.onended = () => {
				console.log("Audio playback completed");
				source.disconnect();
			};
			source.start();

			console.log("Audio playback started successfully");
		} catch (error) {
			console.error("Error in audio playback:", error);
			enqueueSnackbar(`Audio playback error: ${error.message}`, { variant: "error" });
		}
	};

	const startPatientRecording = async () => {
		if (!isConnected) {
			enqueueSnackbar("Not connected to service", { variant: "warning" });
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream);

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					patientAudioChunksRef.current.push(event.data);
				}
			};

			mediaRecorder.onstop = () => {
				const audioBlob = new Blob(patientAudioChunksRef.current, { type: "audio/wav" });
				patientAudioChunksRef.current = [];
				sendAudioToAPI(audioBlob, "patient");
			};

			mediaRecorder.start();
			patientMediaRecorderRef.current = mediaRecorder;
			setIsRecordingPatient(true);
		} catch (error) {
			console.error("Error starting patient recording:", error);
			enqueueSnackbar("Could not access microphone", { variant: "error" });
		}
	};

	const stopPatientRecording = () => {
		if (patientMediaRecorderRef.current) {
			patientMediaRecorderRef.current.stop();
			setIsRecordingPatient(false);
			setIsProcessing(true);
		}
	};

	const startDoctorRecording = async () => {
		if (!isConnected) {
			enqueueSnackbar("Not connected to service", { variant: "warning" });
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream);

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					doctorAudioChunksRef.current.push(event.data);
				}
			};

			mediaRecorder.onstop = () => {
				const audioBlob = new Blob(doctorAudioChunksRef.current, { type: "audio/wav" });
				doctorAudioChunksRef.current = [];
				sendAudioToAPI(audioBlob, "doctor");
			};

			mediaRecorder.start();
			doctorMediaRecorderRef.current = mediaRecorder;
			setIsRecordingDoctor(true);
		} catch (error) {
			console.error("Error starting doctor recording:", error);
			enqueueSnackbar("Could not access microphone", { variant: "error" });
		}
	};

	const stopDoctorRecording = () => {
		if (doctorMediaRecorderRef.current) {
			doctorMediaRecorderRef.current.stop();
			setIsRecordingDoctor(false);
			setIsProcessing(true);
		}
	};

	const sendAudioToAPI = async (audioBlob, role) => {
		if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
			enqueueSnackbar("Not connected to service", { variant: "error" });
			return;
		}

		try {
			const reader = new FileReader();
			reader.readAsDataURL(audioBlob);
			reader.onloadend = () => {
				const base64data = reader.result.split(",")[1];
				websocketRef.current.send(
					JSON.stringify({
						type: role === "patient" ? "patient_speech" : "doctor_speech",
						audio: base64data,
					})
				);
			};
		} catch (error) {
			console.error(`Error sending ${role} audio:`, error);
			enqueueSnackbar(`Error sending audio: ${error.message}`, { variant: "error" });
		}
	};

	const handlePlayAudio = async (text) => {
		const utterance = new SpeechSynthesisUtterance(text);
		window.speechSynthesis.speak(utterance);
	};

	const handleGetSummary = async () => {
		if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
			enqueueSnackbar("Not connected to service", { variant: "error" });
			return;
		}

		try {
			websocketRef.current.send(JSON.stringify({ type: "get_summary" }));
			setIsProcessing(true);
		} catch (error) {
			console.error("Error getting summary:", error);
			enqueueSnackbar(`Error getting summary: ${error.message}`, { variant: "error" });
		}
	};

	return (
		<div>
			<div className="p-4 bg-blue-100 mb-4 rounded">
				<h1 className="text-3xl font-bold mb-2">Medical Interpreter</h1>
				<p>Status: {isConnected ? "Connected" : "Disconnecting..."}</p>
				{isProcessing && (
					<div className="mt-2 p-2 bg-gray-100 rounded">
						<p className="font-semibold">Processing:</p>
						<p>{currentTranslation || "..."}</p>
					</div>
				)}
			</div>

			<div className="w-full flex flex-col lg:flex-row">
				<div className="w-full lg:w-1/2 p-4 border-b lg:border-b-0 lg:border-r border-gray-300">
					<h2 className="text-2xl mb-4">Patient (Spanish)</h2>
					<Listbox aria-label="Patient Transcripts">
						{patientMessages.map((message, index) => (
							<ListboxItem key={index} variant="bordered" onPress={() => handlePlayAudio(message)}>
								<div className="flex items-center justify-between">
									<span>{message}</span>
									<PiSpeakerHighFill />
								</div>
							</ListboxItem>
						))}
					</Listbox>
					<Button
						onPress={isRecordingPatient ? stopPatientRecording : startPatientRecording}
						className="w-full mt-4"
						color={isRecordingPatient ? "danger" : "primary"}
						isDisabled={isProcessing || isRecordingDoctor}>
						{isRecordingPatient ? "Stop Patient Recording" : "Start Patient Recording"}
					</Button>
				</div>

				<div className="w-full lg:w-1/2 p-4">
					<h2 className="text-2xl mb-4">Doctor (English)</h2>
					<Listbox aria-label="Doctor Transcripts">
						{doctorMessages.map((message, index) => (
							<ListboxItem key={index} variant="bordered" onPress={() => handlePlayAudio(message)}>
								<div className="flex items-center justify-between">
									<span>{message}</span>
									<PiSpeakerHighFill />
								</div>
							</ListboxItem>
						))}
					</Listbox>
					<Button
						onPress={isRecordingDoctor ? stopDoctorRecording : startDoctorRecording}
						className="w-full mt-4"
						color={isRecordingDoctor ? "danger" : "primary"}
						isDisabled={isProcessing || isRecordingPatient}>
						{isRecordingDoctor ? "Stop Doctor Recording" : "Start Doctor Recording"}
					</Button>
				</div>
			</div>

			<Button
				className="m-4 mt-8"
				onPress={handleGetSummary}
				isDisabled={
					isProcessing ||
					isRecordingDoctor ||
					isRecordingPatient ||
					(doctorMessages.length === 0 && patientMessages.length === 0)
				}>
				Summarize conversation
			</Button>
			<Textarea className="m-4" placeholder="Summary of conversation" isReadOnly value={summary} minRows={4} />
		</div>
	);
}

"use client";

import { useSnackbar } from "notistack";
import { PiSpeakerHighFill } from "react-icons/pi";
import { useRef, useState, useEffect } from "react";
import { Button, Listbox, ListboxItem } from "@nextui-org/react";

export default function Home() {
	const { enqueueSnackbar } = useSnackbar();
	const [summary, setSummary] = useState("");
	const [isRecording, setIsRecording] = useState(false);
	const [isConnected, setIsConnected] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [doctorMessages, setDoctorMessages] = useState([]);
	const [patientMessages, setPatientMessages] = useState([]);
	const [currentTranslation, setCurrentTranslation] = useState("");

	const websocketRef = useRef(null);
	const audioDeltasRef = useRef([]);
	const audioChunksRef = useRef([]);
	const mediaRecorderRef = useRef(null);

	useEffect(() => {
		setupWebSocket();
		return () => {
			if (websocketRef.current) {
				websocketRef.current.close();
			}
		};
	}, []);

	const setupWebSocket = () => {
		const ws = new WebSocket("ws://localhost:8000/ws");
		websocketRef.current = ws;

		ws.onopen = () => {
			setIsConnected(true);
			ws.send(JSON.stringify({ type: "connect" }));
		};

		ws.onclose = () => {
			setIsConnected(false);
			setTimeout(connectWebSocket, 3000);
		};

		ws.onerror = () => {
			enqueueSnackbar("Connection error. Trying to reconnect...", { variant: "error" });
		};

		ws.onmessage = (event) => {
			const message = JSON.parse(event.data);
			handleWebSocketMessage(message);
		};
	};

	const handleWebSocketMessage = (message) => {
		switch (message.type) {
			case "openai_connected":
				setIsConnected(true);
				enqueueSnackbar("Connected to service", { variant: "success" });
				break;

			case "text_response_delta":
				setCurrentTranslation((prev) => prev + message.delta);
				break;

			case "text_response_done":
				setCurrentTranslation("");

				// Update appropriate message list based on who was speaking
				if (message?.role === "doctor") {
					setDoctorMessages((prev) => [...prev, message.text]);
				} else if (message?.role === "patient") {
					setPatientMessages((prev) => [...prev, message.text]);
				}

				setIsProcessing(false);
				break;

			case "audio_response_delta":
				audioDeltasRef.current.push(message.delta);
				break;

			case "audio_response_done":
				const fullBase64Audio = audioDeltasRef.current.join("");
				const audioData = base64ToArrayBuffer(fullBase64Audio);
				playAudioAuto(audioData);
				audioDeltasRef.current = [];
				break;

			case "action_executed":
				enqueueSnackbar(`Action executed: ${message.action}`, { variant: "info" });
				break;

			case "error":
				setIsRecording(false);
				setIsProcessing(false);

				enqueueSnackbar(`Error: ${message.message}`, { variant: "error" });
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

	// Convert raw audio data to 16-bit PCM at 24kHz and encode as base64
	const convertTo16BitPCM = async (audioBlob) => {
		const audioContext = new OfflineAudioContext(1, 48000, 48000); // Temporary context at 48kHz
		const arrayBuffer = await audioBlob.arrayBuffer();
		const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

		// Resample to 24kHz
		const offlineContext = new OfflineAudioContext(1, audioBuffer.length * (24000 / audioBuffer.sampleRate), 24000);
		const source = offlineContext.createBufferSource();
		source.buffer = audioBuffer;
		source.connect(offlineContext.destination);
		source.start(0);
		const resampledBuffer = await offlineContext.startRendering();

		// Convert to 16-bit PCM (mono)
		const float32Data = resampledBuffer.getChannelData(0); // Mono channel
		const pcm16Array = new Int16Array(float32Data.length);
		for (let i = 0; i < float32Data.length; i++) {
			const sample = Math.max(-1, Math.min(1, float32Data[i])); // Clamp to [-1, 1]
			pcm16Array[i] = sample < 0 ? sample * 32768 : sample * 32767; // Convert to 16-bit
		}

		// Convert to base64
		const uint8Array = new Uint8Array(pcm16Array.buffer);
		let binaryString = "";
		const chunkSize = 8000; // Process in chunks to avoid stack overflow
		for (let i = 0; i < uint8Array.length; i += chunkSize) {
			const chunk = uint8Array.subarray(i, i + chunkSize);
			binaryString += String.fromCharCode(...chunk);
		}
		return btoa(binaryString);
	};

	const startRecording = async () => {
		if (!isConnected) {
			enqueueSnackbar("Not connected to service", { variant: "warning" });
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					sampleSize: 16,
					channelCount: 1,
					sampleRate: 24000,
				},
			});

			const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data);
				}
			};
			mediaRecorder.onstop = async () => {
				const audioChunks = audioChunksRef.current;
				const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
				const base64Audio = await convertTo16BitPCM(audioBlob);
				audioChunks.current = [];

				sendAudioToAPI(base64Audio);
			};

			mediaRecorder.start(100);
			mediaRecorderRef.current = mediaRecorder;
			setIsRecording(true);
		} catch (e) {
			enqueueSnackbar("Could not access microphone", { variant: "error" });
		}
	};

	const stopRecording = () => {
		if (mediaRecorderRef.current) {
			mediaRecorderRef.current.stop();
			mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());

			setIsRecording(false);
		}
	};

	const playAudioAuto = async (audioData) => {
		try {
			const audioContext = new AudioContext({ sampleRate: 24000 }); // Match 24kHz sample rate

			const rawData = new Int16Array(audioData); // 16-bit PCM
			const float32Array = new Float32Array(rawData.length);

			for (let i = 0; i < rawData.length; i++) {
				float32Array[i] = rawData[i] / 32768.0; // Normalize to -1.0 to 1.0
			}

			const audioBuffer = audioContext.createBuffer(1, float32Array.length, audioContext.sampleRate);
			audioBuffer.getChannelData(0).set(float32Array);

			const source = audioContext.createBufferSource();
			source.buffer = audioBuffer;
			source.connect(audioContext.destination);
			source.onended = () => source.disconnect();
			source.start();
		} catch (error) {
			enqueueSnackbar(`Audio playback error: ${error.message}`, { variant: "error" });
		}
	};

	const sendAudioToAPI = (base64Audio) => {
		if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
			enqueueSnackbar("Not connected to service", { variant: "error" });
			return;
		}

		websocketRef.current.send(
			JSON.stringify({
				type: "begin_conversation",
				audio: base64Audio,
			})
		);
	};

	const handlePlayAudio = (text) => {
		const utterance = new SpeechSynthesisUtterance(text);
		window.speechSynthesis.speak(utterance);
	};

	// const handleGetSummary = async () => {
	// 	if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
	// 		enqueueSnackbar("Not connected to service", { variant: "error" });
	// 		return;
	// 	}

	// 	setIsProcessing(true);
	// 	websocketRef.current.send(JSON.stringify({ type: "get_summary" }));
	// };

	return (
		<div>
			<div className="p-4 bg-blue-100 mb-4 rounded">
				<p>Status: {isConnected ? "Connected" : "Disconnected"}</p>

				{currentTranslation && (
					<div className="mt-2 p-2 bg-gray-100 rounded">
						<p className="font-semibold">Translation in progress:</p>
						<p>{currentTranslation}</p>
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
				</div>
			</div>

			<Button
				className="w-full mt-4"
				color={isRecording ? "danger" : "primary"}
				isDisabled={!isConnected && !isRecording}
				onPress={isRecording ? stopRecording : startRecording}>
				{isRecording ? "Stop Recording" : "Start Recording"}
			</Button>
		</div>
	);
}

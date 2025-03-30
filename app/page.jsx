"use client";

import { useSnackbar } from "notistack";
import { PiSpeakerHighFill } from "react-icons/pi";
import { useRef, useState, useEffect } from "react";
import { Button, Listbox, ListboxItem, Textarea } from "@nextui-org/react";
import { convertBase64Encoded16BitPCMToRawAudio, convertRawAudioTo16BitPCMBase64 } from "./utils/sound";

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

			case "text_done":
				setSummary(message.text);
				break;

			case "audio_response_delta":
				audioDeltasRef.current.push(message.delta);
				break;

			case "audio_response_done":
				const fullBase64Audio = audioDeltasRef.current.join("");
				const audioData = convertBase64Encoded16BitPCMToRawAudio(fullBase64Audio);
				playAudio(audioData);

				audioDeltasRef.current = [];
				break;

			case "response_done":
				setCurrentTranslation("");

				// Update appropriate message list based on who was speaking
				if (message?.role === "doctor") {
					setDoctorMessages((prev) => [...prev, message.text]);
				} else if (message?.role === "patient") {
					setPatientMessages((prev) => [...prev, message.text]);
				}

				setIsProcessing(false);
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
				const base64Audio = await convertRawAudioTo16BitPCMBase64(audioBlob);
				audioChunks.current = [];

				websocketRef.current.send(
					JSON.stringify({
						type: "begin_conversation",
						audio: base64Audio,
					})
				);
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

	const playAudio = async (float32Array) => {
		try {
			const audioContext = new AudioContext({ sampleRate: 24000 }); // Match 24kHz sample rate

			const source = audioContext.createBufferSource();
			const audioBuffer = audioContext.createBuffer(1, float32Array.length, audioContext.sampleRate);
			audioBuffer.getChannelData(0).set(float32Array);

			source.buffer = audioBuffer;
			source.connect(audioContext.destination);
			source.onended = () => source.disconnect();

			source.start();
		} catch (error) {
			enqueueSnackbar(`Audio playback error: ${error.message}`, { variant: "error" });
		}
	};

	const handlePlayAudio = (text) => {
		const utterance = new SpeechSynthesisUtterance(text);
		window.speechSynthesis.speak(utterance);
	};

	const handleGetSummary = async () => {
		if (!isConnected) {
			enqueueSnackbar("Not connected to service", { variant: "error" });
			return;
		}

		setIsProcessing(true);
		websocketRef.current.send(JSON.stringify({ type: "get_summary" }));
	};

	return (
		<div>
			<div className="p-4 bg-gray-100 mb-8 rounded-md">
				<p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
			</div>

			<div className="w-full flex flex-col lg:flex-row mb-4">
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
				className="w-full mb-8"
				color={isRecording ? "danger" : "primary"}
				isDisabled={!isConnected && !isRecording}
				onPress={isRecording ? stopRecording : startRecording}>
				{isRecording ? "Stop Recording" : "Start Recording"}
			</Button>

			<Button className="mb-4 rounded-md" onPress={handleGetSummary}>
				Summarize conversation
			</Button>
			<Textarea placeholder="Conversational Summary" isReadOnly value={summary} />
		</div>
	);
}

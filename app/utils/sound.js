export const convertBase64Encoded16BitPCMToRawAudio = (base64Encoded16BitPCM) => {
	const base64Data = base64Encoded16BitPCM.includes(",") ? base64Encoded16BitPCM.split(",")[1] : base64Encoded16BitPCM;
	const binaryString = window.atob(base64Data);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}

	const rawData = new Int16Array(bytes.buffer);
	const float32Array = new Float32Array(rawData.length);
	for (let i = 0; i < rawData.length; i++) {
		float32Array[i] = rawData[i] / 32768.0;
	}

	return float32Array;
};

export const convertRawAudioTo16BitPCMBase64 = async (audioBlob) => {
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

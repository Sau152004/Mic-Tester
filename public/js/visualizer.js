class AudioVisualizer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.isActive = false;
        this.animationId = null;
        this.volumeMeterElement = document.getElementById('volumeMeter');
        this.volumeBarElement = document.getElementById('volumeBar');
        this.volumeValueElement = document.getElementById('volumeValue');
        this.visualizerElement = document.getElementById('visualizer');
        this.visualizerBars = [];
        this.barCount = 32;
        
        // Recording functionality
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordedBlob = null;
        this.recordingDuration = 0;
        this.recordingStartTime = null;
        
        this.initializeVisualizer();
    }

    initializeVisualizer() {
        // Create visualizer bars
        const visualizerContainer = this.visualizerElement.querySelector('div');
        visualizerContainer.innerHTML = ''; // Clear existing content
        
        for (let i = 0; i < this.barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'visualizer-bar w-3 bg-blue-400 rounded-t';
            bar.style.height = '4px';
            bar.style.minHeight = '4px';
            visualizerContainer.appendChild(bar);
            this.visualizerBars.push(bar);
        }
    }

    async initialize(stream) {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create analyser node
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            
            // Create source from stream
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);
            
            // Create data array for frequency data
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            // Get microphone information
            await this.getMicrophoneInfo(stream);
            
            // Initialize recording
            this.initializeRecording(stream);
            
            // Show visualizer elements
            this.volumeMeterElement.classList.remove('hidden');
            this.visualizerElement.classList.remove('hidden');
            
            this.isActive = true;
            this.animate();
            
            return true;
        } catch (error) {
            console.error('Error initializing audio visualizer:', error);
            return false;
        }
    }

    async getMicrophoneInfo(stream) {
        try {
            // Get audio tracks
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) return;
            
            const track = audioTracks[0];
            const settings = track.getSettings();
            const capabilities = track.getCapabilities ? track.getCapabilities() : {};
            
            // Get device information
            let deviceLabel = 'Default Microphone';
            let deviceId = 'default';
            
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const micDevices = devices.filter(device => device.kind === 'audioinput');
                
                // Find current device
                const currentDevice = micDevices.find(device => device.deviceId === settings.deviceId);
                if (currentDevice && currentDevice.label) {
                    deviceLabel = currentDevice.label;
                    deviceId = currentDevice.deviceId;
                }
            } catch (error) {
                console.log('Could not get device info:', error);
            }
            
            // Calculate more accurate latency
            let estimatedLatency = '0.01';
            if (this.audioContext.baseLatency) {
                estimatedLatency = (this.audioContext.baseLatency * 1000).toFixed(2);
            } else if (this.audioContext.outputLatency) {
                estimatedLatency = (this.audioContext.outputLatency * 1000).toFixed(2);
            }
            
            // Analyze audio properties with comprehensive details
            const micInfo = {
                name: deviceLabel,
                automaticGainControl: settings.autoGainControl !== false,
                channels: settings.channelCount || 1,
                deviceId: deviceId === 'default' ? 'default' : `${deviceId.substring(0, 8)}...`,
                echoCancellation: settings.echoCancellation !== false,
                estimatedLatency: estimatedLatency,
                noiseSuppression: settings.noiseSuppression !== false,
                sampleRate: settings.sampleRate || this.audioContext.sampleRate || 48000,
                sampleSize: this.getSampleSize(settings, capabilities)
            };
            
            // Store microphone information globally
            window.microphoneInfo = micInfo;
            
            // Display microphone information table
            this.displayMicrophoneInfo(micInfo);
            
        } catch (error) {
            console.error('Error getting microphone info:', error);
            // Fallback microphone info
            window.microphoneInfo = {
                name: 'Default Microphone',
                automaticGainControl: true,
                channels: 1,
                deviceId: 'default',
                echoCancellation: true,
                estimatedLatency: '0.01',
                noiseSuppression: true,
                sampleRate: 48000,
                sampleSize: 16
            };
        }
    }

    getSampleSize(settings, capabilities) {
        // Try to determine sample size from available information
        if (settings.sampleSize) return settings.sampleSize;
        if (capabilities.sampleSize && capabilities.sampleSize.length > 0) {
            return capabilities.sampleSize[0];
        }
        
        // Default based on sample rate (common standards)
        const sampleRate = settings.sampleRate || 48000;
        if (sampleRate >= 44100) return 16;
        return 8;
    }

    displayMicrophoneInfo(micInfo) {
        const infoSection = document.getElementById('microphoneInfo');
        if (!infoSection) return;
        
        // Show the microphone info section
        infoSection.classList.remove('hidden');
        
        // Update the information table with exact structure from reference
        const tableBody = infoSection.querySelector('tbody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr class="border-b border-gray-600">
                    <td class="py-3 px-4 text-gray-300 font-medium">Microphone Name</td>
                    <td class="py-3 px-4 text-white">${micInfo.name}</td>
                </tr>
                <tr class="border-b border-gray-600">
                    <td class="py-3 px-4 text-gray-300 font-medium">Automatic Gain Control</td>
                    <td class="py-3 px-4 text-white">${micInfo.automaticGainControl ? 'true' : 'false'}</td>
                </tr>
                <tr class="border-b border-gray-600">
                    <td class="py-3 px-4 text-gray-300 font-medium">Number of Audio Channels</td>
                    <td class="py-3 px-4 text-white">${micInfo.channels}</td>
                </tr>
                <tr class="border-b border-gray-600">
                    <td class="py-3 px-4 text-gray-300 font-medium">Device ID</td>
                    <td class="py-3 px-4 text-white">${micInfo.deviceId}</td>
                </tr>
                <tr class="border-b border-gray-600">
                    <td class="py-3 px-4 text-gray-300 font-medium">Echo Cancellation</td>
                    <td class="py-3 px-4 text-white">${micInfo.echoCancellation ? 'true' : 'false'}</td>
                </tr>
                <tr class="border-b border-gray-600">
                    <td class="py-3 px-4 text-gray-300 font-medium">Estimated Latency</td>
                    <td class="py-3 px-4 text-white">${micInfo.estimatedLatency}</td>
                </tr>
                <tr class="border-b border-gray-600">
                    <td class="py-3 px-4 text-gray-300 font-medium">Noise Suppression</td>
                    <td class="py-3 px-4 text-white">${micInfo.noiseSuppression ? 'true' : 'false'}</td>
                </tr>
                <tr class="border-b border-gray-600">
                    <td class="py-3 px-4 text-gray-300 font-medium">Sample Rate</td>
                    <td class="py-3 px-4 text-white">${micInfo.sampleRate}</td>
                </tr>
                <tr>
                    <td class="py-3 px-4 text-gray-300 font-medium">Sample Size</td>
                    <td class="py-3 px-4 text-white">${micInfo.sampleSize}</td>
                </tr>
            `;
        }
    }

    initializeRecording(stream) {
        try {
            // Reset previous recording data
            this.recordedChunks = [];
            this.recordedBlob = null;
            this.recordingDuration = 0;
            
            // Create MediaRecorder
            const options = { mimeType: 'audio/webm;codecs=opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'audio/webm';
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options.mimeType = 'audio/mp4';
                    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                        options.mimeType = '';
                    }
                }
            }
            
            this.mediaRecorder = new MediaRecorder(stream, options);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.recordedBlob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType });
                this.recordingDuration = Date.now() - this.recordingStartTime;
                this.showRecordingPlayer();
            };
            
            // Start recording
            this.recordingStartTime = Date.now();
            this.mediaRecorder.start(100); // Collect data every 100ms
            
        } catch (error) {
            console.error('Error initializing recording:', error);
        }
    }

    animate() {
        if (!this.isActive || !this.analyser) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // Get frequency data
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate volume level
        const volume = this.calculateVolume();
        this.updateVolumeMeter(volume);
        
        // Update visualizer bars
        this.updateVisualizerBars();
    }

    calculateVolume() {
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const average = sum / this.dataArray.length;
        return Math.min(100, Math.max(0, (average / 255) * 100));
    }

    updateVolumeMeter(volume) {
        const percentage = Math.round(volume);
        this.volumeBarElement.style.width = `${percentage}%`;
        this.volumeValueElement.textContent = `${percentage}%`;
        
        // Change color based on volume level
        if (percentage < 30) {
            this.volumeBarElement.className = 'h-full bg-green-400 transition-all duration-100';
        } else if (percentage < 70) {
            this.volumeBarElement.className = 'h-full bg-yellow-400 transition-all duration-100';
        } else {
            this.volumeBarElement.className = 'h-full bg-red-500 transition-all duration-100';
        }
    }

    updateVisualizerBars() {
        const step = Math.floor(this.dataArray.length / this.barCount);
        
        for (let i = 0; i < this.barCount; i++) {
            const dataIndex = i * step;
            const value = this.dataArray[dataIndex];
            const height = Math.max(4, (value / 255) * 120); // 4px minimum, 120px maximum
            
            this.visualizerBars[i].style.height = `${height}px`;
            
            // Color based on frequency range
            if (i < this.barCount * 0.3) {
                // Low frequencies - blue
                this.visualizerBars[i].className = 'visualizer-bar w-3 bg-blue-500 rounded-t transition-all duration-100';
            } else if (i < this.barCount * 0.7) {
                // Mid frequencies - green
                this.visualizerBars[i].className = 'visualizer-bar w-3 bg-green-500 rounded-t transition-all duration-100';
            } else {
                // High frequencies - yellow/orange
                this.visualizerBars[i].className = 'visualizer-bar w-3 bg-yellow-500 rounded-t transition-all duration-100';
            }
        }
    }

    showRecordingPlayer() {
        if (!this.recordedBlob) return;
        
        // Create audio URL
        const audioURL = URL.createObjectURL(this.recordedBlob);
        
        // Show recording player section
        const recordingSection = document.getElementById('recordingPlayer');
        if (recordingSection) {
            recordingSection.classList.remove('hidden');
            
            // Update audio player
            const audioPlayer = document.getElementById('recordedAudio');
            if (audioPlayer) {
                audioPlayer.src = audioURL;
            }
            
            // Update duration display
            const durationDisplay = document.getElementById('recordingDuration');
            if (durationDisplay) {
                const seconds = Math.round(this.recordingDuration / 1000);
                durationDisplay.textContent = this.formatTime(seconds);
            }
            
            // Update download link
            const downloadLink = document.getElementById('downloadRecording');
            if (downloadLink) {
                downloadLink.href = audioURL;
                downloadLink.download = `microphone-test-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
            }
            
            // Store test results for certificate generation
            window.micTestResults = {
                testDate: new Date(),
                duration: this.recordingDuration,
                audioURL: audioURL,
                userAgent: navigator.userAgent,
                microphoneLabel: this.getMicrophoneLabel(),
                testStatus: 'PASSED'
            };
        }
    }

    getMicrophoneLabel() {
        // Try to get the selected microphone label
        const micSelect = document.getElementById('micSelect');
        if (micSelect && micSelect.value) {
            return micSelect.options[micSelect.selectedIndex].text;
        }
        return 'Default Microphone';
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    stop() {
        this.isActive = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Stop recording
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        // Hide visualizer elements
        this.volumeMeterElement.classList.add('hidden');
        this.visualizerElement.classList.add('hidden');
        
        // Reset bars
        this.visualizerBars.forEach(bar => {
            bar.style.height = '4px';
        });
        
        // Reset volume meter
        this.volumeBarElement.style.width = '0%';
        this.volumeValueElement.textContent = '0%';
    }

    destroy() {
        this.stop();
        
        // Hide recording player
        const recordingSection = document.getElementById('recordingPlayer');
        if (recordingSection) {
            recordingSection.classList.add('hidden');
        }
        
        // Hide microphone info
        const infoSection = document.getElementById('microphoneInfo');
        if (infoSection) {
            infoSection.classList.add('hidden');
        }
        
        // Clean up recording data
        this.recordedChunks = [];
        this.recordedBlob = null;
        this.mediaRecorder = null;
        
        this.analyser = null;
        this.dataArray = null;
    }
}
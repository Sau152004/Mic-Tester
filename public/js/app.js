class MicrophoneTest {
    constructor() {
        this.audioContext = null;
        this.mediaStream = null;
        this.analyser = null;
        this.microphone = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordedBlob = null;
        this.isActive = false;
        this.devices = [];
        this.selectedDeviceId = null;
        this.microphoneInfo = {};
        this.testStartTime = null;
        this.testDuration = 0;
        
        this.initializeElements();
        this.setupEventListeners();
        this.checkBrowserSupport();
        this.loadAvailableDevices();
    }

    initializeElements() {
        this.startBtn = document.getElementById('startTest');
        this.stopBtn = document.getElementById('stopTest');
        this.deviceSelect = document.getElementById('micSelect');
        this.deviceSelector = document.getElementById('deviceSelector');
        this.statusDisplay = document.getElementById('statusDisplay');
        this.errorDisplay = document.getElementById('errorDisplay');
        this.volumeMeter = document.getElementById('volumeMeter');
        this.visualizer = document.getElementById('visualizer');
        this.volumeValue = document.getElementById('volumeValue');
        this.volumeBar = document.getElementById('volumeBar');
        this.recordingPlayer = document.getElementById('recordingPlayer');
        this.recordedAudio = document.getElementById('recordedAudio');
        this.downloadRecording = document.getElementById('downloadRecording');
        this.recordingDuration = document.getElementById('recordingDuration');
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startTest());
        this.stopBtn.addEventListener('click', () => this.stopTest());
        this.deviceSelect.addEventListener('change', (e) => {
            this.selectedDeviceId = e.target.value;
        });
    }

    checkBrowserSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showError('Your browser does not support microphone access. Please use a modern browser like Chrome, Firefox, or Safari.');
            this.startBtn.disabled = true;
            return false;
        }

        if (!window.AudioContext && !window.webkitAudioContext) {
            this.showError('Your browser does not support Web Audio API. Please use a modern browser.');
            this.startBtn.disabled = true;
            return false;
        }

        if (!window.MediaRecorder) {
            this.showError('Your browser does not support audio recording. Please use a modern browser.');
            this.startBtn.disabled = true;
            return false;
        }

        return true;
    }

    async loadAvailableDevices() {
        try {
            // Request permission first to get device labels
            const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            tempStream.getTracks().forEach(track => track.stop());
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.devices = devices.filter(device => device.kind === 'audioinput');
            
            this.deviceSelect.innerHTML = '';
            
            if (this.devices.length === 0) {
                this.deviceSelect.innerHTML = '<option>No microphones found</option>';
                this.deviceSelect.disabled = true;
                this.startBtn.disabled = true;
                this.showError('No microphones found. Please connect a microphone and refresh the page.');
                return;
            }

            // Show device selector if multiple devices
            if (this.devices.length > 1) {
                this.deviceSelector.style.display = 'block';
            }

            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Default microphone';
            this.deviceSelect.appendChild(defaultOption);

            // Add available devices
            this.devices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Microphone ${index + 1}`;
                this.deviceSelect.appendChild(option);
            });

            this.deviceSelect.disabled = false;
            this.updateStatus('Click "Start Microphone Test" to begin');
        } catch (error) {
            console.error('Error loading devices:', error);
            this.showError('Unable to load microphone devices. Please check your browser permissions.');
        }
    }

    async startTest() {
        try {
            this.hideError();
            this.updateStatus('Requesting microphone access...');
            this.testStartTime = Date.now();
            this.recordedChunks = [];
            
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000,
                    sampleSize: 16,
                    channelCount: 1,
                    ...(this.selectedDeviceId && { deviceId: { exact: this.selectedDeviceId } })
                }
            };

            this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Capture microphone information
            await this.captureMicrophoneInfo();
            
            // Initialize audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            // Configure analyser
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.3;
            this.microphone.connect(this.analyser);
            
            // Start recording
            this.startRecording();
            
            // Start visualization
            this.isActive = true;
            this.showVisualizer();
            this.updateStatus('Microphone is active - speak into your microphone');
            
            // Update UI
            this.startBtn.classList.add('hidden');
            this.stopBtn.classList.remove('hidden');
            this.deviceSelect.disabled = true;
            
            // Start audio processing
            this.processAudio();
            
        } catch (error) {
            console.error('Error starting microphone test:', error);
            this.handleMicrophoneError(error);
        }
    }

    startRecording() {
        try {
            // Create MediaRecorder
            const options = {
                mimeType: 'audio/webm;codecs=opus',
                audioBitsPerSecond: 128000
            };

            // Fallback for browsers that don't support webm
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'audio/mp4';
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options.mimeType = 'audio/wav';
                }
            }

            this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.createAudioBlob();
            };

            // Start recording
            this.mediaRecorder.start(1000); // Collect data every second
            
        } catch (error) {
            console.error('Error starting recording:', error);
            // Continue without recording if MediaRecorder fails
        }
    }

    createAudioBlob() {
        if (this.recordedChunks.length > 0) {
            this.recordedBlob = new Blob(this.recordedChunks, { 
                type: this.mediaRecorder.mimeType || 'audio/webm' 
            });
            
            // Create object URL for playback
            const audioUrl = URL.createObjectURL(this.recordedBlob);
            this.recordedAudio.src = audioUrl;
            
            // Set up download link
            this.downloadRecording.href = audioUrl;
            this.downloadRecording.download = `microphone-test-${Date.now()}.${this.getFileExtension()}`;
        }
    }

    getFileExtension() {
        if (this.mediaRecorder && this.mediaRecorder.mimeType) {
            if (this.mediaRecorder.mimeType.includes('webm')) return 'webm';
            if (this.mediaRecorder.mimeType.includes('mp4')) return 'm4a';
            if (this.mediaRecorder.mimeType.includes('wav')) return 'wav';
        }
        return 'webm';
    }

    async captureMicrophoneInfo() {
        const track = this.mediaStream.getAudioTracks()[0];
        const settings = track.getSettings();
        const capabilities = track.getCapabilities();
        
        // Get selected device info
        const selectedDevice = this.devices.find(device => 
            device.deviceId === this.selectedDeviceId || 
            (!this.selectedDeviceId && device.deviceId === 'default')
        ) || this.devices[0];

        this.microphoneInfo = {
            deviceName: selectedDevice?.label || 'Default Microphone',
            deviceId: selectedDevice?.deviceId || 'default',
            sampleRate: settings.sampleRate || this.audioContext.sampleRate,
            sampleSize: settings.sampleSize || 16,
            channelCount: settings.channelCount || 1,
            echoCancellation: settings.echoCancellation || false,
            noiseSuppression: settings.noiseSuppression || false,
            autoGainControl: settings.autoGainControl || false,
            latency: settings.latency ? (settings.latency * 1000).toFixed(2) : 'Unknown',
            groupId: selectedDevice?.groupId || 'Unknown'
        };

        // Display microphone information
        this.displayMicrophoneInfo();
    }

    displayMicrophoneInfo() {
        // Create microphone info section if it doesn't exist
        let infoSection = document.getElementById('microphoneInfo');
        if (!infoSection) {
            infoSection = this.createMicrophoneInfoSection();
        }

        // Update the info table
        const tableBody = infoSection.querySelector('tbody');
        tableBody.innerHTML = `
            <tr class="border-t">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">Device Name</td>
                <td class="px-4 py-3 text-sm text-gray-600">${this.microphoneInfo.deviceName}</td>
            </tr>
            <tr class="border-t bg-gray-50">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">Device ID</td>
                <td class="px-4 py-3 text-sm text-gray-600 font-mono text-xs">${this.microphoneInfo.deviceId.substring(0, 20)}...</td>
            </tr>
            <tr class="border-t">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">Sample Rate</td>
                <td class="px-4 py-3 text-sm text-gray-600">${this.microphoneInfo.sampleRate} Hz</td>
            </tr>
            <tr class="border-t bg-gray-50">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">Sample Size</td>
                <td class="px-4 py-3 text-sm text-gray-600">${this.microphoneInfo.sampleSize} bit</td>
            </tr>
            <tr class="border-t">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">Audio Channels</td>
                <td class="px-4 py-3 text-sm text-gray-600">${this.microphoneInfo.channelCount}</td>
            </tr>
            <tr class="border-t bg-gray-50">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">Echo Cancellation</td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        this.microphoneInfo.echoCancellation ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }">
                        ${this.microphoneInfo.echoCancellation ? 'True' : 'False'}
                    </span>
                </td>
            </tr>
            <tr class="border-t">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">Noise Suppression</td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        this.microphoneInfo.noiseSuppression ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }">
                        ${this.microphoneInfo.noiseSuppression ? 'True' : 'False'}
                    </span>
                </td>
            </tr>
            <tr class="border-t bg-gray-50">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">Auto Gain Control</td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        this.microphoneInfo.autoGainControl ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }">
                        ${this.microphoneInfo.autoGainControl ? 'True' : 'False'}
                    </span>
                </td>
            </tr>
            <tr class="border-t">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">Estimated Latency</td>
                <td class="px-4 py-3 text-sm text-gray-600">${this.microphoneInfo.latency} ms</td>
            </tr>
        `;

        infoSection.classList.remove('hidden');
    }

    createMicrophoneInfoSection() {
        const infoSection = document.createElement('div');
        infoSection.id = 'microphoneInfo';
        infoSection.className = 'hidden mt-6 mic-info-table';
        infoSection.innerHTML = `
            <h3 class="text-lg font-medium text-gray-900 mb-4">Microphone Information</h3>
            <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table class="min-w-full divide-y divide-gray-300">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <!-- Table content will be populated by displayMicrophoneInfo() -->
                    </tbody>
                </table>
            </div>
        `;

        // Insert after the volume meter
        const volumeMeter = document.getElementById('volumeMeter');
        volumeMeter.parentNode.insertBefore(infoSection, volumeMeter.nextSibling);
        
        return infoSection;
    }

    stopTest() {
        this.isActive = false;
        this.testDuration = Date.now() - this.testStartTime;
        
        // Stop recording
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        
        // Stop media stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        // Show completion screen with recording and microphone info
        this.showTestCompletion();
        
        // Reset UI
        this.startBtn.classList.remove('hidden');
        this.stopBtn.classList.add('hidden');
        this.deviceSelect.disabled = false;
        this.hideVisualizer();
        
        // Clear references
        this.analyser = null;
        this.microphone = null;
        
        // Reset volume display
        this.volumeValue.textContent = '0%';
        this.volumeBar.style.width = '0%';
    }

    showTestCompletion() {
        // Store test results globally for certificate generation
        window.micTestResults = {
            testDate: new Date(),
            duration: this.testDuration,
            microphoneLabel: this.microphoneInfo.deviceName,
            microphoneInfo: this.microphoneInfo,
            status: 'PASSED',
            hasRecording: this.recordedBlob !== null
        };

        // Show recording player section
        this.recordingPlayer.classList.remove('hidden');
        
        // Update duration display
        if (this.recordingDuration) {
            this.recordingDuration.textContent = (this.testDuration / 1000).toFixed(1) + 's';
        }

        // Show microphone info in completion screen
        const infoSection = document.getElementById('microphoneInfo');
        if (infoSection) {
            // Clone the microphone info to show in completion screen
            this.showMicrophoneInfoInCompletion();
        }

        // Hide other sections
        this.volumeMeter.classList.add('hidden');
        this.visualizer.classList.add('hidden');
        
        // Update status
        this.updateStatus('Test completed successfully!');
    }

    showMicrophoneInfoInCompletion() {
        // Create completion microphone info section
        let completionInfoSection = document.getElementById('completionMicrophoneInfo');
        if (!completionInfoSection) {
            completionInfoSection = document.createElement('div');
            completionInfoSection.id = 'completionMicrophoneInfo';
            completionInfoSection.className = 'mt-6 mic-info-table';
            
            // Insert before the action buttons in the recording player section
            const actionButtons = this.recordingPlayer.querySelector('.flex.flex-col.sm\\:flex-row');
            actionButtons.parentNode.insertBefore(completionInfoSection, actionButtons);
        }

        completionInfoSection.innerHTML = `
            <h4 class="text-lg font-medium text-green-800 mb-4">📊 Microphone Specifications</h4>
            <div class="bg-white rounded-lg shadow overflow-hidden mb-4">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr>
                            <td class="px-4 py-3 text-sm font-medium text-gray-900">Device Name</td>
                            <td class="px-4 py-3 text-sm text-gray-600">${this.microphoneInfo.deviceName}</td>
                        </tr>
                        <tr class="bg-gray-50">
                            <td class="px-4 py-3 text-sm font-medium text-gray-900">Sample Rate</td>
                            <td class="px-4 py-3 text-sm text-gray-600">${this.microphoneInfo.sampleRate} Hz</td>
                        </tr>
                        <tr>
                            <td class="px-4 py-3 text-sm font-medium text-gray-900">Sample Size</td>
                            <td class="px-4 py-3 text-sm text-gray-600">${this.microphoneInfo.sampleSize} bit</td>
                        </tr>
                        <tr class="bg-gray-50">
                            <td class="px-4 py-3 text-sm font-medium text-gray-900">Audio Channels</td>
                            <td class="px-4 py-3 text-sm text-gray-600">${this.microphoneInfo.channelCount}</td>
                        </tr>
                        <tr>
                            <td class="px-4 py-3 text-sm font-medium text-gray-900">Echo Cancellation</td>
                            <td class="px-4 py-3 text-sm text-gray-600">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    this.microphoneInfo.echoCancellation ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }">
                                    ${this.microphoneInfo.echoCancellation ? 'True' : 'False'}
                                </span>
                            </td>
                        </tr>
                        <tr class="bg-gray-50">
                            <td class="px-4 py-3 text-sm font-medium text-gray-900">Noise Suppression</td>
                            <td class="px-4 py-3 text-sm text-gray-600">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    this.microphoneInfo.noiseSuppression ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }">
                                    ${this.microphoneInfo.noiseSuppression ? 'True' : 'False'}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td class="px-4 py-3 text-sm font-medium text-gray-900">Auto Gain Control</td>
                            <td class="px-4 py-3 text-sm text-gray-600">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    this.microphoneInfo.autoGainControl ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }">
                                    ${this.microphoneInfo.autoGainControl ? 'True' : 'False'}
                                </span>
                            </td>
                        </tr>
                        <tr class="bg-gray-50">
                            <td class="px-4 py-3 text-sm font-medium text-gray-900">Estimated Latency</td>
                            <td class="px-4 py-3 text-sm text-gray-600">${this.microphoneInfo.latency} ms</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    processAudio() {
        if (!this.isActive || !this.analyser) return;
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate volume level
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / bufferLength;
        const volume = Math.round((average / 255) * 100);
        
        // Update volume display
        this.volumeValue.textContent = `${volume}%`;
        this.volumeBar.style.width = `${volume}%`;
        
        // Update visualizer bars
        this.updateVisualizer(dataArray);
        
        // Continue processing
        requestAnimationFrame(() => this.processAudio());
    }

    updateVisualizer(dataArray) {
        const visualizerContainer = this.visualizer.querySelector('.flex');
        
        // Create bars if they don't exist
        if (visualizerContainer.children.length === 0) {
            for (let i = 0; i < 32; i++) {
                const bar = document.createElement('div');
                bar.className = 'bg-blue-500 visualizer-bar rounded-t';
                bar.style.width = '4px';
                bar.style.minHeight = '2px';
                visualizerContainer.appendChild(bar);
            }
        }
        
        // Update bar heights
        const bars = visualizerContainer.children;
        const step = Math.floor(dataArray.length / bars.length);
        
        for (let i = 0; i < bars.length; i++) {
            const value = dataArray[i * step] || 0;
            const height = Math.max(2, (value / 255) * 120);
            bars[i].style.height = height + 'px';
        }
    }

    showVisualizer() {
        this.volumeMeter.classList.remove('hidden');
        this.visualizer.classList.remove('hidden');
    }

    hideVisualizer() {
        this.volumeMeter.classList.add('hidden');
        this.visualizer.classList.add('hidden');
        
        // Hide microphone info during test
        const infoSection = document.getElementById('microphoneInfo');
        if (infoSection) {
            infoSection.classList.add('hidden');
        }
    }

    handleMicrophoneError(error) {
        let errorMessage = 'Unable to access microphone. ';
        
        switch (error.name) {
            case 'NotAllowedError':
                errorMessage += 'Permission denied. Please allow microphone access and try again.';
                break;
            case 'NotFoundError':
                errorMessage += 'No microphone found. Please connect a microphone and refresh the page.';
                break;
            case 'NotReadableError':
                errorMessage += 'Microphone is already in use by another application.';
                break;
            case 'OverconstrainedError':
                errorMessage += 'Selected microphone device is not available.';
                break;
            case 'AbortError':
                errorMessage += 'Request was aborted.';
                break;
            case 'SecurityError':
                errorMessage += 'Security error. Please use HTTPS or localhost.';
                break;
            default:
                errorMessage += `Error: ${error.message}`;
        }
        
        this.showError(errorMessage);
        
        // Reset UI on error
        this.startBtn.classList.remove('hidden');
        this.stopBtn.classList.add('hidden');
        this.deviceSelect.disabled = false;
        this.hideVisualizer();
    }

    updateStatus(message) {
        this.statusDisplay.innerHTML = `<p class="text-gray-600">${message}</p>`;
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        this.errorDisplay.classList.remove('hidden');
    }

    hideError() {
        this.errorDisplay.classList.add('hidden');
    }

    startNewTest() {
        // Reset everything for a new test
        this.recordingPlayer.classList.add('hidden');
        this.hideError();
        this.updateStatus('Click "Start Microphone Test" to begin');
        
        // Hide microphone info sections
        const infoSection = document.getElementById('microphoneInfo');
        if (infoSection) {
            infoSection.classList.add('hidden');
        }
        
        const completionInfoSection = document.getElementById('completionMicrophoneInfo');
        if (completionInfoSection) {
            completionInfoSection.remove();
        }

        // Clear recorded data
        this.recordedChunks = [];
        this.recordedBlob = null;
        if (this.recordedAudio.src) {
            URL.revokeObjectURL(this.recordedAudio.src);
            this.recordedAudio.src = '';
        }
    }

    // Utility methods
    isMicrophoneActive() {
        return this.isActive && this.mediaStream && this.audioContext;
    }

    getCurrentAudioLevel() {
        if (!this.analyser) return 0;
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / bufferLength;
        return Math.round((average / 255) * 100);
    }

    cleanup() {
        if (this.isActive) {
            this.stopTest();
        }
        
        // Clean up blob URLs
        if (this.recordedAudio.src) {
            URL.revokeObjectURL(this.recordedAudio.src);
        }
        if (this.downloadRecording.href) {
            URL.revokeObjectURL(this.downloadRecording.href);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.microphoneTestInstance = new MicrophoneTest();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (window.microphoneTestInstance) {
            window.microphoneTestInstance.cleanup();
        }
    });
});
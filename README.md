# 🎤 Mic Tester

A simple, web-based microphone testing tool that allows users to test their microphone functionality, monitor audio levels, and ensure their mic is working properly before important calls, recordings, or streaming sessions.

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://mic-tester.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/Sau152004/Mic-Tester.git)

## ✨ Features

- **Real-time Audio Level Monitoring** - Visual feedback of microphone input levels
- **Browser Compatibility** - Works across all modern web browsers
- **No Installation Required** - Direct web-based testing
- **Privacy Focused** - No audio data is stored or transmitted
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Instant Feedback** - Immediate visual and audio confirmation
- **Multiple Microphone Support** - Test different audio input devices

## 🚀 Live Demo

Try the Mic Tester now: [https://mic-tester.onrender.com](https://mic-tester.onrender.com)

## 🛠️ How to Use

1. **Visit the website** - Navigate to the live demo link
2. **Grant permissions** - Allow microphone access when prompted by your browser
3. **Start testing** - Speak into your microphone
4. **Monitor levels** - Watch the visual indicators respond to your voice
5. **Adjust settings** - Test different microphones if you have multiple devices

## 🔧 Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Audio API**: Web Audio API / MediaDevices API
- **Deployment**: Render.com
- **Version Control**: Git/GitHub

## 📱 Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full Support |
| Firefox | ✅ Full Support |
| Safari | ✅ Full Support |
| Edge | ✅ Full Support |
| Opera | ✅ Full Support |

*Note: HTTPS is required for microphone access in most browsers*

## 🏃‍♂️ Quick Start

### Option 1: Use Online (Recommended)
Simply visit [https://mic-tester.onrender.com](https://mic-tester.onrender.com)

### Option 2: Run Locally
```bash
# Clone the repository
git clone https://github.com/Sau152004/Mic-Tester.git

# Navigate to the project directory
cd Mic-Tester

# Open with a local server (required for microphone access)
# Option A: Using Python
python -m http.server 8000

# Option B: Using Node.js
npx serve .

# Option C: Using Live Server (VS Code extension)
# Right-click on index.html and select "Open with Live Server"

# Open your browser and navigate to:
# http://localhost:8000
```

## 🔒 Privacy & Security

- **No Data Collection**: Your audio is processed locally in your browser
- **No Recording**: Audio is not saved or transmitted anywhere
- **HTTPS Secure**: All connections are encrypted
- **Browser Permissions**: You maintain full control over microphone access

## 📁 Project Structure

```
Mic-Tester/
├── index.html          # Main HTML file
├── style.css           # Stylesheet
├── script.js           # JavaScript functionality
├── assets/             # Images and icons
├── README.md           # Project documentation
└── favicon.ico         # Website favicon
```

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Ideas for Contributions
- Add audio quality analysis
- Implement noise level detection
- Add microphone device selection
- Create audio recording functionality
- Improve responsive design
- Add dark/light theme toggle

## 🐛 Issues & Support

If you encounter any issues or have suggestions:

1. Check the [Issues](https://github.com/Sau152004/Mic-Tester/issues) page
2. Create a new issue if your problem isn't already reported
3. Provide as much detail as possible including:
   - Browser and version
   - Operating system
   - Steps to reproduce the issue
   - Expected vs actual behavior

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Show Your Support

If this project helped you, please consider:
- ⭐ Starring the repository
- 🍴 Forking the project
- 📢 Sharing with others who might find it useful

## 👨‍💻 Author

**Saurabh Yadav**
- GitHub: [@Sau152004](https://github.com/Sau152004)
- Project: [Mic Tester](https://github.com/Sau152004/Mic-Tester.git)

## 🚀 Deployment

This project is deployed on [Render.com](https://render.com) for free hosting. To deploy your own version:

1. Fork this repository
2. Connect your GitHub account to Render
3. Create a new Static Site on Render
4. Connect your forked repository
5. Deploy with default settings

## 📊 Roadmap

- [ ] Add frequency analysis visualization
- [ ] Implement echo/feedback detection
- [ ] Add microphone calibration tools
- [ ] Create mobile app version
- [ ] Add multi-language support
- [ ] Implement advanced audio metrics

## ❓ FAQ

**Q: Why do I need to allow microphone access?**
A: The tool needs access to your microphone to test its functionality and provide real-time feedback.

**Q: Is my audio being recorded?**
A: No, your audio is only processed locally in your browser and is not recorded or transmitted.

**Q: Why doesn't it work on HTTP?**
A: Modern browsers require HTTPS for microphone access due to security policies.

**Q: Can I use this for professional audio testing?**
A: This tool is great for basic testing, but professional audio work may require specialized equipment.

---

<div align="center">
  <p>Made with ❤️ bu Saurabh Yadav</p>
  <p>
    <a href="https://mic-tester.onrender.com">Try it now</a> •
    <a href="https://github.com/Sau152004/Mic-Tester/issues">Report Bug</a> •
    <a href="https://github.com/Sau152004/Mic-Tester/issues">Request Feature</a>
  </p>
</div>

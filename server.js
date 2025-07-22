const express = require('express');
const nunjucks = require('nunjucks');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Nunjucks
nunjucks.configure('views', {
    autoescape: true,
    express: app,
    watch: true
});

// Set view engine
app.set('view engine', 'html');

// Serve static files
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.render('index.html', {
        title: 'Microphone Test - Test Your Mic Online',
        description: 'Test your microphone online with real-time audio visualization. No recording, completely private.'
    });
});

app.get('/privacy', (req, res) => {
    res.render('privacy.html', {
        title: 'Privacy Policy - Microphone Test'
    });
});

app.get('/faq', (req, res) => {
    res.render('faq.html', {    
        title: 'FAQ - Microphone Test'
    });
});
app.get('/about', (req, res) => {
    res.render('about.html', {
        title: 'About - Microphone Test'
    });
});     

// 404 handler
app.use((req, res) => {
    res.status(404).render('404.html', {
        title: '404 - Page Not Found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
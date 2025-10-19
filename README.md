# Google OAuth2 Login Application

A modern, secure Google OAuth2 login application built with React, TypeScript, and deployed on Vercel.

## Features

- 🔐 **Secure OAuth2 Authentication** - Google Sign-In integration
- 🎨 **Modern UI/UX** - Clean, responsive design with smooth animations
- 🔒 **Security Best Practices** - Environment variables for secrets management
- 📱 **Mobile Responsive** - Works perfectly on all device sizes
- ♿ **Accessibility** - WCAG compliant with proper focus management
- 🚀 **Cloud Ready** - Optimized for Vercel deployment

## Live Demo

🚀 **[View Live Application](https://google-oauth-login-demo.vercel.app)**

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- Google Cloud Console account
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/google-oauth-login.git
cd google-oauth-login
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Google OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Navigate to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Set Application type to **"Web application"**
6. Add your domains to **Authorized JavaScript origins**:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.vercel.app` (for production)

### 4. Configure Environment Variables

Copy the example environment file:

```bash
cp env.example .env.local
```

Edit `.env.local` and add your Google Client ID:

```env
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### 5. Run the Application

```bash
npm start
```

The application will open at `http://localhost:3000`

## Deployment

### Deploy to Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Set Environment Variables**:
   ```bash
   vercel env add REACT_APP_GOOGLE_CLIENT_ID
   ```

4. **Redeploy**:
   ```bash
   vercel --prod
   ```

### Alternative Deployment Options

#### Netlify
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Add environment variable: `REACT_APP_GOOGLE_CLIENT_ID`

#### AWS Amplify
1. Connect your GitHub repository to AWS Amplify
2. Set build command: `npm run build`
3. Set base directory: `/`
4. Add environment variable: `REACT_APP_GOOGLE_CLIENT_ID`

## Project Structure

```
google-oauth-app/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── App.tsx          # Main application component
│   ├── App.css          # Styling and responsive design
│   ├── index.tsx        # Application entry point
│   └── index.css        # Global styles
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vercel.json          # Vercel deployment configuration
└── env.example          # Environment variables template
```

## Security Features

- ✅ **No Hardcoded Secrets** - All sensitive data stored in environment variables
- ✅ **Secure Token Handling** - JWT tokens processed securely
- ✅ **HTTPS Only** - Production deployment uses HTTPS
- ✅ **CORS Protection** - Proper origin validation
- ✅ **Input Validation** - All user inputs validated

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/google-oauth-login/issues) page
2. Create a new issue with detailed information
3. For Google OAuth2 setup help, refer to the [official documentation](https://developers.google.com/identity/protocols/oauth2/web-server)

## Acknowledgments

- [Google Identity Services](https://developers.google.com/identity) for OAuth2 implementation
- [React](https://reactjs.org/) for the frontend framework
- [Vercel](https://vercel.com/) for seamless deployment
- [TypeScript](https://www.typescriptlang.org/) for type safety
# Test deployment

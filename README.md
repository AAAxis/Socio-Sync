# Socio-Sync

A comprehensive patient case management system built with React, TypeScript, Firebase, and deployed on Vercel.

## Features

- 🔐 **Secure Authentication** - Firebase Auth with Google Sign-In and Email/Password
- 📋 **Patient Management** - Complete patient case tracking system
- 📅 **Calendar Integration** - Google Calendar sync for appointments
- 👥 **User Management** - Multi-role system (Super Admin, Admin)
- 📊 **Dashboard & Analytics** - Real-time statistics and activity logs
- 🌐 **Multi-language Support** - i18n ready (English & Hebrew)
- 🔒 **Security & Privacy** - PII data separation with PostgreSQL backend
- 📱 **Mobile Responsive** - Works perfectly on all device sizes
- 🚀 **Cloud Ready** - Optimized for Vercel deployment

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Firebase account
- Google Cloud Console account
- Git

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Setup

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed instructions on:
- Creating a Firebase project
- Enabling Authentication
- Setting up Firestore
- Configuring security rules

### 3. Google Calendar Setup

See [GOOGLE_SETUP.md](GOOGLE_SETUP.md) for instructions on:
- Setting up Google Calendar API
- Configuring OAuth2 credentials

### 4. Run the Application

```bash
npm start
```

The application will open at `http://localhost:3000`

### 5. Build for Production

```bash
npm run build
```

## Deployment

### Deploy to Vercel (Recommended)

See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for complete deployment instructions.

**Quick Deploy:**

1. Push code to GitHub:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. Import project in Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your repository
   - Configure with default settings (Create React App)
   - Deploy!

3. Update Firebase & Google Cloud authorized domains with your Vercel URL

### Alternative: Deploy via CLI

```bash
npm install -g vercel
vercel
```

## Project Structure

```
Socio-Sync/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── LoginPage.tsx
│   │   ├── Patients.tsx
│   │   ├── CreatePatientPage.tsx
│   │   ├── Users.tsx
│   │   └── ...
│   ├── locales/         # i18n translations
│   ├── App.tsx          # Main application
│   ├── firebase.ts      # Firebase configuration
│   ├── config.ts        # API configuration
│   ├── types.ts         # TypeScript types
│   └── utils.ts         # Utility functions
├── build/               # Production build (auto-generated)
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vercel.json          # Vercel deployment config
├── firestore.rules      # Firestore security rules
└── .gitignore           # Git ignore patterns
```

## Security Features

- ✅ **Firebase Authentication** - Secure user authentication
- ✅ **Firestore Security Rules** - Database access control
- ✅ **PII Data Separation** - Sensitive data stored in PostgreSQL
- ✅ **Role-Based Access Control** - Super Admin and Admin roles
- ✅ **2FA Support** - Two-factor authentication via email
- ✅ **HTTPS Only** - Production deployment uses HTTPS
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

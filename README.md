# Study Planner - Authentication & Academic Workspace

A production-grade React + Vite + Tailwind CSS + Supabase authentication system built for "Study Planner".

## Overview

Study Planner features genuine Supabase authentication with session persistence, route protection, email verification, password reset, and Google OAuth integration.

---

## Supabase Setup Steps

### 1. Create .env File
Create a `.env` file in the project root with your Supabase credentials:

```bash
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

> **Note:** Find these values in your [Supabase Dashboard](https://supabase.com/dashboard) under **Project Settings > API**.

### 2. Enable Email Provider in Supabase
1. Navigate to **Authentication > Providers** in the Supabase Dashboard.
2. Ensure the **Email** provider is toggled to **Enabled**.
3. Under Email provider settings:
   - Toggle **Confirm email** ON if you want users to verify their email before logging in.
   - Or toggle **Confirm email** OFF if you want instant login after sign up.

### 3. Enable Google Provider (OAuth)
1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create an OAuth 2.0 Client ID (Web application).
2. Set the **Authorized redirect URI** in Google Cloud Console to:
   ```
   https://<your-project-id>.supabase.co/auth/v1/callback
   ```
3. Copy the **Client ID** and **Client Secret**.
4. In Supabase Dashboard, go to **Authentication > Providers > Google**.
5. Toggle **Enable Google provider**, paste your **Client ID** and **Client Secret**, and click **Save**.

### 4. URL Configuration (Redirect URLs)
1. In Supabase Dashboard, go to **Authentication > URL Configuration**.
2. Set **Site URL** to:
   ```
   http://localhost:5173
   ```
   *(or your deployed domain, e.g. `https://your-app.vercel.app`)*
3. In the **Redirect URLs** list, add:
   ```
   http://localhost:5173/auth/callback
   http://localhost:3000/auth/callback
   http://localhost:5173/reset-password
   http://localhost:3000/reset-password
   https://your-app.vercel.app/auth/callback
   https://your-app.vercel.app/reset-password
   ```

---

## How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

Visit the app at `http://localhost:5173` (or `http://localhost:3000`).

---

## Testing Scenarios

### 1. Test Sign Up
1. Navigate to `/signup`.
2. Fill in Full Name, Email, Password (minimum 8 characters), and Confirm Password.
3. Observe real-time validation (password strength indicators, `.edu` badge, match checks).
4. Click **Create Account**.
   - If email confirmation is ON in Supabase: You will see "Check your email to verify your account".
   - If email confirmation is OFF in Supabase: You are immediately redirected to `/dashboard`.

### 2. Test Email Verification
1. Open the verification email sent by Supabase.
2. Click the verification link.
3. You will be redirected to `/auth/callback`, which verifies your token and sends you directly to `/dashboard`.

### 3. Test Sign In
1. Navigate to `/signin`.
2. Enter your registered email and password.
3. Toggle Show/Hide password to check visibility.
4. Click **Sign In to Dashboard**.
5. If the email is unconfirmed, an inline alert appears with a **Resend verification email** button.
6. On success, you enter `/dashboard` with an active Supabase session.

### 4. Test Forgot Password & Reset Password
1. Navigate to `/signin` and click **Forgot password?** (or go to `/forgot-password`).
2. Enter your email and click **Send reset link**.
3. Open the reset email and click the recovery link.
4. The link redirects to `/reset-password` with recovery tokens.
5. Enter a new password (min 8 chars) and confirm it.
6. Click **Update Password**. On success, your session is updated and you navigate to `/dashboard`.

### 5. Test Google OAuth
1. On `/signin` or `/signup`, click **Continue with Google**.
2. Complete Google authentication.
3. You will return to `/auth/callback` and seamlessly land on `/dashboard`.

### 6. Test Sign Out & Route Protection
1. In `/dashboard`, click **Sign Out**.
2. You are signed out of Supabase and redirected to `/signin`.
3. Attempting to directly open `/dashboard` in the address bar will redirect you back to `/signin`.

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/92ad3490-43ec-470f-a8df-8a0aeea1abf8

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## GitHub Actions Deployment

The project has been configured with a GitHub Actions workflow (`.github/workflows/deploy.yml`) for automatic deployment to GitHub Pages.

1. Ensure the remote repository is named `Resume` so the URL `/Resume/` works properly.
2. Go to your repository **Settings** -> **Pages**.
3. Under **Build and deployment**, change the **Source** to **GitHub Actions**.
4. Push your code to the `main` or `master` branch. The action will automatically build and deploy your app.

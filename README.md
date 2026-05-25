# Discord Staff Application Website

A modern, responsive Discord-themed dark mode application form that connects directly to your Discord server via Webhook or a Discord Bot. Includes a staff review portal to Approve or Reject applications.

## ⚠️ Important: Deploying to GitHub Pages vs Render/Vercel

**GitHub Pages is only for static websites (HTML, CSS, and browser JavaScript).** It **cannot** run backend servers (like Node.js and Express). 

Because this application uses a Node.js backend to securely send applications to Discord (without exposing your Webhook URL or Bot Token to the public), **it will show a 404 error on GitHub Pages**.

To host this website online for free, you should use a backend hosting provider like **Render.com** or **Railway.app**.

---

## 🚀 How to Host on Render (Free & Recommended)

Render is a free cloud hosting service that runs Node.js applications directly from your GitHub repository.

1. Go to [Render.com](https://render.com) and create a free account.
2. Click **New** (top right) and select **Web Service**.
3. Connect your GitHub account and select your **`rop-apply`** repository.
4. Configure the settings:
   - **Name**: `discord-staff-app`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Scroll down and click **Advanced**, then click **Add Environment Variable** to add your credentials securely:
   - `DISCORD_WEBHOOK_URL`: `https://discord.com/api/webhooks/1508490753784152229/2wKdOZuCETLKraReRhbHuCkWFJ0B7OsB690dzcSaMF_dxruSjjoG_ScyYdmxJg3kxBvL`
   - `DISCORD_CHANNEL_ID`: `1508490734657863850`
   - `DISCORD_TOKEN`: *(Optional: paste your Discord bot token here if you want interactive buttons)*
6. Click **Deploy Web Service**.

Render will build and run your website. It will provide you with a public URL (e.g., `https://rop-apply.onrender.com`) that you and your applicants can use!

---

## 💻 Local Testing & Setup

If you want to run and test it on your own computer:

1. Clone your repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory (based on `.env.example`) and add your webhook details:
   ```env
   PORT=3000
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1508490753784152229/2wKdOZuCETLKraReRhbHuCkWFJ0B7OsB690dzcSaMF_dxruSjjoG_ScyYdmxJg3kxBvL
   DISCORD_CHANNEL_ID=1508490734657863850
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open your browser to `http://localhost:3000` to fill out the form.

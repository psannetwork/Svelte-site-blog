# Svelte Site Blog

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## 🚀 Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## 🛠 Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## 🚀 Deployment

For detailed instructions on how to deploy this blog locally or to the web (Render.com), please see our **[Deployment Guide (Japanese)](./DEPLOY.md)**.

## 📦 Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

---

## 📝 Commit Convention

Please use the following format for commit messages:

`[Emoji] [Prefix]: [Summary]`

| Prefix | Meaning |
| :--- | :--- |
| `feat` ✨ | New Feature |
| `fix` 🐛 | Bug Fix |
| `ui` 💄 | UI/Style Change |
| `refactor` ♻️ | Refactoring |
| `docs` 📝 | Documentation |
| `chore` 🔧 | Tooling/Config |

Example: `💄 ui: Improve button visibility in dark mode`
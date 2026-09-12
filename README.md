# Astro Starter Kit: Minimal

```sh
pnpm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`             | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Shorts

`/seriatim` lists every entry in `src/content/shorts/` under its hero video.
Those entries are not written by hand: the shared shorts pipeline
(`python3 -m media_shorts_toolkit.web publish` in `cssllcio/media-shorts-toolkit`,
Stage 5b of each product's social publishing runbook; the frontmatter is the
toolkit README's "site contract") uploads a kit's renders and posters to R2 at
`https://media.chaosofzen.com/social/<asset_id>/`, writes one entry here on a
branch `shorts/<asset_id>`, and opens a PR. Merging the PR publishes the short;
the deploy is the ordinary one. The media never enters this repository — the
site is fully static and this repo is not a media store.

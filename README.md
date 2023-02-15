# Welcome to [No Man’s Sky Recipes](https://nomansskyrecipes.com/)

![image](https://user-images.githubusercontent.com/5970177/219064525-4f4709b1-a768-40c7-95dd-41a5d123e925.png)

## Project Structure

Inside of the project, you'll see the following folders and files:

```
/
├── public/
│   └── 
├── src/
│   ├── assets/
│   │   └── 
│   ├── components/
│   │   └── 
│   ├── data/
│   │   └── 
│   ├── layouts/
│   │   └── 
│   └── pages/
│       └── 
│   └── untils/
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                             |
| :--------------------- | :------------------------------------------------- |
| `npm install`          | Installs dependencies                              |
| `npm run dev`          | Starts local dev server at `localhost:3000`        |
| `npm run build`        | Build your production site to `./dist/`            |
| `npm run preview`      | Preview your build locally, before deploying       |
| `npm run astro ...`    | Run CLI commands like `astro add`, `astro preview` |
| `npm run astro --help` | Get help using the Astro CLI                       |

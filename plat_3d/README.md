# 3D Platformer Game

A 3D platformer game built with Svelte 5 and Three.js. This project demonstrates how to create a 3D game with a level editor using modern web technologies.

## Features

- 3D platformer gameplay with physics
- Level editor to create and modify levels
- Save and load level functionality
- Camera controls
- Collision detection
- Responsive design

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Technologies Used

- [Svelte 5](https://svelte.dev/) - Frontend framework with the new runes API
- [SvelteKit](https://kit.svelte.dev/) - Full-stack framework
- [Three.js](https://threejs.org/) - 3D graphics library
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Bootstrap](https://getbootstrap.com/) - CSS framework
- [Drizzle ORM](https://orm.drizzle.team/) - Database ORM
- [SQLite](https://www.sqlite.org/) - Database

## Game Controls

- **WASD** or **Arrow Keys** - Move the player
- **Space** - Jump
- **Q/E** - Rotate camera
- **Click** - Place objects in editor mode

## Project Structure

- `src/lib/components/game-view/` - Main game components
- `src/lib/components/game-view/game-objects/` - Game objects (player, level editor)
- `src/lib/components/game-view/game-managers/` - Game managers (input)
- `src/lib/server/db/` - Database configuration and schema

## Svelte 5 Migration

This project has been migrated to Svelte 5, utilizing the new runes API for reactivity. Key changes include:

- Using `$state<Type>()` for reactive variables
- Using `$props()` for component props
- Converting event handlers from `on:event` to `onevent`
- Using proper TypeScript typing throughout the codebase

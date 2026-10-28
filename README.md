# Glass Mafia Night

BUILD A SIMPLE MULTIPLAYER MAFIA GAME



Build a simple, functional Mafia game website with an Apple-inspired glassmorphism design.



IMPORTANT: Keep the application as simple as possible. Do not add unnecessary features, pages, animations, or complicated systems. Prioritize functionality and privacy.



1. DESIGN



- Apple-inspired Liquid Glass / glassmorphism.

- Black background with translucent glass panels.

- White text, subtle reflections, rounded buttons.

- Minimal, clean, mobile-friendly interface.

- Smooth but lightweight animations.



2. ONE ROOM



There should be only ONE game room.



- The administrator opens the room.

- Players join the room and enter the names they want to use.

- Display the names of everyone who has joined.

- Allow a player to rejoin after refreshing the page without creating a duplicate.

- Maximum capacity: 23 players.

- Show the current player count, for example, "12/23 PLAYERS".

- Do not create multiple rooms, room codes, match history, or unnecessary dashboards.



3. ADMIN ACCESS



I am the administrator.



- Add a secret admin code in the settings or server configuration.

- I enter this code to unlock administrator controls.

- Only the administrator can start or reset the game.

- Only the administrator can see the complete list of players and their assigned characters.

- Never display the admin code publicly or store it in frontend code.

- Validate the code securely on the server.

- Keep the administrator authenticated after unlocking the controls.



4. CHARACTER ALLOCATION



There can be a maximum of 23 players.



Assign characters randomly when the administrator presses START GAME.



Character| Number of players

🔪 Mafia| 3

🃏 Joker| 1

🕵️ Detective| 1

🩺 Doctor| 1

👤 Civilian| All remaining players

Maximum players| 23



At maximum capacity, the distribution is:



- 3 Mafia

- 1 Joker

- 1 Detective

- 1 Doctor

- 17 Civilians



Each player must receive exactly one character.



Do not allow players to choose their characters or reroll their cards.



If fewer than six players have joined, do not allow the game to start because all six special roles must be assigned.



5. PRIVATE PLAYER CARDS



When the administrator presses START GAME:



1. Randomly assign the characters on the server.

2. Each player sees a REVEAL MY CARD button.

3. When clicked, show that player's character card.

4. Each player can see only their own character.

5. The administrator can see every player's name and character in a private admin panel.



Example of the administrator's private chart:



Player name| Assigned character

Ahmed| Mafia

Ali| Doctor

Hamza| Joker

Usman| Civilian



This chart must never be visible to ordinary players.



Enforce privacy on the server. Do not send everyone's character assignments to every player's browser and merely hide them on the screen.



Refreshing the page must not change a player's assigned character.



6. GAME CONTROLS



Keep the controls minimal.



Player controls:



- Enter name.

- Join game.

- Reveal my card.



Administrator controls:



- Unlock admin mode using the secret code.

- View all players and their characters.

- Start game.

- Reset game.



When the administrator resets the game, clear the assignments and return everyone to the waiting lobby. Require the administrator to confirm the reset.



7. SIMPLE TECHNICAL REQUIREMENTS



Use the simplest reliable technology supported by the app-building platform.



- Use one shared, persistent backend.

- Store player names and role assignments securely.

- Synchronize the player list in real time.

- Generate random assignments on the server.

- Enforce administrator permissions on the server.

- Ensure players cannot access other players' secret cards.

- Preserve assignments after refreshes and temporary disconnections.

- Support mobile phones, tablets, and computers.



Do not build a complicated authentication system, multiple dashboards, chat, voting, night phases, animations for every action, or other features that are not requested.



Do not use fake multiplayer or browser-only storage as the shared game database.



8. REQUIRED FINAL RESULT



The entire application should have only three main screens:



1. Join Screen: Enter a name and join the game.

2. Lobby: See the player list and wait for the administrator.

3. Game Screen: Reveal your own card, while the administrator can access the private player-to-character chart.



Build only these features. Keep the code clean, minimize dependencies, avoid unnecessary abstractions, and fix errors before adding anything else.



Do not expand the scope. Do not add features I did not request. Make the simplest working version first.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/15f635b6-4e50-4f82-ab7b-872d67354ba4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

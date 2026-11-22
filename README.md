# ChesireCat

## Play locally

Run `npm ci` and `npm run dev`, then open [Wonderland](http://localhost:3000/play). The dev and production build commands build the vendored Carbon Chase into `public/chase` before starting Next.js. The generated folder is ignored by Git.

## Carbon Chase

Win the Cheshire Cat, Carbon Maze, and Greenwash Check rooms to collect the three Golden Key pieces. Enter the tiny garden door from the Hall of Doors. In the garden, the White Rabbit runs off after leaving lights and appliances on. Follow him down the path and press **E** at the Carbon Chase door.

The chase includes **Lights Out**, **Under the Sink**, **The Boiler Room**, **Laundry Leap**, **Last Call at the Cottage**, and **Power-up lab**. Find all the carbon tasks, use the appliance power-ups to get around, and reach the rabbit hole. Each task shows an annual carbon-savings example and the assumptions behind it. Use **WASD** to move, the mouse to look, **Space** to jump, and **Shift** or **Ctrl** to slide. Follow the on-screen **E** prompts. **R** restarts a run and **Esc** pauses.

At a level’s finish, choose **Next level** or **Back to the Hall of Doors**. Returning after a finish keeps the next course ready for when you re-enter the garden door in the same session. Leaving an unfinished course keeps that course ready to retry. The final course offers **Catch the Rabbit!** and the Hall option. Local best times, ghosts, and collectibles use the chase’s existing saves.

## Development

- `npm test` runs the Wonderland tests. `npm run test:chase` runs the vendored game's tests after its dependencies are installed.
- `npm --prefix chase run dev` starts the original chase menu for standalone play. Run `npm --prefix chase ci` first if you have not built it through the parent app.
- `npm run build` builds both games for production. See [chase deployment](chase/docs/DEPLOYMENT.md) for the optional Supabase setup and [level design](chase/docs/LEVEL_DESIGN.md) for course authoring.

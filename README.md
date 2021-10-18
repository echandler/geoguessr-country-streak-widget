# geoguessr-country-streak-widget
Useful widget for playing country streaks on any geoguessr map.

#### *** This widget is fragile, it is tight with the geoguessr website code. If the geoguessr code changes the widget will probably stop working. Fixing it will probably not happen anytime soon, but check back often anyways.***

#### How to use:
  - Click on the widget to view "Max" and "Last" info..
  - Hold the mouse button and drag the widget to a new location.
  - Click on word "Streak", "Max" or "Last" to view rounds on a zoomable map.
  - Press the number 0 to zero out the counter. (Currently there isn't
    a way to increase or decrease the streak manually)
  - If the map popping up automatically is annoying, change `let openMapOnWrongAnswer = true;`
    at the top of the code to: `let openMapOnWrongAnswer = false;`.
  - The widget doesn't work on challenges.

#### Installation instructions:
  - Install Tampermonkey for Chrome, not yet tested in FireFox.
  - Copy the code from `geoguessrCountryStreaks.user.js` into a new Tampermonkey file and save it.
  - Open geoguessr in a brand new tab, refreshing an old tab might work but it might not.
  - Optional: Find map tiles on the internet to enable the map feature.
    - Insert the URL of a tile server into the `let mapTilesURL = "";` variable at the top of the code.
      For example, `let mapTilesURL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";` will show
      OpenStreeMap tiles which are free to use for personal use. Here is a list of tile servers from
      the OpenStreetMap website, but there are others available (most tile servers require registration).
      https://wiki.openstreetmap.org/wiki/Tile_servers 
   - If you have added a tile map server URL, change `let openMapOnWrongAnswer = false;` at the top 
     of the code to: `let openMapOnWrongAnswer = true;`  so that the map will show up automatically.

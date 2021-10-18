// ==UserScript==
// @name         Country Streak Counter (Automated) version 5.3
// @include      /^(https?)?(\:)?(\/\/)?([^\/]*\.)?geoguessr\.com($|\/.*)/
// @description  Adds a country streak counter to the GeoGuessr website
// @grant        GM_addStyle
// ==/UserScript==

let openMapOnWrongAnswer = true;

let mapTilesURL = ""; // Example "https://tile.website.org/{z}/{x}/{y}.png;

//---------------------------------------------------------------------------------

let attribution = "";
let maxZoom = 18;
let tileSize = 256; // 512 for mapbox tiles.
let subdomains = ["mt0", "mt1", "mt2", "mt3"]; // google map tiles.
let tilesId = "mapbox/streets-v11"; // mapbox tiles.
let zoomOffset = 0; // -1 for mapbox.

let last_guess = [0, 0];
let sd = { s: [[]] };

if (sessionStorage.getItem("streakData") == null) {
    sessionStorage.setItem("streakData", JSON.stringify(sd));
}

sd = JSON.parse(sessionStorage.getItem("streakData"));

function getCurStreak() {
    let ret = { num: 0, streakNum: 0 };

    ret.num = sd.s[sd.s.length - 1].length;
    ret.streakNum = sd.s.length - 1;

    return ret;
}

function getMaxStreak() {
    let ret = { max: 0, streakNum: 0 };

    for (let n = 0; n < sd.s.length; n++) {
        let len = sd.s[n].length;

        if (len > 0 && sd.s[n][len - 1].guess.country == sd.s[n][len - 1].location.country) {
            // Game hasn't ended yet.
            if (len > ret.max) {
                ret.max = len;
                ret.streakNum = n;
            }
            continue;
        }

        if (len - 1 >= ret.max) {
            // Game probably ended.
            ret.max = len - 1;
            ret.streakNum = n;
        }

        if (n === sd.s.length - 1 && len >= ret.max) {
            // The player may be continueing the streak even with a wrong answer.
            ret.max = len;
            ret.streakNum = n;
        }
    }

    return ret;
}

function getPrevStreak() {
    let ret = { num: 0, streakNum: -1 };

    if (sd.s.length > 1) {
        let t = sd.s[sd.s.length - 2];
        if (t[t.length - 1].guess.country == t[t.length - 1].location.country) {
            // The person may have ended the round early.
            ret.num = t.length;
        } else {
            ret.num = t.length - 1;
        }
        ret.streakNum = sd.s.length - 2;
    }

    return ret;
}

function updateStreak(newVariable) {
    let cur = getCurStreak();
    document.getElementById("streak_cur_num").innerText = cur.num;

    let max = getMaxStreak();
    document.getElementById("streak_max_num").innerText = max.max;

    let prev = getPrevStreak();
    document.getElementById("streak_prev_num").innerText = prev.num;
}

function addCounterOnRefresh() {
    let streak_container = document.createElement("div");
    streak_container.id = "streak_container";
    streak_container.style.top = localStorage.getItem("containerY") || "50px";
    streak_container.style.left = localStorage.getItem("containerX") || "10px";

    let mouseMove = false;

    streak_container.addEventListener("click", mclick);

    function mclick(e) {
        if (mouseMove == true) {
            mouseMove = false;
            return;
        }
        let ma = document.getElementById("margin_ani_cont");
        if (ma.style.marginLeft != "0em") {
            ma.style.opacity = 1;
            ma.style.marginLeft = "0em";
        } else {
            ma.style.opacity = 1;
            ma.style.marginLeft = "-11em";
        }
    }

    streak_container.addEventListener("mousedown", function (x) {
        document.body.addEventListener("mousemove", mmove);
        document.body.addEventListener("mouseup", mup);

        let bcr = this.getBoundingClientRect();
        let _x = x.x - bcr.x;
        let _y = x.y - bcr.y;

        function mup(e) {
            document.body.removeEventListener("mousemove", mmove);
            document.body.removeEventListener("mouseup", mup);
            localStorage.setItem("containerY", streak_container.style.top);
            localStorage.setItem("containerX", streak_container.style.left);
        }

        function mmove(e) {
            if ((mouseMove == false && Math.abs(x.x - e.x) > 2) || Math.abs(x.y - e.y) > 2) {
                // Mouse move event fires for no reason in chrome canary.
                mouseMove = true;
            }
            streak_container.style.top = e.y - _y + "px";
            streak_container.style.left = e.x - _x + "px";
        }
    });

    streak_container.innerHTML = `
        <div id='left_before'> </div>
        <div id="info">
            <div id='streak_num_cont' class='marginright15'>
                <div id='streak_cur_name' class='header'> STREAK </div>
                <div id='streak_cur_num' class='streakNum'> 0 </div>
            </div>
            <div id='add_cont'>
                <div id="margin_ani_cont">
                <div id="streak_max_cont" class='marginright15'>
                    <div id='streak_max_name' class='header'> MAX </div>
                    <div id='streak_max_num' class='streakNum'> 0 </div>
                </div>
                <div id="streak_max_cont1" class='marginright15'>
                    <div id='streak_prev_name' class='header'> LAST </div>
                    <div id='streak_prev_num' class='streakNum'> 0 </div>
                </div>
            </div>
            </div>
        </div>
        <div id='right_before'> </div>`;

    document.body.appendChild(streak_container);

    let $ = document.getElementById.bind(document);

    $("streak_cur_num").innerText = getCurStreak().num;
    $("streak_prev_num").innerText = getPrevStreak().num;
    $("streak_max_num").innerText = getMaxStreak().max;

    $("streak_cur_name").addEventListener(
        "click",
        streakShowMap(() => (sd.s.length - 1 < 0 ? [] : sd.s[sd.s.length - 1]))
    );

    $("streak_max_name").addEventListener(
        "click",
        streakShowMap(() => sd.s[getMaxStreak().streakNum])
    );

    $("streak_prev_name").addEventListener(
        "click",
        streakShowMap(() => (sd.s.length - 2 < 0 ? [] : sd.s[sd.s.length - 2]))
    );

    function streakShowMap(func) {
        return function (e) {
            mouseMove = true;
            if (document.body.contains(this.map)) {
                this.map.parentElement.removeChild(this.map);
                this.map = null;
                return;
            }
            this.map = createMap(func());
        };
    }
}

async function callReverseGeocodeAPI(location) {
    // Function from old streak counter code.
    if (location[0] <= -85.05) {
        return "AQ";
    }
    // let api = "https://api.bigdatacloud.net/data/reverse-geocode?latitude="+location[0]+"&longitude="+location[1]+"&localityLanguage=en&key="+API_Key
    let api = `https://nominatim.openstreetmap.org/reverse.php?format=json&zoom=5&
                   lat=${location[0]}&
                   lon=${location[1]}`;

    return fetch(api).then((res) => res.json());
}

async function callGeoGuessrAPI() {
    const game_tag = window.location.href.substring(window.location.href.lastIndexOf("/") + 1);
    const api_url = "https://www.geoguessr.com/api/v3/games/" + game_tag;

    return fetch(api_url).then((res) => res.json());
}

async function check() {
    let resObj = await callGeoGuessrAPI();
    let len = resObj.player.guesses.length;

    let guessCoords = [resObj.player.guesses[len - 1].lat, resObj.player.guesses[len - 1].lng];
    let locationCoords = [resObj.rounds[len - 1].lat, resObj.rounds[len - 1].lng];

    if (guessCoords[0] == last_guess[0] && guessCoords[1] == last_guess[1]) {
        return;
    }

    last_guess = guessCoords;

    let guessData = await callReverseGeocodeAPI(guessCoords);
    let locationData = await callReverseGeocodeAPI(locationCoords);

    let guessCountry = guessData.error ? "Error" : guessData.address.country;
    sd.s[sd.s.length - 1].push({ guess: { lat: guessCoords[0], lon: guessCoords[1], country: guessCountry }, location: { lat: locationCoords[0], lon: locationCoords[1], country: locationData.address.country } });

    let guessLoc = guessData.error ? "Error" : CountryDict[guessData.address.country_code.toUpperCase()];
    let loc = CountryDict[locationData.address.country_code.toUpperCase()];

    if (guessLoc != loc) {
        // Player didn't guess correct country.
        sd.s.push([]);

        addKeepStreakGoingMsg();

        if (openMapOnWrongAnswer) {
            createMap(sd.s[sd.s.length - 2]);
        }
    }

    sessionStorage.setItem("streakData", JSON.stringify(sd));
    updateStreak();
}

function addKeepStreakGoingMsg() {
    let msgCont = document.createElement("div");
    msgCont.id = "titleBarMsg";
    msgCont.className = "titleBarMsg";
    msgCont.style.cssText = "padding-left: 10%; transition: top 1s ease; position: absolute; top: -50px; left: 30%; z-index: 9999; padding: 10px; border-radius: 3px;";
    msgCont.classList.add("boxShadow", "styleFont", "purpleGeoTheme");

    let msg = document.createElement("a");
    msg.innerText = "Keep the streak going?";
    msg.href = "javascript:void(0)";
    msg.onclick = "return false;";
    msg.style.cssText = "color: inherit";
    msg.classList.add("styleFont");

    let del = document.createElement("div");
    del.innerText = "x";
    del.style.cssText = "display: inline; padding-left: 10px; cursor: pointer;";
    del.classList.add("styleFont", "blue_closeBtn");
    del.addEventListener("click", removeMsg);

    msgCont.appendChild(msg);
    msgCont.appendChild(del);

    document.body.appendChild(msgCont);

    setTimeout(() => (msgCont.style.top = "0px"), 100);

    msg.addEventListener("click", function () {
        if (sd.s[sd.s.length - 1].length == 0) {
            sd.s.pop();
        } else {
            // The player has already started another round.
            alert("Oops, not sure what happened but the curent streak must go on!");
            removeMsg();
            return;
        }
        if (confirm("Ignore this round?")) {
            sd.s[sd.s.length - 1].pop();
        }
        sessionStorage.setItem("streakData", JSON.stringify(sd));
        updateStreak();
        removeMsg();
    });

    let timer = setInterval(function (e) {
        let geoBtn = document.querySelectorAll("button");
        if (!geoBtn) return;

        geoBtn.forEach((el) => {
            if (el.__removeMsg) return;
            el.addEventListener("click", removeMsg);
        });
    }, 1000);

    function removeMsg() {
        clearInterval(timer);
        document.querySelectorAll(".titleBarMsg").forEach((msg) => msg.parentElement.removeChild(msg));
    }
}

function createMap(lls) {
    let parentMap = document.createElement("div");
    parentMap.id = "leaflet_parentMap";
    parentMap.style.cssText = "position:absolute; top:15%; left:15%; height: 70%; width: 70%; overflow: hidden; border-radius: 3px;";
    parentMap.classList.add("boxShadow", "styleFont");

    if (document.getElementById(parentMap.id)) {
        // Remove previous map.
        let el = document.getElementById(parentMap.id);
        el.parentElement.removeChild(el);
    }

    let titleBar = document.createElement("div");
    titleBar.id = "leaflet_parentMap_titleBar";
    titleBar.style.cssText = "padding-left: 1em; line-height: 1.5em; position: relative; cursor: move;";
    titleBar.classList.add("purpleGeoTheme");
    titleBar.innerText = "Good Job, Keep Going!";

    titleBar.addEventListener("mousedown", function (x) {
        document.body.addEventListener("mousemove", mv);
        document.body.addEventListener("mouseup", mu);
        let bcr = parentMap.getBoundingClientRect();
        let _x = x.x - bcr.x;
        let _y = x.y - bcr.y;

        function mu(e) {
            document.body.removeEventListener("mousemove", mv);
            document.body.removeEventListener("mouseup", mu);
        }

        function mv(e) {
            parentMap.style.left = ~~(e.x - _x) + "px";
            parentMap.style.top = ~~(e.y - _y) + "px";
        }
    });

    let closeBtn = document.createElement("div");
    closeBtn.id = "leafletMap_closeBtn";
    closeBtn.classList.add("blue_closeBtn");
    closeBtn.style.cssText = "width:40px; height: 100%; position: absolute; top: 0px; right: 0px; text-align: center; cursor: pointer;";
    closeBtn.innerText = "x";
    closeBtn.addEventListener("click", function (e) {
        let map = document.getElementById("leaflet_parentMap");
        document.body.removeChild(map);
    });

    let map = document.createElement("div");
    map.id = "leafletMap";
    map.style.cssText = "height: calc(100% - 2em); width:100%;";

    parentMap.appendChild(titleBar);
    titleBar.appendChild(closeBtn);
    parentMap.appendChild(map);

    document.body.appendChild(parentMap);

    let leaflet = unsafeWindow.L;
    let mymap = leaflet.map("leafletMap").setView([15, 0], 2);

    mymap.dragging.disable();
    mymap.scrollWheelZoom.disabl;

    setTimeout(() => {
        mymap.dragging.enable();
        mymap.scrollWheelZoom.enable();
    }, 15);

    if (mapTilesURL == "") {
        alert("Please specify a URL for the map tiles in the 'mapTilesURL' variable.");
        return;
    }

    leaflet
        .tileLayer(mapTilesURL, {
            maxZoom: maxZoom,
            attribution: attribution,
            id: tilesId, //'mapbox/streets-v11', // mapbox tiles
            zoomOffset: zoomOffset, // mapbox tiles
            tileSize: tileSize, // 256 for google tiles, 512 for mapbox tiles.
        })
        .addTo(mymap);

    for (let i = 0; i < lls.length; i++) {
        if (lls[i].guess.country == lls[i].location.country) {
            let content = `<div style='color:blue; text-align: center;font-family: 'neo-sans','sans-serif';font-weight:700;'>
                                <a target='_blank' href='https://www.google.com/maps?q&layer=c&cbll=${lls[i].location.lat},${lls[i].location.lon}'> ${i + 1} - ${lls[i].location.country}</a>
                            </div>`;
            leaflet.popup({ closeOnClick: false, autoClose: false }).setLatLng([lls[i].location.lat, lls[i].location.lon]).setContent(content).addTo(mymap);
        } else {
            let content = `<div style='text-align: center;font-family: var(--countryStreakFont);font-weight:700;'>
                                <a target='_blank' href='https://www.google.com/maps?q&layer=c&cbll=${lls[i].location.lat},${lls[i].location.lon}'> ${i + 1} - ${lls[i].location.country}</a>
                            <br>
                                You guessed: ${lls[i].guess.country}
                            </div>`;
            leaflet.popup({ closeOnClick: false, autoClose: false }).setLatLng([lls[i].location.lat, lls[i].location.lon]).setContent(content).addTo(mymap);
        }
    }

    return parentMap;
}

function addStreak() {
    // This is not a great solution, but will work for now.
    if (!location.pathname.startsWith("/game/")) {
        return;
    }

    document.removeEventListener("click", addStreak, false);

    if (document.querySelector(".result-layout_root__pCZux")) {
        check();
        addStreakListener();
        return;
    }

    setTimeout(addStreak, 1000);
}

function addStreakListener() {
    if (document.querySelector(".result-layout_root__pCZux")) {
        setTimeout(addStreakListener, 1000);
        return;
    }

    document.addEventListener("click", addStreak, false);
}

document.addEventListener("keypress", (e) => {
    switch (e.key) {
        //        case '1':
        //            updateStreak(streak + 1);
        //            sessionStorage.setItem("Streak", streak);
        //            break;
        //        case '2':
        //            updateStreak(streak - 1);
        //            sessionStorage.setItem("Streak", streak);
        //            break;
        case "0":
            sd.s.push([]);
            sessionStorage.setItem("streakData", JSON.stringify(sd));
            updateStreak();
            break;
    }
});

window.addEventListener(
    "load",
    function () {
        addStreakListener();
        addCounterOnRefresh();
    },
    false
);

let css = `
    :root {
        --countryStreakFont:'neo-sans','sans-serif';
    }

    .boxShadow {
        box-shadow: 0px 2px 0 0px hsl(0deg 0% 100% / 15%),
                    0px 1px 0 0px rgb(0 0 0 / 25%),
                    2px 0px 0 0px hsl(0deg 0% 100% / 15%),
                    1px 0px 0 0px rgb(0 0 0 / 25%),
                    -2px 0px 0 0px hsl(0deg 0% 100% / 15%),
                    -1px 0px 0 0px rgb(0 0 0 / 25%);
    }

    .styleFont {
         font-family: var(--countryStreakFont);
         font-weight:700;
         z-index:9999;
    }

    .header {
        font-size: 0.6em;
        font-style: italic;
        font-weight: 700;
        color: #a19bd9;
    }

    .header:hover {
        color: white;
    }

    .streakNum{
        font-size: 1.2em;
        color: rgb(240,240,240);
    }

    #streak_container {
      position: absolute;
      top: 0px;
      left: 0px;
      height: auto;
      width: auto;
      text-align: center;
    }

    #left_before {
        bottom: 0;
        overflow: hidden;
        position: absolute;
        top: 0;
        left: 0;
        width: 50%;
        z-index: -1;
    }

    #left_before::before {
        transform-origin: top;
        transform: skewX(-12deg);
        left: 12px;
        padding-right: 3px;
        width: 100%;
        background: linear-gradient(180deg,rgba(161,155,217,0.6) 0%,
                    rgba(161,155,217,0) 50%,
                    rgba(161,155,217,0) 50%),
                    #563b9a;
        box-shadow: inset 0 1px 0 hsla(0,0%,100%,0.15),
                    inset 0 -1px 0 rgba(0,0,0,0.25);
        bottom: 0;
        content: "";
        position: absolute;
        top: 0;
        z-index: -1;
        border-radius: 3px;
    }

    #right_before{
        left: 50%;
        bottom: 0;
        overflow: hidden;
        position: absolute;
        top: 0;
        width: 50%;
        z-index: -1;
    }

    #right_before::before {
        padding-left: 3px;
        transform-origin:bottom;
        transform: skewX(-12deg);
        right: 12px;
        width: 100%;
        background: linear-gradient(180deg,rgba(161,155,217,0.6) 0%,
                    rgba(161,155,217,0) 50%,
                    rgba(161,155,217,0) 50%),
                    #563b9a;
        box-shadow: inset 0 1px 0 hsla(0,0%,100%,0.15),
                    inset 0 -1px 0 rgba(0,0,0,0.25);
        bottom: 0;
        content: "";
        position: absolute;
        top: 0;
        z-index: -1;
        border-radius: 3px;
    }

    #info {
        align-items: center;
        display: flex;
        padding: 0.5rem 0 0.5rem 1.5rem;
        width: auto;
    }

    .marginright15 {
        margin-right: 1.5em;
        display:inline-block;
    }

    #add_cont {
        display:inline-block;
        overflow: hidden;
    }

    #margin_ani_cont{
        transition: margin 300ms ease-out, opacity 1s ease;
        margin-left: -11em;
        opacity: 1;
    }

    #streak_container {
        position: absolute;
        user-select: none;
        z-index: 9999999;
        cursor: pointer;
        font-size: 1em;
        color: rgb(50,50,70);
        font-weight: bold;
        font-family: var(--countryStreakFont);
        transition: background 200ms ease;
    }

    .blue_closeBtn:hover {
        color: grey;
    }

    .purpleGeoTheme, .leaflet-popup-content-wrapper,  .leaflet-bar a{
        background : linear-gradient(180deg,rgba(161,155,217,0.6) 0%,
                     rgba(161,155,217,0) 50%,
                      rgba(161,155,217,0) 50%),
                      #563b9a;
        color: rgb(240,240,240);
    }

    .leaflet-popup-tip{
        background: #563b9a;
    }

    .leaflet-container a {
        color: rgb(240,240,240);
    }
`;

let style1 = document.createElement("style");
style1.appendChild(document.createTextNode(css));
document.body.appendChild(style1);

//<link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
//<script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
let leafletLink = document.createElement("link");
leafletLink.rel = "stylesheet";
leafletLink.href = "https://unpkg.com/leaflet@1.7.1/dist/leaflet.css";
document.head.appendChild(leafletLink);

let leafletScript = document.createElement("script");
leafletScript.src = "https://unpkg.com/leaflet@1.7.1/dist/leaflet.js";
document.head.appendChild(leafletScript);

let CountryDict = { AF: 'AF', AX: 'FI', AL: 'AL', DZ: 'DZ', AS: 'US', AD: 'AD', AO: 'AO',
                    AI: 'GB', AQ: 'AQ', AG: 'AG', AR: 'AR', AM: 'AM', AW: 'NL', AU: 'AU',
                    AT: 'AT', AZ: 'AZ', BS: 'BS', BH: 'BH', BD: 'BD', BB: 'BB', BY: 'BY',
                    BE: 'BE', BZ: 'BZ', BJ: 'BJ', BM: 'GB', BT: 'BT', BO: 'BO', BQ: 'NL',
                    BA: 'BA', BW: 'BW', BV: 'NO', BR: 'BR', IO: 'GB', BN: 'BN', BG: 'BG',
                    BF: 'BF', BI: 'BI', KH: 'KH', CM: 'CM', CA: 'CA', CV: 'CV', KY: 'UK',
                    CF: 'CF', TD: 'TD', CL: 'CL', CN: 'CN', CX: 'AU', CC: 'AU', CO: 'CO',
                    KM: 'KM', CG: 'CG', CD: 'CD', CK: 'NZ', CR: 'CR', CI: 'CI', HR: 'HR',
                    CU: 'CU', CY: 'CY', CZ: 'CZ', DK: 'DK', DJ: 'DJ', DM: 'DM', DO: 'DO',
                    EC: 'EC', EG: 'EG', SV: 'SV', GQ: 'GQ', ER: 'ER', EE: 'EE', ET: 'ET',
                    FK: 'GB', FO: 'DK', FJ: 'FJ', FI: 'FI', FR: 'FR', GF: 'FR', PF: 'FR',
                    TF: 'FR', GA: 'GA', GM: 'GM', GE: 'GE', DE: 'DE', GH: 'GH', GI: 'GI',
                    GR: 'GR', GL: 'DK', GD: 'GD', GP: 'FR', GU: 'US', GT: 'GT', GG: 'GB',
                    GN: 'GN', GW: 'GW', GY: 'GY', HT: 'HT', HM: 'AU', VA: 'VA', HN: 'HN',
                    HK: 'CN', HU: 'HU', IS: 'IS', IN: 'IN', ID: 'ID', IR: 'IR', IQ: 'IQ',
                    IE: 'IE', IM: 'GB', IL: 'IL', IT: 'IT', JM: 'JM', JP: 'JP', JE: 'GB',
                    JO: 'JO', KZ: 'KZ', KE: 'KE', KI: 'KI', KR: 'KR', KW: 'KW', KG: 'KG',
                    LA: 'LA', LV: 'LV', LB: 'LB', LS: 'LS', LR: 'LR', LY: 'LY', LI: 'LI',
                    LT: 'LT', LU: 'LU', MO: 'CN', MK: 'MK', MG: 'MG', MW: 'MW', MY: 'MY',
                    MV: 'MV', ML: 'ML', MT: 'MT', MH: 'MH', MQ: 'FR', MR: 'MR', MU: 'MU',
                    YT: 'FR', MX: 'MX', FM: 'FM', MD: 'MD', MC: 'MC', MN: 'MN', ME: 'ME',
                    MS: 'GB', MA: 'MA', MZ: 'MZ', MM: 'MM', NA: 'NA', NR: 'NR', NP: 'NP',
                    NL: 'NL', AN: 'NL', NC: 'FR', NZ: 'NZ', NI: 'NI', NE: 'NE', NG: 'NG',
                    NU: 'NZ', NF: 'AU', MP: 'US', NO: 'NO', OM: 'OM', PK: 'PK', PW: 'PA',
                    PS: 'IL', PA: 'PA', PG: 'PG', PY: 'PY', PE: 'PE', PH: 'PH', PN: 'GB',
                    PL: 'PL', PT: 'PT', PR: 'US', QA: 'QA', RE: 'FR', RO: 'RO', RU: 'RU',
                    RW: 'RW', BL: 'FR', SH: 'GB', KN: 'KN', LC: 'LC', MF: 'FR', PM: 'FR',
                    VC: 'VC', WS: 'WS', SM: 'SM', ST: 'ST', SA: 'SA', SN: 'SN', RS: 'RS',
                    SC: 'SC', SL: 'SL', SG: 'SG', SK: 'SK', SI: 'SI', SB: 'SB', SO: 'SO',
                    ZA: 'ZA', GS: 'GB', ES: 'ES', LK: 'LK', SD: 'SD', SR: 'SR', SJ: 'NO',
                    SZ: 'SZ', SE: 'SE', CH: 'CH', SY: 'SY', TW: 'TW', TJ: 'TJ', TZ: 'TZ',
                    TH: 'TH', TL: 'TL', TG: 'TG', TK: 'NZ', TO: 'TO', TT: 'TT', TN: 'TN',
                    TR: 'TR', TM: 'TM', TC: 'GB', TV: 'TV', UG: 'UG', UA: 'UA', AE: 'AE',
                    GB: 'GB', US: 'US', UM: 'US', UY: 'UY', UZ: 'UZ', VU: 'VU', VE: 'VE',
                    VN: 'VN', VG: 'GB', VI: 'US', WF: 'FR', EH: 'MA', YE: 'YE', ZM: 'ZM',
                    ZW: 'ZW', SX: 'NL', CW: 'NL' };

const stops = [
    {
        "code": 16991,
        "name": "Opp Nan Hua High Sch",
        "shortName": "Front Gate",
        "road": "Clementi Ave 1"
    },
    {
        "code": 17191,
        "name": "NUS High Sch",
        "shortName": "Back Gate (Near)",
        "road": "AYE Slip Road"
    },
    {
        "code": 17129,
        "name": "Aft NUS High Sch",
        "shortName": "Back Gate (Middle)",
        "road": "AYE (City)"
    },
    {
        "code": 17121,
        "name": "Blk 610",
        "shortName": "Back Gate (Far)",
        "road": "AYE (Tuas)"
    }
];

const alphabet = "abcdefghijklmnopqrstuvwxyz";

const dateToTime = (dateObj) => {
    const p = x => dateObj[`get${x}`]().toString().padStart(2, "0");
    return `${p("Hours")}:${p("Minutes")}:${p("Seconds")}`;
}

const getArrData = async (stopCode) => {
    if (typeof stopCode !== "number") return false;
    return await fetch(`https://arrivelah2.busrouter.sg/?id=${stopCode}`)
        .then(x => x.json())
        .catch(() => false);
}

let starredServices = new Set(JSON.parse(localStorage.getItem("starred-services") || "[]"));

function toggleServiceStar(busNo, stopCode, btn) {
    const key = `${stopCode}-${busNo}`;
    if (starredServices.has(key)) {
        starredServices.delete(key);
    } else {
        starredServices.add(key);
    }
    localStorage.setItem("starred-services", JSON.stringify([...starredServices]));
    btn.textContent = starredServices.has(key) ? "★" : "☆";
    reorderServices(stopCode);
}

function reorderServices(stopCode) {
    const svcHolder = document.querySelector(`[data-stop-id="${stopCode}"] .service-holder`);
    const children = Array.from(svcHolder.querySelectorAll(".service-container"));
    children.sort((a, b) => {
        const aStar = starredServices.has(`${stopCode}-${a.dataset.service}`);
        const bStar = starredServices.has(`${stopCode}-${b.dataset.service}`);
        return (aStar === bStar) ? a.style.order - b.style.order : bStar - aStar;
    });
    children.forEach(child => svcHolder.appendChild(child));
}

const newElem = x => document.createElement(x);

/*starred service can be like pinned or sth so better reference otherwise take 2.5 trillion years to find */
const initPage = () => {
    const mainContainer = document.querySelector("#bus-timings");
    for (let stop of stops) {
        const stopDiv = document.createElement("div");
        stopDiv.dataset.stopId = stop.code;
        stopDiv.classList.add("stop-container");

        const stopHeader = document.createElement("h2");

        const starBtn = newElem("button");
        starBtn.classList.add("star-toggle");
        starBtn.innerHTML = "☆";
        starBtn.title = "Click to star this stop";
        starBtn.onclick = () => toggleStar(stop.code, starBtn);

        const stopCodeHolder = newElem("span");
        stopCodeHolder.textContent = stop.code;
        stopCodeHolder.classList.add("nobold");

        const stopNameHolder = newElem("span");
        stopNameHolder.textContent = stop.name;

        const stopMetaHolder = newElem("span");
        stopMetaHolder.textContent = `${stop.road} - ${stop.shortName}`;
        stopMetaHolder.classList.add("small", "nobold");

        stopHeader.append(
            starBtn,
            " ",
            stopCodeHolder,
            " ",
            stopNameHolder,
            newElem("br"),
            stopMetaHolder
        );

        const svcHolder = newElem("div");
        svcHolder.classList.add("service-holder");
        const tempLoading = newElem("span");
        tempLoading.classList.add("italic", "temp-loading");
        tempLoading.textContent = "Loading...";
        svcHolder.append(tempLoading);

        stopDiv.append(stopHeader, svcHolder);
        mainContainer.append(stopDiv);
    }
}

let starredStops = new Set(JSON.parse(localStorage.getItem("starred-stops") || "[]"));

function toggleStar(code, btn) {
    if (starredStops.has(code)) {
        starredStops.delete(code);
    } else {
        starredStops.add(code);
    }
    localStorage.setItem("starred-stops", JSON.stringify([...starredStops]));
    btn.innerHTML = starredStops.has(code) ? "★" : "☆";
    reorderStops();
}

function reorderStops() {
    const container = document.querySelector("#bus-timings");
    const children = Array.from(container.querySelectorAll(".stop-container"));
    children.sort((a, b) => {
        const aStar = starredStops.has(+a.dataset.stopId);
        const bStar = starredStops.has(+b.dataset.stopId);
        return (aStar === bStar) ? 0 : aStar ? -1 : 1;
    });
    children.forEach(child => container.appendChild(child));
}

const loadData = async () => {
    if (!document.querySelector(".stop-container")) initPage();

    const setClass = (elem, cls) => {
        for (let clsName of ["seat", "stand", "no"]) elem.classList.toggle(clsName, clsName === cls);
    }

    const milToMins = (mils) => Math.floor(mils / 1000 / 60);

    for (let stop of stops) {
        const stopBox = document.querySelector(`[data-stop-id="${stop.code}"]`);
        const svcHolder = stopBox.querySelector(":scope .service-holder");

        const data = await getArrData(stop.code);

        if (!data || !stopBox) {
            alert("Something went wrong! Check your network connection.");
            return false;
        }

        svcHolder.querySelector(":scope .temp-loading")?.remove();

        for (let svc of data.services) {
            const svcNumberOnly = +svc.no.match(/^\d+/)[0];

            if (!svcHolder.querySelector(`:scope [data-service="${svc.no}"]`)) {
                const svcCont = document.createElement("div");
                svcCont.classList.add("service-container");
                svcCont.dataset.service = svc.no;
                svcCont.style.order = svcNumberOnly * 27 + alphabet.indexOf(svc.no.slice(svcNumberOnly.length)) + 1;

                const svcId = document.createElement("span");
                svcId.classList.add("service-id");

                const serviceKey = `${stop.code}-${svc.no}`;
                const starBtn = newElem("button");
                starBtn.classList.add("star-toggle");
                starBtn.title = "Star this bus service";
                starBtn.textContent = starredServices.has(serviceKey) ? "★" : "☆";
                starBtn.onclick = () => toggleServiceStar(svc.no, stop.code, starBtn);

                const busLabel = document.createElement("span");
                busLabel.textContent = svc.no;

                svcId.append(starBtn, busLabel);
                svcCont.append(svcId);

                for (let i = 1; i <= 3; i++) {
                    const timeBox = document.createElement("span");
                    timeBox.classList.add("time-indicator");
                    timeBox.textContent = "N/A";
                    timeBox.dataset.busCount = ["next", "next2", "next3"][i - 1];
                    svcCont.append(timeBox);
                }

                svcHolder.append(svcCont);
            }

            const svcCont = svcHolder.querySelector(`:scope [data-service="${svc.no}"]`);

            for (let key of ["next", "next2", "next3"]) {
                const indicator = svcCont.querySelector(`:scope [data-bus-count=${key}]`);
                if (!svc[key]?.time) {
                    setClass(indicator, "");
                    continue;
                }

                const comingTime = new Date(svc[key].time);
                const offset = milToMins(Math.max(comingTime - new Date(), 0));

                indicator.textContent = offset === 0 ? "Arr" : `${offset} min`;
                indicator.classList.toggle("unmonitored-schedule", !!svc[key].monitored);
                setClass(indicator, { "SEA": "seat", "SDA": "stand", "LSD": "no" }[svc[key].load]);
            }
        }

        reorderServices(stop.code);
    }

    document.querySelector("#last-update").textContent = "Last updated " + dateToTime(new Date());
}

initPage();
loadData();
setInterval(loadData, 10000);

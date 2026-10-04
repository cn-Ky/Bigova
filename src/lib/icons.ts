import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBed, faBell, faBullseye, faBus, faCalendarDays, faChartSimple, faChessRook, faCloudBolt, faCloudRain, faCookieBite, faFaceSmile,
  faFerry, faFileLines, faFilePen, faGamepad, faGlassWater, faHandshake, faHorse, faLandmark, faMapLocationDot, faMedal, faMoon,
  faNewspaper, faPhone, faPiggyBank, faSmog, faSnowflake, faStar, faStopwatch, faSun, faTemperatureHigh, faTemperatureLow, faTree,
  faUmbrella, faUmbrellaBeach, faUserPlus, faUtensils, faWind, faBriefcase, faBook, faCheese, faShirt,
} from "@fortawesome/free-solid-svg-icons";
import type { AdviceIcon } from "./weatherData";
import type { TipIcon } from "./bigaInfo";

/** Hava önerileri (weatherData.ts) için ikon eşlemesi. */
export const ADVICE_ICON: Record<AdviceIcon, IconDefinition> = {
  storm: faCloudBolt, snow: faSnowflake, fog: faSmog, umbrella: faUmbrella, wind: faWind, cold: faTemperatureLow, cool: faShirt,
  hot: faTemperatureHigh, uv: faSun, park: faTree, stars: faStar, rain: faCloudRain, calm: faFaceSmile,
};

/** Öğrenci rehberi ipuçları (bigaInfo.ts) için ikon eşlemesi. */
export const TIP_ICON: Record<TipIcon, IconDefinition> = {
  calendar: faCalendarDays, notes: faFilePen, books: faBook, timer: faStopwatch, bell: faBell, food: faUtensils, budget: faPiggyBank,
  cheese: faCheese, snack: faCookieBite, handshake: faHandshake, bus: faBus, map: faMapLocationDot, ferry: faFerry, wind: faWind,
  night: faMoon, horse: faHorse, castle: faChessRook, museum: faLandmark, medal: faMedal, sunset: faUmbrellaBeach, friends: faUserPlus,
  poll: faChartSimple, magazine: faNewspaper, game: faGamepad, club: faBullseye, job: faBriefcase, cv: faFileLines, water: faGlassWater,
  sleep: faBed, emergency: faPhone,
};

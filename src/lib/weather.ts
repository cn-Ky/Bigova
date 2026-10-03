import { faSun, faMoon, faCloud, faCloudSun, faCloudMoon, faCloudRain, faSnowflake, faCloudBolt, faSmog } from "@fortawesome/free-solid-svg-icons";
import type { Kind } from "./weatherData";
// Saf veri/mantık weatherData.ts içindedir; bu dosya yalnızca ikon eşlemesini ekler.
export { KINDS, kindOf, label } from "./weatherData";
export type { Kind } from "./weatherData";
export const iconOf = (k: Kind, day: boolean) => ({ clear: day ? faSun : faMoon, partly: day ? faCloudSun : faCloudMoon, cloudy: faCloud, fog: faSmog, rain: faCloudRain, snow: faSnowflake, storm: faCloudBolt })[k];

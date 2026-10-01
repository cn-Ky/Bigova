import { faSun, faMoon, faCloud, faCloudSun, faCloudMoon, faCloudRain, faSnowflake, faCloudBolt, faSmog } from "@fortawesome/free-solid-svg-icons";
export type Kind = "clear" | "partly" | "cloudy" | "fog" | "rain" | "snow" | "storm";
export const KINDS: Kind[] = ["clear", "partly", "cloudy", "fog", "rain", "snow", "storm"];
/** WMO hava kodu -> görsel tür */
export function kindOf(code: number): Kind {
  if (code >= 95) return "storm";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code === 45 || code === 48) return "fog";
  if (code === 3) return "cloudy";
  if (code === 1 || code === 2) return "partly";
  return "clear";
}
export const label = (k: Kind, day: boolean) => ({ clear: day ? "Güneşli" : "Açık", partly: "Parçalı bulutlu", cloudy: "Bulutlu", fog: "Sisli", rain: "Yağmurlu", snow: "Karlı", storm: "Gök gürültülü" }[k]);
export const iconOf = (k: Kind, day: boolean) => ({ clear: day ? faSun : faMoon, partly: day ? faCloudSun : faCloudMoon, cloudy: faCloud, fog: faSmog, rain: faCloudRain, snow: faSnowflake, storm: faCloudBolt }[k]);

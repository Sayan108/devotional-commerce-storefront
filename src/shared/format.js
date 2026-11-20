const formats = {
  en: {
    money: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    dates: new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" }),
    times: new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
    count: new Intl.NumberFormat("en-IN")
  },
  bn: {
    money: new Intl.NumberFormat("bn-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    dates: new Intl.DateTimeFormat("bn-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" }),
    times: new Intl.DateTimeFormat("bn-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
    count: new Intl.NumberFormat("bn-IN")
  }
};
let active = formats.en;
export function setLocale(lang) { active = formats[lang] || formats.en; }
export const money = value => active.money.format((value ?? 0) / 100);
export const dateLabel = value => active.dates.format(new Date(value));
export const timeLabel = value => active.times.format(new Date(value)) + " IST";
export const numeral = value => active.count.format(value);
export const artwork = name => "/artwork/" + name + ".jpg";
export const plural = (count, word = "item") => count + " " + word + (count === 1 ? "" : "s");

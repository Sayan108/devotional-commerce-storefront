const currency = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2
});
const dates = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short"
});
const times = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit"
});
export const money = value => currency.format((value ?? 0) / 100);
export const dateLabel = value => dates.format(new Date(value));
export const timeLabel = value => times.format(new Date(value)) + " IST";
export const artwork = name => "/artwork/" + name + ".jpg";
export const plural = (count, word = "item") => count + " " + word + (count === 1 ? "" : "s");

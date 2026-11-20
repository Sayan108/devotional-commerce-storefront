const motes = [
  ["a", "58%", "62%"],
  ["b", "72%", "48%"],
  ["c", "64%", "70%"],
  ["d", "81%", "58%"],
  ["e", "49%", "54%"],
  ["f", "68%", "40%"]
];

export function HeroMotion() {
  return <div className="hero-motion" aria-hidden="true">
    <span className="light-shaft"/>
    <span className="lamp-glow"/>
    {motes.map(([name, left, top]) => <span key={name} className={"ember " + name} style={{ left, top }}/>)}
  </div>;
}

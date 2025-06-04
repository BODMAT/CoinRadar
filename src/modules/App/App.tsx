import { useApplyTheme } from "../../hooks/useApplyTheme";
import { Background } from "../Background/RotatingArrows";
import { FixedFooter } from "../FixedFooter/FixedFooter";
import { FixedHeader } from "../FixedHeader/FixedHeader";

export function App() {
  useApplyTheme();
  return (
    <div className="relative">
      <div className="fontText relative transitioned flex flex-col justify-between">
        <FixedHeader />
        <main className="myContainer pt-[80px] text-[var(--color-text)] transitioned">
          <section id="section1">
            {Array(1000).fill("AAAA ").join("")}
          </section>
          <section id="section2">
            {Array(1000).fill("Lorem ").join("")}
          </section>
          <section id="section3">
            {Array(1000).fill("BBBB ").join("")}
          </section>
        </main>
        <FixedFooter />
      </div>

      <Background />
    </div>
  );
}

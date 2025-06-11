import { useApplyTheme } from "../../hooks/useApplyTheme";
import { PopUp } from "../../portals/PopUp.portal";
import { ScrollableBackground } from "../ScrollableBackground/RotatingArrows";
import { FixedFooter } from "../FixedFooter/FixedFooter";
import { FixedHeader } from "../FixedHeader/FixedHeader";
import { HomePage } from "../HomePage/HomePage";
import { AllCrypto } from "../AllCrypto/AllCrypto";
import { Wallet } from "../Wallet/Wallet";

export function App() {
  useApplyTheme();
  return (
    <div className="relative">
      <div className="fontText relative transitioned flex flex-col justify-between max-w-full overflow-hidden">
        <FixedHeader />
        <main className="myContainer text-[var(--color-text)] transitioned">
          <section id="section1">
            <HomePage />
          </section>
          <section id="section2">
            <AllCrypto />
          </section>
          <section id="section3">
            <Wallet />
          </section>
        </main>
        <FixedFooter />
      </div>

      {/* All PopUps in one portal */}
      <PopUp />

      <ScrollableBackground />
    </div>
  );
}

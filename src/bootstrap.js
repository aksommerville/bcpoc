import { Injector } from "./js/Injector.js";
import { Coordinator } from "./js/Coordinator.js";

window.addEventListener("load", () => {
  const injector = new Injector(window, document);
  const coordinator = injector.get(Coordinator);
  coordinator.start();
  document.querySelector("canvas#mainview").addEventListener("click", () => {
    if (coordinator.running) coordinator.stop();
    else coordinator.start();
  });
});

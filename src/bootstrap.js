import { Injector } from "./js/Injector.js";
import { Coordinator } from "./js/Coordinator.js";
import { MinigameFactory } from "./js/MinigameFactory.js";

window.addEventListener("load", () => {
  const injector = new Injector(window, document);
  const coordinator = injector.get(Coordinator);
  coordinator.start();
  document.querySelector("canvas#mainview").addEventListener("click", () => {
    if (coordinator.running) coordinator.stop();
    else coordinator.start();
  });
  
  // Force encounter form.
  const form = document.querySelector("#forceEncounter");
  if (form) {
    const select = form.querySelector("select[name='minigameId']");
    select.innerHTML = "";
    for (let i=0; i<MinigameFactory.implementations.length; i++) {
      const mg = MinigameFactory.implementations[i];
      const option = document.createElement("OPTION");
      option.value = i + 1;
      option.innerText = mg.name;
      select.appendChild(option);
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const mgid = +select.value;
      const difficulty = +document.querySelector("input[name='difficulty']").value;
      coordinator.game.beginEncounter(mgid, difficulty);
    });
  }
});

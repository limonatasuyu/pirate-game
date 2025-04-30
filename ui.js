import crosshair from "./assets/cross-hair.js";

export class UI {
  constructor() {
    this.addCrosshair();
  }
  
  addCrosshair() {
    // Create a div for the crosshair
    const crosshairContainer = document.createElement("div");
    crosshairContainer.style.position = "absolute";
    crosshairContainer.style.top = "50%";
    crosshairContainer.style.left = "50%";
    crosshairContainer.style.transform = "translate(-50%, -50%)";
    crosshairContainer.style.pointerEvents = "none";
    
    // Create the image element
    const crosshairImage = document.createElement("div");
    crosshairImage.innerHTML = crosshair;
    crosshairImage.style.width = "32px";
    crosshairImage.style.height = "32px";
    crosshairImage.id = "crosshair-img";
    crosshairImage.style.color = "black";
    
    // Add the image to the container
    crosshairContainer.appendChild(crosshairImage);
    
    // Add the container to the document body
    document.body.appendChild(crosshairContainer);
    
    // Store reference to the crosshair
    this.crosshair = crosshairContainer;
  }
  
  updateCrosshair(isTargeting) {
    const crosshairImg = document.querySelector("#crosshair-img");
    if (!crosshairImg) return;
    
    if (isTargeting) {
      crosshairImg.style.scale = "1.2";
      crosshairImg.style.color = "red";
    } else {
      crosshairImg.style.scale = "1";
      crosshairImg.style.color = "black";
    }
  }
}
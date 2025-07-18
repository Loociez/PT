export class SpriteAnimator {
  constructor(canvasId, frameListId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.frameList = document.getElementById(frameListId);
    this.frames = [];
    this.currentFrame = 0;
    this.isPlaying = false;
    this.playbackInterval = null;
    this.frameDuration = 200; // ms per frame (default 5 FPS)
    this.selectedIndex = -1;

    this.backgroundColor = "#ffffff"; // default white background
    this.showGrid = false;

    this.frameList.addEventListener("click", (e) => {
      if (e.target.tagName === "LI") {
        this.selectFrame(parseInt(e.target.dataset.index));
      }
    });

    // Setup background color picker
    this.setupBackgroundColorPicker();

    // Setup grid toggle button
    this.setupGridToggle();

    // Setup canvas click for hex color
    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);
      const pixel = this.ctx.getImageData(x, y, 1, 1).data;
      const hex = "#" + [...pixel].slice(0, 3).map(c => c.toString(16).padStart(2, "0")).join("");
      document.getElementById("hexColorDisplay").textContent = hex.toUpperCase();
    });
  }

  setupBackgroundColorPicker() {
    const colorInput = document.getElementById("backgroundColorPicker");
    if (!colorInput) return;

    colorInput.value = this.backgroundColor;

    colorInput.addEventListener("input", (e) => {
      this.backgroundColor = e.target.value;
      this.drawFrame(this.selectedIndex);
    });
  }

  setupGridToggle() {
    const gridToggleBtn = document.getElementById("toggleGridBtn");
    if (!gridToggleBtn) return;

    gridToggleBtn.addEventListener("click", () => {
      this.showGrid = !this.showGrid;
      gridToggleBtn.textContent = this.showGrid ? "Hide Grid" : "Show Grid";
      this.drawFrame(this.selectedIndex);
    });

    gridToggleBtn.textContent = "Show Grid";
  }

  startPlaybackInterval() {
    if (this.playbackInterval) clearInterval(this.playbackInterval);

    this.playbackInterval = setInterval(() => {
      if (this.frames.length === 0) return;
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      this.drawFrame(this.currentFrame);
      this.selectFrame(this.currentFrame);
    }, this.frameDuration);
  }

  setFPS(fps) {
    fps = Math.min(Math.max(fps, 1), 60);
    this.frameDuration = 1000 / fps;
    console.log(`FPS set to ${fps}, frameDuration: ${this.frameDuration}ms`);

    if (this.isPlaying) {
      this.startPlaybackInterval();
    }
  }

  addFramesFromFiles(files) {
    const isSpriteSheet = document.getElementById("spriteSheetCheckbox")?.checked;

    for (const file of files) {
      if (!file.type.startsWith('image/png')) {
        alert("Only PNG files allowed.");
        continue;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let newFrames;
          if (isSpriteSheet) {
            newFrames = this.sliceSpriteSheet(img, 32, 32);
          } else {
            newFrames = [this.createSingleFrame(img, 32, 32)];
          }

          this.frames.push(...newFrames);
          this.updateFrameList();

          if (this.frames.length === newFrames.length) {
            this.drawFrame(0);
            this.selectFrame(0);
          }
          this.dispatchFramesUpdated();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  createSingleFrame(img, frameWidth, frameHeight) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = frameWidth;
    tempCanvas.height = frameHeight;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.clearRect(0, 0, frameWidth, frameHeight);
    tempCtx.imageSmoothingEnabled = false;
    tempCtx.drawImage(img, 0, 0, img.width, img.height, 0, 0, frameWidth, frameHeight);
    return tempCanvas;
  }

  sliceSpriteSheet(img, frameWidth, frameHeight) {
    const cols = Math.floor(img.width / frameWidth);
    const rows = Math.floor(img.height / frameHeight);
    const frames = [];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = frameWidth;
        tempCanvas.height = frameHeight;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.clearRect(0, 0, frameWidth, frameHeight);
        tempCtx.drawImage(
          img,
          x * frameWidth, y * frameHeight, frameWidth, frameHeight,
          0, 0, frameWidth, frameHeight
        );
        frames.push(tempCanvas);
      }
    }
    return frames;
  }

  drawGrid() {
    if (!this.showGrid) return;

    const { width, height } = this.canvas;
    const gridSize = 1;

    this.ctx.strokeStyle = "rgba(0,0,0,0.1)";
    this.ctx.lineWidth = 0.5;

    for (let x = 0; x <= width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + 0.5, 0);
      this.ctx.lineTo(x + 0.5, height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y + 0.5);
      this.ctx.lineTo(width, y + 0.5);
      this.ctx.stroke();
    }
  }

  drawFrame(index) {
    if (index < 0 || index >= this.frames.length) {
      this.ctx.fillStyle = this.backgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    const frameCanvas = this.frames[index];
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(frameCanvas, 0, 0, this.canvas.width, this.canvas.height);

    this.drawGrid();
  }

  play() {
    if (this.isPlaying || this.frames.length === 0) return;
    this.isPlaying = true;
    this.startPlaybackInterval();

    const btn = document.getElementById("playPauseBtn");
    if (btn) btn.textContent = "Pause";
  }

  pause() {
    this.isPlaying = false;
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
    const btn = document.getElementById("playPauseBtn");
    if (btn) btn.textContent = "Play";
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  updateFrameList() {
    this.frameList.innerHTML = "";
    this.frames.forEach((frame, i) => {
      const li = document.createElement("li");
      li.textContent = `Frame ${i + 1}`;
      li.dataset.index = i;
      if (i === this.selectedIndex) li.classList.add("selected");
      this.frameList.appendChild(li);
    });
    document.getElementById("removeFrameBtn").disabled = this.selectedIndex === -1;
    this.dispatchFramesUpdated();
  }

  selectFrame(index) {
    if (index < 0 || index >= this.frames.length) return;
    this.selectedIndex = index;
    this.drawFrame(index);
    [...this.frameList.children].forEach((li, i) => {
      li.classList.toggle("selected", i === index);
    });
    document.getElementById("removeFrameBtn").disabled = false;
  }

  removeSelectedFrame() {
    if (this.selectedIndex === -1) return;

    this.frames.splice(this.selectedIndex, 1);

    if (this.frames.length === 0) {
      this.selectedIndex = -1;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      this.selectedIndex = Math.min(this.selectedIndex, this.frames.length - 1);
      this.drawFrame(this.selectedIndex);
    }

    this.updateFrameList();
  }

  exportSpriteSheet() {
    if (this.frames.length === 0) return;
    const frameWidth = this.frames[0].width;
    const frameHeight = this.frames[0].height;
    const cols = this.frames.length;
    const rows = 1;

    const sheetCanvas = document.createElement("canvas");
    sheetCanvas.width = frameWidth * cols;
    sheetCanvas.height = frameHeight * rows;
    const sheetCtx = sheetCanvas.getContext("2d");

    for (let i = 0; i < this.frames.length; i++) {
      sheetCtx.drawImage(this.frames[i], i * frameWidth, 0);
    }

    sheetCanvas.toBlob((blob) => {
      if (!blob) {
        alert("Error exporting sprite sheet.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sprite_sheet.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  exportFramesIndividually() {
    if (this.frames.length === 0) return;

    if (typeof JSZip === "undefined") {
      alert("JSZip library is required for exporting frames individually.");
      return;
    }

    const zip = new JSZip();

    this.frames.forEach((frameCanvas, index) => {
      const dataURL = frameCanvas.toDataURL("image/png");
      const base64Data = dataURL.split(',')[1];
      const binaryData = atob(base64Data);
      const arrayBuffer = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        arrayBuffer[i] = binaryData.charCodeAt(i);
      }
      zip.file(`frame_${index + 1}.png`, arrayBuffer);
    });

    zip.generateAsync({ type: "blob" }).then((content) => {
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "frames.zip";
      a.click();
      URL.revokeObjectURL(url);
    }).catch((err) => {
      alert("Error generating ZIP file: " + err.message);
    });
  }

  rotateSelectedFrame90() {
    if (this.selectedIndex === -1) return;
    const oldCanvas = this.frames[this.selectedIndex];
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = oldCanvas.height;
    tempCanvas.height = oldCanvas.width;
    const tempCtx = tempCanvas.getContext("2d");

    tempCtx.save();
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate(Math.PI / 2);
    tempCtx.drawImage(oldCanvas, -oldCanvas.width / 2, -oldCanvas.height / 2);
    tempCtx.restore();

    this.frames[this.selectedIndex] = tempCanvas;
    this.drawFrame(this.selectedIndex);
  }

  dispatchFramesUpdated() {
    const event = new CustomEvent('framesUpdated', { detail: { count: this.frames.length } });
    document.dispatchEvent(event);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const animator = new SpriteAnimator("spriteCanvas", "frameList");

  document.getElementById("upload")?.addEventListener("change", (e) => {
    animator.addFramesFromFiles(e.target.files);
    e.target.value = null;
  });

  document.getElementById("playPauseBtn")?.addEventListener("click", () => animator.togglePlayPause());
  document.getElementById("removeFrameBtn")?.addEventListener("click", () => animator.removeSelectedFrame());
  document.getElementById("exportSheetBtn")?.addEventListener("click", () => animator.exportSpriteSheet());
  document.getElementById("exportFramesZipBtn")?.addEventListener("click", () => animator.exportFramesIndividually());
  document.getElementById("rotateBtn")?.addEventListener("click", () => animator.rotateSelectedFrame90());

  const fpsInput = document.getElementById("fpsInput");
  if (fpsInput) {
    fpsInput.addEventListener("change", (e) => {
      const fps = parseInt(e.target.value);
      animator.setFPS(fps);
    });
  }
});
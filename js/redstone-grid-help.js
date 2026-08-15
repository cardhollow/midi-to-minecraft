function openMcpackHelpModal() {
  const existing = document.getElementById("mcpackHelpModal");

  if (existing) {
    existing.classList.add("visible");
    return;
  }

  const modal = document.createElement("div");
  modal.id = "mcpackHelpModal";

  modal.innerHTML = `
      <div class="mcpack-help-box">
        <div class="mcpack-help-header">
          <div class="mcpack-help-title">Help</div>
          <button type="button" class="mcpack-help-close" id="mcpackHelpClose">×</button>
        </div>

        <div class="mcpack-help-content">
          <div class="mcpack-help-section">
            <div class="mcpack-help-heading">How to use</div>
            <div class="mcpack-help-text">1. Import your <b>.mid</b> or MIDI file.</div>
            <div class="mcpack-help-text">2. Select the instrument you want to use.</div>
            <div class="mcpack-help-text">3. Press <b>Play</b> to preview the music.</div>
            <div class="mcpack-help-text">4. Check the generated Redstone Grid.</div>
            <div class="mcpack-help-text">5. When everything is ready, press <b>Export MCPACK</b>.</div>
          </div>

          <div class="mcpack-help-section">
            <div class="mcpack-help-heading">Choose MIDI files with shorter notes</div>
            <div class="mcpack-help-text">
              Using instruments with shorter notes, such as <b>Music Box</b>, can work much better because Minecraft note blocks cannot handle long-span notes in the same way that some MIDI instruments can.
            </div>
            <div class="mcpack-help-text">
              For example, a piano or another instrument that plays notes for a long time may not work as well with the generated Minecraft music.
            </div>
            <div class="mcpack-help-text">
              Try finding MIDI files that have shorter, more separated notes for better results.
            </div>
            <div class="mcpack-help-text">
              You can also try and use https://musicboxmaniacs.com/
              It can convert your MIDI into better one's espeacilly that this software can't handle paino MIDI that well!
            </div>
            <div class="mcpack-help-text">
              Instruments such as <b>Music Box</b>, <b>Marimba</b>, <b>Xylophone</b>, and <b>Glockenspiel</b> are good examples to try.
            </div>
          </div>

          <div class="mcpack-help-section">
            <div class="mcpack-help-heading">Long songs and many notes</div>
            <div class="mcpack-help-text">
              The problem is not only the file size. Long songs or songs with many notes can make the website's built-in player lag while playing.
            </div>
            <div class="mcpack-help-text">
              This happens because the player has to process many notes and Redstone events while the music is playing.
            </div>
            <div class="mcpack-help-text">
              If a song becomes slow or laggy during playback, it is better to export it and play the generated music in Minecraft instead.
            </div>
            <div class="mcpack-help-text">
              Shorter songs with fewer notes are generally easier for the website's built-in player to preview.
            </div>
          </div>

          <div class="mcpack-help-section">
            <div class="mcpack-help-heading">Exporting to Minecraft</div>
            <div class="mcpack-help-text">
              After importing your MIDI and checking the generated music, press <b>Export MCPACK</b>.
            </div>
            <div class="mcpack-help-text">
              Choose a name for your behavior pack and press <b>Export</b>.
            </div>
            <div class="mcpack-help-text">
              Wait for the export to finish and open the downloaded <b>.mcpack</b> file with Minecraft.
            </div>
          </div>

          <div class="mcpack-help-section">
            <div class="mcpack-help-heading">Using the MCPACK in Minecraft</div>
            <div class="mcpack-help-text">1. Open the downloaded <b>.mcpack</b> file.</div>
            <div class="mcpack-help-text">2. Minecraft will import the behavior pack.</div>
            <div class="mcpack-help-text">3. Create a new world or edit an existing world.</div>
            <div class="mcpack-help-text">4. Open the world's <b>Behavior Packs</b> section.</div>
            <div class="mcpack-help-text">5. Find the imported Redstone Grid behavior pack.</div>
            <div class="mcpack-help-text">6. Activate the behavior pack for your world.</div>
            <div class="mcpack-help-text">7. Enter the world and open the chat.</div>
            <div class="mcpack-help-text">8. Run:</div>
            <div class="mcpack-help-code">/function ${getBuildCommand()}</div>
            <div class="mcpack-help-text">
              The generated Redstone music structure will then be built in your Minecraft world.
            </div>
          </div>

          <div class="mcpack-help-section">
            <div class="mcpack-help-heading">If the website player is lagging</div>
            <div class="mcpack-help-text">
              Try using a shorter song or a MIDI with fewer notes.
            </div>
            <div class="mcpack-help-text">
              Also try using MIDI files with shorter notes, especially when using instruments such as piano that can contain long-span notes.
            </div>
            <div class="mcpack-help-text">
              If the song is still laggy, export the MCPACK and use it in Minecraft instead of relying on the website's built-in player.
            </div>
          </div>

          <div class="mcpack-help-section">
            <div class="mcpack-help-heading">Best results</div>
            <div class="mcpack-help-text">
              For better results, try MIDI files with <b>shorter notes</b>, <b>fewer long-span notes</b>, and a reasonable song length.
            </div>
            <div class="mcpack-help-text">
              Music with short and clearly separated notes is generally easier to reproduce using Minecraft note blocks.
            </div>
          </div>
        </div>

        <div class="mcpack-help-footer">
          <button type="button" class="mcpack-help-ok" id="mcpackHelpOk">Got it</button>
        </div>
      </div>
    `;

  const style = document.createElement("style");
  style.textContent = `
      #mcpackHelpModal {
        position: fixed;
        inset: 0;
        z-index: 1000000;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 16px;
        box-sizing: border-box;
        background: rgba(0, 0, 0, 0.78);
        font-family: Arial, Helvetica, sans-serif;
      }

      #mcpackHelpModal.visible { display: flex; }

      .mcpack-help-box {
        width: min(480px, 100%);
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 14px;
        background: #181818;
        color: #ffffff;
        box-shadow: 0 20px 70px rgba(0, 0, 0, 0.65);
      }

      .mcpack-help-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px;
        border-bottom: 1px solid #333333;
        flex-shrink: 0;
      }

      .mcpack-help-title { font-size: 19px; font-weight: 700; }

      .mcpack-help-close {
        width: 36px;
        height: 36px;
        padding: 0;
        border: 0;
        border-radius: 8px;
        background: #292929;
        color: #ffffff;
        font-size: 25px;
        line-height: 36px;
        cursor: pointer;
      }

      .mcpack-help-content { overflow-y: auto; padding: 16px; }

      .mcpack-help-section {
        margin-bottom: 16px;
        padding: 14px;
        border-radius: 10px;
        background: #222222;
      }

      .mcpack-help-section:last-child { margin-bottom: 0; }

      .mcpack-help-heading { margin-bottom: 9px; font-size: 14px; font-weight: 700; }

      .mcpack-help-text {
        margin-top: 8px;
        color: #c7c7c7;
        font-size: 13px;
        line-height: 1.55;
      }

      .mcpack-help-code {
        margin-top: 9px;
        padding: 11px;
        overflow-x: auto;
        border-radius: 7px;
        background: #101010;
        color: #dddddd;
        font-family: monospace;
        font-size: 12px;
        line-height: 1.55;
        white-space: nowrap;
      }

      .mcpack-help-footer {
        padding: 12px 16px 16px;
        border-top: 1px solid #333333;
        flex-shrink: 0;
      }

      .mcpack-help-ok {
        width: 100%;
        min-height: 42px;
        border: 0;
        border-radius: 8px;
        background: #ffffff;
        color: #000000;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .mcpack-help-ok:active,
      .mcpack-help-close:active { transform: scale(0.98); }
    `;

  document.head.appendChild(style);
  document.body.appendChild(modal);

  const closeButton = modal.querySelector("#mcpackHelpClose");
  const okButton = modal.querySelector("#mcpackHelpOk");

  function closeHelp() {
    modal.classList.remove("visible");
  }

  closeButton.addEventListener("click", closeHelp);
  okButton.addEventListener("click", closeHelp);

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      closeHelp();
    }
  });

  modal.classList.add("visible");
}

function createMcpackHelpButton() {
  if (document.getElementById("mcpackHelpButton")) {
    return;
  }

  const button = document.createElement("button");
  button.id = "mcpackHelpButton";
  button.className = "tab";
  button.textContent = "HELP";
  button.title = "Help";
  button.addEventListener("click", openMcpackHelpModal);

  const tabBar = document.querySelector(".tab-bar");

  if (tabBar) {
    tabBar.appendChild(button);
  } else {
    document.body.appendChild(button);
  }
}

createMcpackHelpButton();
window.openMcpackHelpModal = openMcpackHelpModal;

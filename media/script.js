(function () {
  const msgerForm = get(".msger-inputarea");
  const msgerInput = get(".msger-input");
  const msgerChat = get(".msger-chat");
  const vscode = acquireVsCodeApi();

  const BOT_MSGS = [
    "Hi, how are you?",
    "Ohh... I can't understand what you trying to say. Sorry!",
    "I like to play games... But I don't know how to play!",
    "Sorry if my answers are not relevant. :))",
    "I feel sleepy! :("
  ];

  msgerForm.addEventListener("submit", event => {
    event.preventDefault();

    const msgText = msgerInput.value;
    if (!msgText) {
      return;
    }

    appendMessage(PERSON_NAME, PERSON_IMG, "right", msgText);
    msgerInput.value = "";

    botResponse();
  });

  function appendMessage(name, img, side, text) {
    //   Simple solution for small apps
    const msgHTML = `
    <div class="msg ${side}-msg">
      <div class="msg-img" style="background-image: url(${img})"></div>

      <div class="msg-bubble">
        <div class="msg-info">
          <div class="msg-info-name">${name}</div>
          <div class="msg-info-time">${formatDate(new Date())}</div>
        </div>

        <div class="msg-text">${text}</div>
      </div>
    </div>
  `;

    msgerChat.insertAdjacentHTML("beforeend", msgHTML);
    msgerChat.scrollTop += 500;
  }

  function botResponse() {
    const r = random(0, BOT_MSGS.length - 1);
    const msgText = BOT_MSGS[r];
    const delay = msgText.split(" ").length * 100;

    setTimeout(() => {
      appendMessage(BOT_NAME, BOT_IMG, "left", msgText);
    }, delay);
  }

  // Utils
  function get(selector, root = document) {
    return root.querySelector(selector);
  }

  function formatDate(date) {
    const h = "0" + date.getHours();
    const m = "0" + date.getMinutes();

    return `${h.slice(-2)}:${m.slice(-2)}`;
  }

  function random(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
  }

  // setInterval(() => {
  //   counter.textContent = `${currentCount++} `;

  //   // Update state
  //   vscode.setState({ count: currentCount });

  //   // Alert the extension when the cat introduces a bug
  //   if (Math.random() < Math.min(0.001 * currentCount, 0.05)) {
  //     // Send a message back to the extension
  //     vscode.postMessage({
  //       command: 'alert',
  //       text: '🐛  on line ' + currentCount
  //     });
  //   }
  // }, 100);

  // // Handle messages sent from the extension to the webview
  // window.addEventListener('message', event => {
  //   const message = event.data; // The json data that the extension sent
  //   switch (message.command) {
  //     case 'refactor':
  //       currentCount = Math.ceil(currentCount * 0.5);
  //       counter.textContent = `${currentCount}`;
  //       break;
  //   }
  // });
})();
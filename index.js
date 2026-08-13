const fs = require("fs");
const login = require("fca-unofficial");

const TARGET_THREAD_ID = "123456789012345";
const LOCKED_GC_NAME = "The Secure Zone 🔒";
const AUTO_REPLY_TEXT =
  "🤖 [Auto-Reply] Thanks for your message! Our team will get back to you shortly.";

const NICKNAMES_MAP = {
  "100011122233344": "Chief Executive",
  "100055566677788": "Lead Developer",
  "100099900011122": "Support Agent"
};

let appState;

try {
  appState = JSON.parse(fs.readFileSync("./appstate.json", "utf8"));
} catch (error) {
  console.error("❌ Could not load appstate.json");
  console.error(error.message);
  process.exit(1);
}

login({ appState }, (err, api) => {
  if (err) {
    console.error("❌ Login failed:", err);
    return;
  }

  console.log("✅ Logged in successfully!");
  console.log("🎯 Target Thread:", TARGET_THREAD_ID);

  api.setOptions({
    listenEvents: true,
    selfListen: false,
    autoMarkRead: true
  });

  api.listenMqtt((err, event) => {
    if (err) {
      console.error("❌ Listener error:", err);
      return;
    }

    if (event.threadID !== TARGET_THREAD_ID) return;

    if (event.type === "message" && event.body) {
      const message = event.body.trim();

      console.log(`💬 ${event.senderID}: ${message}`);

      if (message.toLowerCase() === "!setup") {
        api.sendMessage(
          "🔄 Configuring Group Chat settings...",
          event.threadID
        );

        setupGroupProperties(api, event.threadID);
        return;
      }

      if (message.startsWith("!")) return;

      api.sendMessage(
        AUTO_REPLY_TEXT,
        event.threadID,
        (sendErr) => {
          if (sendErr) {
            console.error("❌ Failed to send auto-reply:", sendErr);
          }
        }
      );
    }

    if (
      event.type === "event" &&
      event.logMessageType === "log:thread-name"
    ) {
      const newName =
        event.logMessageData && event.logMessageData.name;

      if (!newName) return;

      console.log(`📛 Group name changed to: "${newName}"`);

      if (newName !== LOCKED_GC_NAME) {
        console.log(`🔒 Restoring locked name: "${LOCKED_GC_NAME}"`);

        api.setTitle(
          LOCKED_GC_NAME,
          event.threadID,
          (titleErr) => {
            if (titleErr) {
              console.error(
                "❌ Failed to restore group name:",
                titleErr
              );
              return;
            }

            api.sendMessage(
              `⚠️ Group name is locked! Reverted back to "${LOCKED_GC_NAME}".`,
              event.threadID
            );
          }
        );
      }
    }
  });
});

function setupGroupProperties(api, threadID) {
  console.log("⚙️ Applying group settings...");

  api.setTitle(
    LOCKED_GC_NAME,
    threadID,
    (err) => {
      if (err) {
        console.error("❌ Error setting group title:", err);
      } else {
        console.log(`✅ Group title set to "${LOCKED_GC_NAME}"`);
      }
    }
  );

  for (const userID of Object.keys(NICKNAMES_MAP)) {
    const nickname = NICKNAMES_MAP[userID];

    api.changeNickname(
      nickname,
      threadID,
      userID,
      (err) => {
        if (err) {
          console.error(
            `❌ Failed to set nickname for ${userID}:`,
            err
          );
        } else {
          console.log(`✅ ${userID} → "${nickname}"`);
        }
      }
    );
  }
}
